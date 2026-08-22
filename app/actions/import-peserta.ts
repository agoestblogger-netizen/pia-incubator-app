'use server';

import JSZip from 'jszip';
import { db } from '@/lib/db';
import { timInovator, anggotaTim, dossierPiaArchive } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PreviewProposalItem {
  proposal_id: string;
  season: string;
  nama_proyek: string;
  nama_pengusul: string;
  email_pengusul: string;
  kategori_pia: string;
  skor_ai: string;
  vote_nominasi: string;
  tanggal_release: string;
  dossier_file: string;
  has_dossier_json: boolean;
  has_lampiran: boolean;
  lampiran_files: string[];
  is_duplicate: boolean;
  existing_tim_id?: string;
}

export interface PreviewResult {
  success: boolean;
  message?: string;
  items: PreviewProposalItem[];
  totalRows: number;
  duplicateCount: number;
}

export async function previewImportZip(formData: FormData): Promise<PreviewResult> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return { success: false, message: 'Akses ditolak. Anda tidak memiliki izin import.', items: [], totalRows: 0, duplicateCount: 0 };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, message: 'File ZIP belum dipilih.', items: [], totalRows: 0, duplicateCount: 0 };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Check ringkasan.csv
    const csvFile = zip.file('ringkasan.csv');
    if (!csvFile) {
      return { success: false, message: 'Format ZIP tidak valid: file "ringkasan.csv" tidak ditemukan di root ZIP.', items: [], totalRows: 0, duplicateCount: 0 };
    }

    const csvText = await csvFile.async('text');
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, message: 'File ringkasan.csv kosong atau hanya berisi header.', items: [], totalRows: 0, duplicateCount: 0 };
    }

    // Parse CSV line helper
    const parseCsvLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Header index mapping
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
    const propIdIdx = headers.indexOf('proposal_id');
    const seasonIdx = headers.indexOf('season');
    const namaProyekIdx = headers.indexOf('nama_proyek');
    const pengusulIdx = headers.indexOf('nama_pengusul');
    const emailIdx = headers.indexOf('email_pengusul');
    const kategoriIdx = headers.indexOf('kategori_pia');
    const skorAiIdx = headers.indexOf('skor_ai');
    const voteIdx = headers.indexOf('vote_nominasi');
    const tglReleaseIdx = headers.indexOf('tanggal_release');
    const dossierFileIdx = headers.indexOf('dossier_file');

    const previewItems: PreviewProposalItem[] = [];
    const proposalIds: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 3) continue;

      const propId = cols[propIdIdx] || cols[0];
      const dossierPath = cols[dossierFileIdx] || `dossier/${propId}.json`;
      const hasDossier = !!zip.file(dossierPath);

      // Check attachments in lampiran/{propId}/
      const lampiranPrefix = `lampiran/${propId}/`;
      const lampiranFiles: string[] = [];
      zip.forEach((relPath, zipEntry) => {
        if (!zipEntry.dir && relPath.startsWith(lampiranPrefix)) {
          lampiranFiles.push(pathBasename(relPath));
        }
      });

      proposalIds.push(propId);
      previewItems.push({
        proposal_id: propId,
        season: cols[seasonIdx] || 'Season 12 - 2026',
        nama_proyek: cols[namaProyekIdx] || cols[2] || 'Tanpa Judul',
        nama_pengusul: cols[pengusulIdx] || cols[3] || 'Anonim',
        email_pengusul: cols[emailIdx] || cols[4] || '',
        kategori_pia: cols[kategoriIdx] || cols[5] || 'PUSAT',
        skor_ai: cols[skorAiIdx] || cols[6] || '-',
        vote_nominasi: cols[voteIdx] || cols[7] || '0',
        tanggal_release: cols[tglReleaseIdx] || cols[8] || new Date().toISOString(),
        dossier_file: dossierPath,
        has_dossier_json: hasDossier,
        has_lampiran: lampiranFiles.length > 0,
        lampiran_files: lampiranFiles,
        is_duplicate: false,
      });
    }

    // Check duplicates against database
    const existingTeams = await db.select({
      id: timInovator.id,
      proposalIdAsli: timInovator.proposalIdAsli,
    }).from(timInovator).where(inArray(timInovator.proposalIdAsli, proposalIds));

    const existingMap = new Map(existingTeams.map(t => [t.proposalIdAsli, t.id]));

    let duplicateCount = 0;
    for (const item of previewItems) {
      if (existingMap.has(item.proposal_id)) {
        item.is_duplicate = true;
        item.existing_tim_id = existingMap.get(item.proposal_id);
        duplicateCount++;
      }
    }

    return {
      success: true,
      items: previewItems,
      totalRows: previewItems.length,
      duplicateCount,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal membaca file ZIP: ${err.message}`,
      items: [],
      totalRows: 0,
      duplicateCount: 0,
    };
  }
}

export async function confirmImportPeserta(
  formData: FormData,
  selectedProposalIds: string[],
  overrideProposalIds: string[]
): Promise<{ success: boolean; message: string; importedCount: number; skippedCount: number }> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return { success: false, message: 'Akses ditolak. Anda tidak memiliki izin import.', importedCount: 0, skippedCount: 0 };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, message: 'File ZIP belum dipilih.', importedCount: 0, skippedCount: 0 };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const supabaseAdmin = createAdminClient();

    // Ensure bucket 'dossier-lampiran' exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'dossier-lampiran');
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('dossier-lampiran', { public: true });
    }

    const selectedSet = new Set(selectedProposalIds);
    const overrideSet = new Set(overrideProposalIds);

    let importedCount = 0;
    let skippedCount = 0;

    for (const proposalId of selectedSet) {
      // 1. Read dossier JSON
      const dossierFile = zip.file(`dossier/${proposalId}.json`);
      let dossierData: any = null;
      if (dossierFile) {
        const text = await dossierFile.async('text');
        try {
          dossierData = JSON.parse(text);
        } catch {
          dossierData = null;
        }
      }

      // 2. Check existing team
      const [existingTeam] = await db.select().from(timInovator).where(eq(timInovator.proposalIdAsli, proposalId)).limit(1);

      if (existingTeam && !overrideSet.has(proposalId)) {
        skippedCount++;
        continue;
      }

      const namaProyek = dossierData?.data_submisi?.judul || `Inovasi ${proposalId}`;
      const kategoriPia = dossierData?.data_submisi?.kategori_pia || 'PUSAT';
      const klasifikasiInovasi = dossierData?.status_akhir?.peringkat_medali || 'Platinum';
      const seasonAsli = dossierData?.season || 'Season 12 - 2026';
      const pengusul = dossierData?.data_submisi?.pengusul || {};

      // 3. Upload attachments to Supabase Storage
      const lampiranUrls: Record<string, string> = {};
      const lampiranPrefix = `lampiran/${proposalId}/`;

      const uploadPromises: Promise<void>[] = [];
      zip.forEach((relPath, zipEntry) => {
        if (!zipEntry.dir && relPath.startsWith(lampiranPrefix)) {
          const fileName = pathBasename(relPath);
          const storagePath = `${proposalId}/${fileName}`;

          uploadPromises.push(
            (async () => {
              const fileData = await zipEntry.async('nodebuffer');
              const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
              await supabaseAdmin.storage.from('dossier-lampiran').upload(storagePath, fileData, {
                contentType,
                upsert: true,
              });

              const { data: publicUrlData } = supabaseAdmin.storage.from('dossier-lampiran').getPublicUrl(storagePath);
              if (publicUrlData?.publicUrl) {
                lampiranUrls[fileName] = publicUrlData.publicUrl;
              }
            })()
          );
        }
      });

      await Promise.all(uploadPromises);

      // Attach URLs to snapshot
      if (dossierData) {
        dossierData.lampiran_urls = lampiranUrls;
      } else {
        dossierData = {
          proposal_id: proposalId,
          season: seasonAsli,
          lampiran_urls: lampiranUrls,
        };
      }

      let teamId: string;

      if (existingTeam && overrideSet.has(proposalId)) {
        // Update existing team
        teamId = existingTeam.id;
        await db.update(timInovator).set({
          namaProyekInovasi: namaProyek,
          kategoriPia: kategoriPia,
          klasifikasiInovasi: klasifikasiInovasi,
          updatedAt: new Date(),
        }).where(eq(timInovator.id, teamId));

        // Upsert dossier archive
        await db.insert(dossierPiaArchive).values({
          timInovatorId: teamId,
          proposalIdAsli: proposalId,
          seasonAsli: seasonAsli,
          snapshotData: dossierData,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [dossierPiaArchive.timInovatorId],
          set: {
            snapshotData: dossierData,
            updatedAt: new Date(),
          }
        });
      } else {
        // Create new team
        const [newTeam] = await db.insert(timInovator).values({
          namaProyekInovasi: namaProyek,
          kategoriPia: kategoriPia,
          klasifikasiInovasi: klasifikasiInovasi,
          status: 'calon_peserta',
          durasiBulan: 3,
          proposalIdAsli: proposalId,
          seasonAsli: seasonAsli,
        }).returning();

        teamId = newTeam.id;

        // Create default Inisiator member
        await db.insert(anggotaTim).values({
          timInovatorId: teamId,
          nama: pengusul.nama || 'Inisiator Proyek',
          jabatan: pengusul.jabatan || 'Inisiator',
          unitKerja: pengusul.unit_kerja || 'PT Pegadaian',
          komitmenDukungan: 'Inisiator Inovasi',
        });

        // Insert dossier archive
        await db.insert(dossierPiaArchive).values({
          timInovatorId: teamId,
          proposalIdAsli: proposalId,
          seasonAsli: seasonAsli,
          snapshotData: dossierData,
        });
      }

      importedCount++;
    }

    return {
      success: true,
      message: `Proses import selesai: ${importedCount} tim calon peserta berhasil diproses, ${skippedCount} di-skip.`,
      importedCount,
      skippedCount,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memproses import: ${err.message}`,
      importedCount: 0,
      skippedCount: 0,
    };
  }
}

function pathBasename(fullPath: string) {
  const parts = fullPath.split('/');
  return parts[parts.length - 1];
}
