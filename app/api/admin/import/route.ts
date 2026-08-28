import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { db } from '@/lib/db';
import { timInovator, anggotaTim, dossierPiaArchive, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function pathBasename(fullPath: string) {
  const parts = fullPath.split('/');
  return parts[parts.length - 1];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return NextResponse.json({ success: false, message: 'Akses ditolak. Anda tidak memiliki izin import.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const selectedIdsJson = formData.get('selectedProposalIds') as string | null;
    const overrideIdsJson = formData.get('overrideProposalIds') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File ZIP belum dipilih.' }, { status: 400 });
    }

    const selectedProposalIds: string[] = selectedIdsJson ? JSON.parse(selectedIdsJson) : [];
    const overrideProposalIds: string[] = overrideIdsJson ? JSON.parse(overrideIdsJson) : [];

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
        teamId = existingTeam.id;
        await db.update(timInovator).set({
          namaProyekInovasi: namaProyek,
          kategoriPia: kategoriPia,
          klasifikasiInovasi: klasifikasiInovasi,
          updatedAt: new Date(),
        }).where(eq(timInovator.id, teamId));

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

        await db.insert(anggotaTim).values({
          timInovatorId: teamId,
          nama: pengusul.nama || 'Inisiator Proyek',
          jabatan: pengusul.jabatan || 'Inisiator',
          unitKerja: pengusul.unit_kerja || 'PT Pegadaian (Persero)',
          komitmenDukungan: 'Inisiator Inovasi',
        });

        await db.insert(dossierPiaArchive).values({
          timInovatorId: teamId,
          proposalIdAsli: proposalId,
          seasonAsli: seasonAsli,
          snapshotData: dossierData,
        });
      }

      importedCount++;
    }

    // Record audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.nama,
      action: 'IMPORT_CALON_PESERTA',
      entity: 'TIM_INOVATOR',
      details: {
        totalSelected: selectedProposalIds.length,
        importedCount,
        skippedCount,
        proposalIds: selectedProposalIds,
        performedBy: `${user.nama} (${user.email})`,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Proses import selesai: ${importedCount} tim calon peserta berhasil diproses, ${skippedCount} di-skip.`,
      importedCount,
      skippedCount,
    });
  } catch (err: any) {
    console.error('Import API error:', err);
    return NextResponse.json({
      success: false,
      message: `Gagal memproses import: ${err.message}`,
    }, { status: 500 });
  }
}
