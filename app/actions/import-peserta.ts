'use server';

import JSZip from 'jszip';
import { db } from '@/lib/db';
import { timInovator, anggotaTim, dossierPiaArchive, auditLogs, roles, userRoleTim } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureUserAccount } from '@/app/actions/charter';

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

export interface SaveProposalPayload {
  proposalId: string;
  season: string;
  namaProyek: string;
  kategoriPia: string;
  klasifikasiInovasi: string;
  pengusul: {
    nama?: string;
    email?: string;
    jabatan?: string;
    unit_kerja?: string;
  };
  dossierData: any;
  lampiranUrls: Record<string, string>;
  override: boolean;
}

export interface CreatedAccountSummaryItem {
  nama: string;
  email: string;
  roleName: string;
  timNama: string;
}

function cleanText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPegadaianEmail(name: string): string {
  const parts = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return `${parts[0]}@pegadaian.co.id`;
  return `${parts[0]}.${parts[parts.length - 1]}@pegadaian.co.id`;
}

export async function saveImportedProposal(payload: SaveProposalPayload): Promise<{
  success: boolean;
  message?: string;
  teamId?: string;
  action: 'created' | 'updated' | 'skipped';
  createdAccounts: CreatedAccountSummaryItem[];
}> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return { success: false, message: 'Akses ditolak.', action: 'skipped', createdAccounts: [] };
  }

  const { proposalId, season, namaProyek, kategoriPia, klasifikasiInovasi, pengusul, dossierData, lampiranUrls, override } = payload;

  const [existingTeam] = await db.select().from(timInovator).where(eq(timInovator.proposalIdAsli, proposalId)).limit(1);

  if (existingTeam && !override) {
    return { success: true, message: 'Tim sudah ada (dilewati).', teamId: existingTeam.id, action: 'skipped', createdAccounts: [] };
  }

  const finalSnapshot = {
    ...(dossierData || {}),
    proposal_id: proposalId,
    season: season,
    lampiran_urls: lampiranUrls || {},
  };

  let teamId: string;
  let action: 'created' | 'updated' = 'created';

  if (existingTeam && override) {
    teamId = existingTeam.id;
    action = 'updated';
    await db.update(timInovator).set({
      namaProyekInovasi: namaProyek,
      kategoriPia: kategoriPia,
      klasifikasiInovasi: klasifikasiInovasi || 'Platinum',
      updatedAt: new Date(),
    }).where(eq(timInovator.id, teamId));

    await db.insert(dossierPiaArchive).values({
      timInovatorId: teamId,
      proposalIdAsli: proposalId,
      seasonAsli: season,
      snapshotData: finalSnapshot,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [dossierPiaArchive.timInovatorId],
      set: {
        snapshotData: finalSnapshot,
        updatedAt: new Date(),
      },
    });
  } else {
    const [newTeam] = await db.insert(timInovator).values({
      namaProyekInovasi: namaProyek,
      kategoriPia: kategoriPia,
      klasifikasiInovasi: klasifikasiInovasi || 'Platinum',
      status: 'calon_peserta',
      durasiBulan: 3,
      proposalIdAsli: proposalId,
      seasonAsli: season,
    }).returning();

    teamId = newTeam.id;

    await db.insert(dossierPiaArchive).values({
      timInovatorId: teamId,
      proposalIdAsli: proposalId,
      seasonAsli: season,
      snapshotData: finalSnapshot,
    });
  }

  // 4. Auto-create Inisiator & Co-creators Accounts
  const createdAccounts: CreatedAccountSummaryItem[] = [];

  const allRoles = await db.select().from(roles);
  const inisiatorRole = allRoles.find((r) => r.kodeRole === 'inisiator');
  const coCreatorRole = allRoles.find((r) => r.kodeRole === 'co_creator');

  const submisi = dossierData?.data_submisi || dossierData || {};

  // A. Pengusul -> Inisiator
  const pengusulNama = cleanText(submisi.pengusul?.nama || submisi.nama_pengusul || pengusul?.nama);
  const rawEmail = submisi.pengusul?.email || submisi.email_pengusul || pengusul?.email;
  const pengusulEmail = (rawEmail && rawEmail.includes('@')) ? rawEmail.trim().toLowerCase() : (pengusulNama ? formatPegadaianEmail(pengusulNama) : null);
  const pengusulJabatan = cleanText(submisi.pengusul?.jabatan || pengusul?.jabatan || 'Inisiator');
  const pengusulUnit = cleanText(submisi.pengusul?.unit_kerja || pengusul?.unit_kerja || 'PT Pegadaian');

  let inisiatorUserId: string | null = null;

  if (pengusulNama && pengusulEmail) {
    const userRes = await ensureUserAccount(pengusulNama, pengusulEmail);
    if (userRes) {
      inisiatorUserId = userRes.user.id;
      if (userRes.isNew) {
        createdAccounts.push({
          nama: pengusulNama,
          email: pengusulEmail,
          roleName: 'Inisiator',
          timNama: namaProyek,
        });
      }

      if (inisiatorRole) {
        await db
          .insert(userRoleTim)
          .values({
            userId: inisiatorUserId,
            roleId: inisiatorRole.id,
            timInovatorId: teamId,
          })
          .onConflictDoNothing();
      }
    }
  }

  // Upsert anggota_tim for Inisiator
  const [existingPengusulAnggota] = await db
    .select()
    .from(anggotaTim)
    .where(eq(anggotaTim.timInovatorId, teamId))
    .limit(1);

  if (existingPengusulAnggota) {
    await db
      .update(anggotaTim)
      .set({
        userId: inisiatorUserId,
        nama: pengusulNama || existingPengusulAnggota.nama,
        jabatan: pengusulJabatan,
        unitKerja: pengusulUnit,
        komitmenDukungan: 'Role: Inisiator',
        updatedAt: new Date(),
      })
      .where(eq(anggotaTim.id, existingPengusulAnggota.id));
  } else {
    await db.insert(anggotaTim).values({
      timInovatorId: teamId,
      userId: inisiatorUserId,
      nama: pengusulNama || 'Inisiator Proyek',
      jabatan: pengusulJabatan,
      unitKerja: pengusulUnit,
      komitmenDukungan: 'Role: Inisiator',
    });
  }

  // B. team_members -> Co-creators
  const rawMembers = submisi.team_members || dossierData?.team_members || submisi.anggota_tim || [];
  if (Array.isArray(rawMembers) && coCreatorRole) {
    for (const m of rawMembers) {
      let mNama = '';
      let mEmail = '';
      let mJabatan = 'Co-creator';
      let mUnit = 'PT Pegadaian';

      if (typeof m === 'string') {
        mNama = cleanText(m);
        mEmail = formatPegadaianEmail(mNama);
      } else if (typeof m === 'object' && m !== null) {
        mNama = cleanText(m.nama || m.name);
        mEmail = (m.email && m.email.includes('@')) ? m.email.trim().toLowerCase() : (mNama ? formatPegadaianEmail(mNama) : '');
        mJabatan = cleanText(m.jabatan || 'Co-creator');
        mUnit = cleanText(m.unit_kerja || m.unitKerja || 'PT Pegadaian');
      }

      if (mNama && mEmail) {
        const mUserRes = await ensureUserAccount(mNama, mEmail);
        if (mUserRes) {
          if (mUserRes.isNew) {
            createdAccounts.push({
              nama: mNama,
              email: mEmail,
              roleName: 'Co-creator',
              timNama: namaProyek,
            });
          }

          await db
            .insert(userRoleTim)
            .values({
              userId: mUserRes.user.id,
              roleId: coCreatorRole.id,
              timInovatorId: teamId,
            })
            .onConflictDoNothing();

          const [existingMemberAnggota] = await db
            .select()
            .from(anggotaTim)
            .where(
              and(
                eq(anggotaTim.timInovatorId, teamId),
                eq(anggotaTim.nama, mNama)
              )
            )
            .limit(1);

          if (existingMemberAnggota) {
            await db
              .update(anggotaTim)
              .set({
                userId: mUserRes.user.id,
                jabatan: mJabatan,
                unitKerja: mUnit,
                komitmenDukungan: 'Role: Co-creator',
                updatedAt: new Date(),
              })
              .where(eq(anggotaTim.id, existingMemberAnggota.id));
          } else {
            await db.insert(anggotaTim).values({
              timInovatorId: teamId,
              userId: mUserRes.user.id,
              nama: mNama,
              jabatan: mJabatan,
              unitKerja: mUnit,
              komitmenDukungan: 'Role: Co-creator',
            });
          }
        }
      }
    }
  }

  return { success: true, teamId, action, createdAccounts };
}

