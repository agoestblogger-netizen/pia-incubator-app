"use server";

import { db } from "@/lib/db";
import { forumManajemenInovasi, penghargaan } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getFmiData(timId: string) {
  const notulensiList = await db
    .select()
    .from(forumManajemenInovasi)
    .where(eq(forumManajemenInovasi.timInovatorId, timId))
    .orderBy(desc(forumManajemenInovasi.tanggal));

  const [penghargaanData] = await db
    .select()
    .from(penghargaan)
    .where(eq(penghargaan.timInovatorId, timId))
    .limit(1);

  return { notulensiList, penghargaan: penghargaanData || null };
}

export async function saveFmiNotulensiAction(timId: string, data: {
  keputusanAkhir: string;
  catatanNotulensi?: string;
  diinputOleh: string;
}) {
  try {
    const [row] = await db.insert(forumManajemenInovasi).values({
      timInovatorId: timId,
      keputusanAkhir: data.keputusanAkhir,
      catatanNotulensi: data.catatanNotulensi,
      diinputOleh: data.diinputOleh,
    }).returning();

    revalidatePath(`/tim/${timId}/governance`);
    return { success: true, data: row };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan notulensi FMI.' };
  }
}
