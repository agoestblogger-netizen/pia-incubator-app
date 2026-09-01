'use server';

import { db } from '@/lib/db';
import { dossierPiaArchive, timInovator, auditLogs } from '@/lib/db/schema';
import { eq, desc, or, ilike, and } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { BAKU_KLASIFIKASI_OPTIONS, type BakuKlasifikasi } from '@/lib/data/dossier-constants';

/**
 * Cek otorisasi apakah user adalah Admin yang berhak mengedit Klasifikasi Inovasi.
 * Eksklusif untuk super_admin, admin_ic, admin, atau memiliki permission 'dossier.edit_klasifikasi'.
 */
export async function canUserEditKlasifikasi(user: any): Promise<boolean> {
  if (!user) return false;
  const isGlobalAdmin = user.globalRoles?.some((r: string) =>
    ['admin_ic', 'super_admin', 'admin'].includes(r)
  );
  if (isGlobalAdmin) return true;
  return await hasPermission(user, 'dossier.edit_klasifikasi');
}

export interface DossierListItem {
  id: string;
  proposalIdAsli: string | null;
  seasonAsli: string | null;
  namaProyek: string;
  namaPengusul: string;
  emailPengusul: string;
  kategoriPia: string;
  skorAi: string;
  statusAkhir: string;
  peringkatMedali: string;
  timInovatorId: string;
  timNama?: string;
  timStatus?: string;
  timKlasifikasi?: string | null;
  createdAt: Date;
}

export async function getDossierList(search?: string, season?: string, kategori?: string): Promise<DossierListItem[]> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'dossier.view'))) {
    return [];
  }

  const records = await db
    .select({
      id: dossierPiaArchive.id,
      proposalIdAsli: dossierPiaArchive.proposalIdAsli,
      seasonAsli: dossierPiaArchive.seasonAsli,
      snapshotData: dossierPiaArchive.snapshotData,
      timInovatorId: dossierPiaArchive.timInovatorId,
      timNama: timInovator.namaProyekInovasi,
      timStatus: timInovator.status,
      timKlasifikasi: timInovator.klasifikasiInovasi,
      createdAt: dossierPiaArchive.createdAt,
    })
    .from(dossierPiaArchive)
    .leftJoin(timInovator, eq(dossierPiaArchive.timInovatorId, timInovator.id))
    .orderBy(desc(dossierPiaArchive.createdAt));

  let results: DossierListItem[] = records.map((r) => {
    const snap = (r.snapshotData as any) || {};
    const dataSubmisi = snap.data_submisi || {};
    const pengusul = dataSubmisi.pengusul || {};
    const statusAkhir = snap.status_akhir || {};

    const activeMedal =
      r.timKlasifikasi ||
      statusAkhir.peringkat_medali ||
      dataSubmisi.klasifikasi_inovasi ||
      'Platinum';

    return {
      id: r.id,
      proposalIdAsli: r.proposalIdAsli || snap.proposal_id || '-',
      seasonAsli: r.seasonAsli || snap.season || 'Season 12 - 2026',
      namaProyek: dataSubmisi.judul || r.timNama || 'Tanpa Judul',
      namaPengusul: pengusul.nama || 'Inovator',
      emailPengusul: pengusul.email || '',
      kategoriPia: dataSubmisi.kategori_pia || 'PUSAT',
      skorAi: snap.skor_ai || '-',
      statusAkhir: statusAkhir.status || 'Release',
      peringkatMedali: activeMedal,
      timInovatorId: r.timInovatorId,
      timNama: r.timNama || undefined,
      timStatus: r.timStatus || undefined,
      timKlasifikasi: r.timKlasifikasi,
      createdAt: r.createdAt,
    };
  });

  // Apply in-memory search and filters
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (item) =>
        item.namaProyek.toLowerCase().includes(q) ||
        item.namaPengusul.toLowerCase().includes(q) ||
        (item.proposalIdAsli && item.proposalIdAsli.toLowerCase().includes(q))
    );
  }

  if (season && season !== 'ALL') {
    results = results.filter((item) => item.seasonAsli === season);
  }

  if (kategori && kategori !== 'ALL') {
    results = results.filter((item) => item.kategoriPia === kategori);
  }

  return results;
}