export async function finalizeImportAuditLog(summary: { totalSelected: number; importedCount: number; skippedCount: number; proposalIds: string[]; createdAccountsCount?: number }) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) return;

  await db.insert(auditLogs).values({
    userId: user.id,
    userName: user.nama,
    action: 'IMPORT_CALON_PESERTA',
    entity: 'TIM_INOVATOR',
    details: {
      ...summary,
      performedBy: `${user.nama} (${user.email})`,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function checkDuplicateProposals(proposalIds: string[]): Promise<Record<string, string>> {
  if (!proposalIds || proposalIds.length === 0) return {};
  const existingTeams = await db.select({
    id: timInovator.id,
    proposalIdAsli: timInovator.proposalIdAsli,
  }).from(timInovator).where(inArray(timInovator.proposalIdAsli, proposalIds));

  const map: Record<string, string> = {};
  for (const t of existingTeams) {
    if (t.proposalIdAsli) map[t.proposalIdAsli] = t.id;
  }
  return map;
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
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, message: 'File ringkasan.csv kosong atau hanya berisi header.', items: [], totalRows: 0, duplicateCount: 0 };
    }

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

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
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

    const existingTeams = await db.select({
      id: timInovator.id,
      proposalIdAsli: timInovator.proposalIdAsli,
    }).from(timInovator).where(inArray(timInovator.proposalIdAsli, proposalIds));

    const existingMap = new Map(existingTeams.map((t) => [t.proposalIdAsli, t.id]));

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
): Promise<{
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  createdAccounts: CreatedAccountSummaryItem[];
}> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return { success: false, message: 'Akses ditolak. Anda tidak memiliki izin import.', importedCount: 0, skippedCount: 0, createdAccounts: [] };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, message: 'File ZIP belum dipilih.', importedCount: 0, skippedCount: 0, createdAccounts: [] };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const supabaseAdmin = createAdminClient();

    // Ensure bucket 'dossier-lampiran' exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === 'dossier-lampiran');
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('dossier-lampiran', { public: true });
    }

    const selectedSet = new Set(selectedProposalIds);
    const overrideSet = new Set(overrideProposalIds);

    let importedCount = 0;
    let skippedCount = 0;
    const allCreatedAccounts: CreatedAccountSummaryItem[] = [];

    for (const proposalId of selectedSet) {
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

      const namaProyek = dossierData?.data_submisi?.judul || `Inovasi ${proposalId}`;
      const kategoriPia = dossierData?.data_submisi?.kategori_pia || 'PUSAT';
      const klasifikasiInovasi = dossierData?.status_akhir?.peringkat_medali || 'Platinum';
      const seasonAsli = dossierData?.season || 'Season 12 - 2026';
      const pengusul = dossierData?.data_submisi?.pengusul || {};

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

      const saveRes = await saveImportedProposal({
        proposalId,
        season: seasonAsli,
        namaProyek,
        kategoriPia,
        klasifikasiInovasi,
        pengusul,
        dossierData,
        lampiranUrls,
        override: overrideSet.has(proposalId),
      });

      if (saveRes.action === 'skipped') {
        skippedCount++;
      } else {
        importedCount++;
        if (saveRes.createdAccounts && saveRes.createdAccounts.length > 0) {
          allCreatedAccounts.push(...saveRes.createdAccounts);
        }
      }
    }

    return {
      success: true,
      message: `Proses import selesai: ${importedCount} tim calon peserta berhasil diproses, ${skippedCount} di-skip.`,
      importedCount,
      skippedCount,
      createdAccounts: allCreatedAccounts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memproses import: ${err.message}`,
      importedCount: 0,
      skippedCount: 0,
      createdAccounts: [],
    };
  }
}

function pathBasename(fullPath: string) {
  const parts = fullPath.split('/');
  return parts[parts.length - 1];
}
