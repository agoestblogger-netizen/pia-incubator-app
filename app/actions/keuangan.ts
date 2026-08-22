"use server";

import { db } from "@/lib/db";
import { anggaranPengajuan, lpj } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export async function getKeuanganData(timId: string) {
  const pengajuanList = await db
    .select()
    .from(anggaranPengajuan)
    .where(eq(anggaranPengajuan.timInovatorId, timId))
    .orderBy(desc(anggaranPengajuan.createdAt));

  const result = await Promise.all(
    pengajuanList.map(async (p) => {
      const [lpjData] = await db.select().from(lpj).where(eq(lpj.anggaranPengajuanId, p.id)).limit(1);
      return { ...p, lpj: lpjData || null };
    })
  );

  return result;
}

export async function submitAnggaranAction(timId: string, data: {
  fase: string;
  nominalDiajukan: number;
  fileDokumenUrl?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.submit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengajukan anggaran (RAB) untuk tim ini.',
      };
    }

    if (data.nominalDiajukan > 20000000) {
      return { success: false, error: 'Maksimal pengajuan anggaran per fase adalah Rp 20.000.000.' };
    }

    const [pengajuan] = await db.insert(anggaranPengajuan).values({
      timInovatorId: timId,
      fase: data.fase,
      nominalDiajukan: data.nominalDiajukan,
      fileDokumenUrl: data.fileDokumenUrl,
      status: 'diajukan',
    }).returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ANGGARAN_SUBMIT',
      entity: 'anggaran_pengajuan',
      entityId: pengajuan.id,
      details: { timId, fase: data.fase, nominalDiajukan: data.nominalDiajukan },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: pengajuan };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengajukan anggaran.' };
  }
}

export async function submitLpjAction(anggaranId: string, timId: string, data: {
  fileDokumenUrl: string;
  buktiElektronikUrl?: string;
  tanggalKegiatanSelesai: Date;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.submit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengirimkan LPJ untuk tim ini.',
      };
    }

    const batasKirim = new Date(data.tanggalKegiatanSelesai);
    // 10 business days approx 14 calendar days
    batasKirim.setDate(batasKirim.getDate() + 14);

    const isLate = new Date() > batasKirim;

    const [existing] = await db.select().from(lpj).where(eq(lpj.anggaranPengajuanId, anggaranId)).limit(1);
    let lpjId = existing?.id;

    if (existing) {
      await db.update(lpj).set({
        fileDokumenUrl: data.fileDokumenUrl,
        buktiElektronikUrl: data.buktiElektronikUrl,
        tanggalKegiatanSelesai: data.tanggalKegiatanSelesai,
        tanggalKirim: new Date(),
        batasKirim,
        status: isLate ? 'terlambat' : 'dikirim',
        updatedAt: new Date(),
      }).where(eq(lpj.id, existing.id));
    } else {
      const [inserted] = await db.insert(lpj).values({
        anggaranPengajuanId: anggaranId,
        fileDokumenUrl: data.fileDokumenUrl,
        buktiElektronikUrl: data.buktiElektronikUrl,
        tanggalKegiatanSelesai: data.tanggalKegiatanSelesai,
        tanggalKirim: new Date(),
        batasKirim,
        status: isLate ? 'terlambat' : 'dikirim',
      }).returning();
      lpjId = inserted.id;
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'LPJ_SUBMIT',
      entity: 'lpj',
      entityId: lpjId,
      details: { timId, anggaranId, isLate },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengirim LPJ.' };
  }
}
