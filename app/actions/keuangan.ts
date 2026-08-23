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

export async function updateAnggaranAction(
  anggaranId: string,
  timId: string,
  data: {
    fase: string;
    nominalDiajukan: number;
    fileDokumenUrl?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.submit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengubah pengajuan anggaran ini.',
      };
    }

    const [existing] = await db
      .select()
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.id, anggaranId))
      .limit(1);

    if (!existing || existing.timInovatorId !== timId) {
      return { success: false, error: 'Data pengajuan anggaran tidak ditemukan.' };
    }

    if (existing.status !== 'diajukan') {
      return {
        success: false,
        error: `Pengajuan tidak dapat diedit karena status sudah "${existing.status}". Hanya pengajuan dengan status "Diajukan" yang dapat diubah.`,
      };
    }

    if (data.nominalDiajukan > 20000000) {
      return { success: false, error: 'Maksimal pengajuan anggaran per fase adalah Rp 20.000.000.' };
    }

    const [updated] = await db
      .update(anggaranPengajuan)
      .set({
        fase: data.fase,
        nominalDiajukan: data.nominalDiajukan,
        fileDokumenUrl: data.fileDokumenUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(anggaranPengajuan.id, anggaranId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ANGGARAN_EDIT',
      entity: 'anggaran_pengajuan',
      entityId: anggaranId,
      details: {
        timId,
        previous: {
          fase: existing.fase,
          nominalDiajukan: existing.nominalDiajukan,
          fileDokumenUrl: existing.fileDokumenUrl,
        },
        updated: {
          fase: data.fase,
          nominalDiajukan: data.nominalDiajukan,
          fileDokumenUrl: data.fileDokumenUrl,
        },
      },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah pengajuan anggaran.' };
  }
}

export async function deleteAnggaranAction(anggaranId: string, timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.submit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk membatalkan/menghapus pengajuan anggaran ini.',
      };
    }

    const [existing] = await db
      .select()
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.id, anggaranId))
      .limit(1);

    if (!existing || existing.timInovatorId !== timId) {
      return { success: false, error: 'Data pengajuan anggaran tidak ditemukan.' };
    }

    if (existing.status !== 'diajukan') {
      return {
        success: false,
        error: `Pengajuan tidak dapat dihapus karena status sudah "${existing.status}". Hanya pengajuan dengan status "Diajukan" yang dapat dibatalkan.`,
      };
    }

    // Catat audit log sebelum data di-hard delete
    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ANGGARAN_DELETE',
      entity: 'anggaran_pengajuan',
      entityId: anggaranId,
      details: {
        timId,
        fase: existing.fase,
        nominalDiajukan: existing.nominalDiajukan,
        fileDokumenUrl: existing.fileDokumenUrl,
      },
    });

    await db.delete(anggaranPengajuan).where(eq(anggaranPengajuan.id, anggaranId));

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus pengajuan anggaran.' };
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

export async function authorizeAnggaranAction(
  anggaranId: string,
  timId: string,
  status: 'diotorisasi' | 'ditolak',
  catatanPenilaian?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.manage', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengotorisasi / menolak anggaran.',
      };
    }

    const [updated] = await db
      .update(anggaranPengajuan)
      .set({
        status,
        catatanPenilaian: catatanPenilaian || null,
        updatedAt: new Date(),
      })
      .where(eq(anggaranPengajuan.id, anggaranId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: status === 'diotorisasi' ? 'ANGGARAN_AUTHORIZE' : 'ANGGARAN_REJECT',
      entity: 'anggaran_pengajuan',
      entityId: anggaranId,
      details: { timId, status, catatanPenilaian },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memproses otorisasi anggaran.' };
  }
}

export async function approveLpjAction(
  lpjId: string,
  timId: string,
  status: 'disetujui' | 'ditolak',
  catatan?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'anggaran.manage', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk menyetujui / menolak LPJ.',
      };
    }

    const [updated] = await db
      .update(lpj)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(lpj.id, lpjId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: status === 'disetujui' ? 'LPJ_APPROVE' : 'LPJ_REJECT',
      entity: 'lpj',
      entityId: lpjId,
      details: { timId, status, catatan },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memproses persetujuan LPJ.' };
  }
}

