'use server';

import { db } from '@/lib/db';
import { dossierPiaArchive, timInovator } from '@/lib/db/schema';
import { eq, desc, or, ilike, and } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';

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
      peringkatMedali: statusAkhir.peringkat_medali || dataSubmisi.klasifikasi_inovasi || 'Platinum',
      timInovatorId: r.timInovatorId,
      timNama: r.timNama || undefined,
      timStatus: r.timStatus || undefined,
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

  return {
    ...record,
    snapshotData: {
      ...rawSnap,
      proposal_id: proposalId,
      lampiran_urls: lampiranUrls,
    },
  };
}
