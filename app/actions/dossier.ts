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
    .where(
      or(
        eq(dossierPiaArchive.proposalIdAsli, proposalIdOrTimId),
        eq(dossierPiaArchive.timInovatorId, proposalIdOrTimId)
      )
    )
    .limit(1);

  if (!record) return null;

  return {
    ...record,
    snapshotData: (record.snapshotData as any) || {},
  };
}
