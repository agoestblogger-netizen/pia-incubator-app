"use server";

import { db } from "@/lib/db";
import { forumManajemenInovasi, penghargaan } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

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
  diinputOleh?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'fmi.manage', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk menginput keputusan/notulensi FMI.',
      };
    }

    const [row] = await db.insert(forumManajemenInovasi).values({
      timInovatorId: timId,
      keputusanAkhir: data.keputusanAkhir,
      catatanNotulensi: data.catatanNotulensi,
      diinputOleh: data.diinputOleh || user.nama,
    }).returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'FMI_NOTULENSI_SAVE',
      entity: 'forum_manajemen_inovasi',
      entityId: row.id,
      details: { timId, keputusanAkhir: data.keputusanAkhir },
    });

    revalidatePath(`/tim/${timId}/governance`);
    return { success: true, data: row };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan notulensi FMI.' };
  }
}