export async function getDossierDetail(proposalIdOrTimId: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'dossier.view'))) {
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proposalIdOrTimId);

  const whereClause = isUuid
    ? or(
        eq(dossierPiaArchive.id, proposalIdOrTimId),
        eq(dossierPiaArchive.timInovatorId, proposalIdOrTimId),
        eq(dossierPiaArchive.proposalIdAsli, proposalIdOrTimId)
      )
    : eq(dossierPiaArchive.proposalIdAsli, proposalIdOrTimId);

  // Find by proposalIdAsli or timInovatorId
  const [record] = await db
    .select({
      id: dossierPiaArchive.id,
      proposalIdAsli: dossierPiaArchive.proposalIdAsli,
      seasonAsli: dossierPiaArchive.seasonAsli,
      snapshotData: dossierPiaArchive.snapshotData,
      timInovatorId: dossierPiaArchive.timInovatorId,
      timNama: timInovator.namaProyekInovasi,
      timStatus: timInovator.status,
      timKlasifikasi: timInovator.klasifikasiInovasi,
      createdAt: dossierPiaArchive.createdAt,
      updatedAt: dossierPiaArchive.updatedAt,
    })
    .from(dossierPiaArchive)
    .leftJoin(timInovator, eq(dossierPiaArchive.timInovatorId, timInovator.id))
    .where(whereClause)
    .limit(1);

  if (!record) return null;

  const rawSnap = (record.snapshotData as any) || {};
  const proposalId = record.proposalIdAsli || rawSnap.proposal_id || '';
  const daftarLampiran: string[] = Array.isArray(rawSnap.daftar_lampiran) ? rawSnap.daftar_lampiran : [];
  const lampiranUrls: Record<string, string> = { ...(rawSnap.lampiran_urls || {}) };

  // Fallback: If any file in daftar_lampiran doesn't have a URL in snapshotData, construct the public Supabase storage URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikjqozzsrnuemqgdujeg.supabase.co';
  if (proposalId && daftarLampiran.length > 0) {
    for (const file of daftarLampiran) {
      if (!lampiranUrls[file]) {
        lampiranUrls[file] = `${supabaseUrl}/storage/v1/object/public/dossier-lampiran/${proposalId}/${file}`;
      }
    }
  }

  const effectiveMedal =
    record.timKlasifikasi ||
    rawSnap.status_akhir?.peringkat_medali ||
    rawSnap.data_submisi?.klasifikasi_inovasi ||
    'Platinum';

  return {
    ...record,
    timKlasifikasi: record.timKlasifikasi || effectiveMedal,
    snapshotData: {
      ...rawSnap,
      proposal_id: proposalId,
      lampiran_urls: lampiranUrls,
      status_akhir: {
        ...(rawSnap.status_akhir || {}),
        peringkat_medali: effectiveMedal,
      },
    },
  };
}

/**
 * Server Action: updateKlasifikasiInovasiAction
 * Khusus Administrator: Mengubah klasifikasi inovasi / medali tim Grand Final PIA.
 * Memperbarui tabel tim_inovator, dossier_pia_archive.snapshot_data, mencatat audit log, dan revalidasi path.
 */
export async function updateKlasifikasiInovasiAction(
  timId: string,
  klasifikasiBaru: string
): Promise<{ success: boolean; message: string; data?: { klasifikasi: string } }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const canEdit = await canUserEditKlasifikasi(user);
    if (!canEdit) {
      return {
        success: false,
        message: 'Akses ditolak: Hanya Administrator yang berwenang mengubah Klasifikasi Inovasi.',
      };
    }

    // Validasi nilai harus salah satu dari 5 opsi baku
    if (!BAKU_KLASIFIKASI_OPTIONS.includes(klasifikasiBaru as BakuKlasifikasi)) {
      return {
        success: false,
        message: `Nilai tidak valid. Klasifikasi baru harus salah satu dari: ${BAKU_KLASIFIKASI_OPTIONS.join(', ')}.`,
      };
    }

    // Cari data tim inovator saat ini
    const [targetTim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    if (!targetTim) {
      return { success: false, message: 'Tim Inovator tidak ditemukan di database.' };
    }

    const klasifikasiLama = targetTim.klasifikasiInovasi || 'Belum Ditentukan';

    // 1. Update tabel tim_inovator (Sumber data utama)
    await db
      .update(timInovator)
      .set({
        klasifikasiInovasi: klasifikasiBaru,
        updatedAt: new Date(),
      })
      .where(eq(timInovator.id, timId));

    // 2. Update snapshot_data di tabel dossier_pia_archive jika arsip ada
    const [dossierRecord] = await db
      .select()
      .from(dossierPiaArchive)
      .where(eq(dossierPiaArchive.timInovatorId, timId))
      .limit(1);

    if (dossierRecord) {
      const snap = (dossierRecord.snapshotData as any) || {};
      const updatedSnap = {
        ...snap,
        status_akhir: {
          ...(snap.status_akhir || {}),
          peringkat_medali: klasifikasiBaru,
        },
        data_submisi: {
          ...(snap.data_submisi || {}),
          klasifikasi_inovasi: klasifikasiBaru,
        },
      };

      await db
        .update(dossierPiaArchive)
        .set({
          snapshotData: updatedSnap,
          updatedAt: new Date(),
        })
        .where(eq(dossierPiaArchive.id, dossierRecord.id));
    }

    // 3. Catat di Audit Log Sistem
    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.nama,
      action: 'UPDATE_KLASIFIKASI_INOVASI',
      entity: 'TIM_INOVATOR',
      entityId: timId,
      details: {
        timId,
        namaProyekInovasi: targetTim.namaProyekInovasi,
        klasifikasiLama,
        klasifikasiBaru,
        updatedBy: `${user.nama} (${user.email})`,
        timestamp: new Date().toISOString(),
      },
    });

    // 4. Invalidate Cache & Revalidate Semua Consumer Halaman
    revalidatePath('/dossier');
    revalidatePath('/dossier/[id]', 'page');
    if (dossierRecord?.proposalIdAsli) {
      revalidatePath(`/dossier/${dossierRecord.proposalIdAsli}`);
    }
    revalidatePath(`/dossier/${timId}`);
    revalidatePath('/dashboard');
    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/market-validation`);

    return {
      success: true,
      message: `Klasifikasi Inovasi tim "${targetTim.namaProyekInovasi}" berhasil diubah menjadi ${klasifikasiBaru}.`,
      data: { klasifikasi: klasifikasiBaru },
    };
  } catch (error: any) {
    console.error('Error updating klasifikasi inovasi:', error);
    return {
      success: false,
      message: error?.message || 'Terjadi kesalahan sistem saat memperbarui klasifikasi inovasi.',
    };
  }
}
