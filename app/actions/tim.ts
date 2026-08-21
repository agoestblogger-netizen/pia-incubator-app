"use server";

import { db } from "@/lib/db";
import { timInovator, anggotaTim, durasiLog, kanbanColumn } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTimInovatorList() {
  return await db.select().from(timInovator).orderBy(desc(timInovator.createdAt));
}

export async function getTimInovatorById(id: string) {
  const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, id)).limit(1);
  if (!tim) return null;

  const anggota = await db.select().from(anggotaTim).where(eq(anggotaTim.timInovatorId, id));
  return { ...tim, anggota };
}

export async function createTimInovatorAction(formData: {
  namaProyekInovasi: string;
  kategoriPia: string;
  klasifikasiInovasi?: string;
  durasiBulan: number;
  anggota: { nama: string; jabatan: string; unitKerja: string; komitmenDukungan?: string }[];
}) {
  try {
    const tanggalMulai = new Date();
    const tanggalBerakhir = new Date();
    tanggalBerakhir.setMonth(tanggalBerakhir.getMonth() + formData.durasiBulan);

    const [tim] = await db.insert(timInovator).values({
      namaProyekInovasi: formData.namaProyekInovasi,
      kategoriPia: formData.kategoriPia,
      klasifikasiInovasi: formData.klasifikasiInovasi || 'Gold',
      status: 'aktif',
      tanggalMulai,
      durasiBulan: formData.durasiBulan,
      tanggalBerakhir,
      seasonAsli: 'Season 12 - 2026',
    }).returning();

    // Insert anggota tim
    if (formData.anggota && formData.anggota.length > 0) {
      await db.insert(anggotaTim).values(
        formData.anggota.map((a) => ({
          timInovatorId: tim.id,
          nama: a.nama,
          jabatan: a.jabatan,
          unitKerja: a.unitKerja,
          komitmenDukungan: a.komitmenDukungan,
        }))
      );
    }

    // Seed default kanban columns for this team
    const defaultCols = ['To Do', 'In Progress', 'Review', 'Done'];
    await db.insert(kanbanColumn).values(
      defaultCols.map((name, idx) => ({
        timInovatorId: tim.id,
        namaKolom: name,
        urutan: idx + 1,
      }))
    );

    revalidatePath('/dashboard');
    return { success: true, data: tim };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat tim inovator.' };
  }
}

export async function updateDurasiTimAction(
  timId: string,
  durasiBaru: number,
  alasan: string,
  diubahOleh: string
) {
  try {
    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);
    if (!tim) return { success: false, error: 'Tim tidak ditemukan.' };

    const durasiLama = tim.durasiBulan;
    const tanggalBerakhir = new Date(tim.tanggalMulai || new Date());
    tanggalBerakhir.setMonth(tanggalBerakhir.getMonth() + durasiBaru);

    await db.update(timInovator).set({
      durasiBulan: durasiBaru,
      tanggalBerakhir,
      updatedAt: new Date(),
    }).where(eq(timInovator.id, timId));

    await db.insert(durasiLog).values({
      timInovatorId: timId,
      durasiLama,
      durasiBaru,
      alasan,
      diubahOleh,
    });

    revalidatePath('/dashboard');
    revalidatePath(`/tim/${timId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah durasi.' };
  }
}
