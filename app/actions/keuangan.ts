"use server";

import { db } from "@/lib/db";
import {
  anggaranPengajuan,
  lpj,
  type AnggaranDetailPengajuan,
  type AnggaranApproverPengesahan,
  type LpjDetailPengajuan,
  userRoleTim,
  roles,
  users,
  anggotaTim,
} from "@/lib/db/schema";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { formatRupiah } from "@/lib/utils";

export async function getUserTeamUnitKerja(userId?: string | null, timId?: string | null): Promise<string> {
  if (!userId || !timId) return "";

  try {
    // 1. Query Struktur Role & Akuntabilitas Tim (userRoleTim joined with roles, users, and anggotaTim)
    const assignments = await db
      .select({
        roleCode: roles.kodeRole,
        unitKerja: anggotaTim.unitKerja,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .innerJoin(users, eq(userRoleTim.userId, users.id))
      .leftJoin(
        anggotaTim,
        and(
          eq(anggotaTim.timInovatorId, timId),
          or(
            eq(anggotaTim.userId, userRoleTim.userId),
            sql`LOWER(TRIM(${anggotaTim.nama})) = LOWER(TRIM(${users.nama}))`
          )
        )
      )
      .where(
        and(
          eq(userRoleTim.timInovatorId, timId),
          eq(userRoleTim.userId, userId)
        )
      );

    if (assignments.length > 0) {
      // Prioritas peran yang paling relevan untuk pengajuan anggaran (PO -> Inisiator -> Co-creator -> Promotor -> Coach -> Lainnya)
      const ROLE_PRIORITY: Record<string, number> = {
        project_owner: 1,
        inisiator: 2,
        co_creator: 3,
        promotor: 4,
        sponsor: 5,
        coach: 6,
        sme: 7,
      };

      assignments.sort((a, b) => {
        const prioA = ROLE_PRIORITY[a.roleCode] || 99;
        const prioB = ROLE_PRIORITY[b.roleCode] || 99;
        return prioA - prioB;
      });

      const matchedWithUnit = assignments.find((a) => a.unitKerja && a.unitKerja.trim().length > 0);
      if (matchedWithUnit?.unitKerja) {
        return matchedWithUnit.unitKerja.trim();
      }
    }

    // 2. Fallback: Cek anggotaTim langsung berdasarkan userId dan timId
    const [directAnggota] = await db
      .select({ unitKerja: anggotaTim.unitKerja })
      .from(anggotaTim)
      .where(
        and(
          eq(anggotaTim.timInovatorId, timId),
          eq(anggotaTim.userId, userId)
        )
      )
      .limit(1);

    if (directAnggota?.unitKerja && directAnggota.unitKerja.trim().length > 0) {
      return directAnggota.unitKerja.trim();
    }

    // 3. Fallback: Cek apakah user ada di anggotaTim dengan pencocokan nama user
    const [userObj] = await db
      .select({ nama: users.nama })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userObj?.nama) {
      const [angByName] = await db
        .select({ unitKerja: anggotaTim.unitKerja })
        .from(anggotaTim)
        .where(
          and(
            eq(anggotaTim.timInovatorId, timId),
            sql`LOWER(TRIM(${anggotaTim.nama})) = LOWER(TRIM(${userObj.nama}))`
          )
        )
        .limit(1);

      if (angByName?.unitKerja && angByName.unitKerja.trim().length > 0) {
        return angByName.unitKerja.trim();
      }
    }

    return "";
  } catch (error) {
    console.error("[getUserTeamUnitKerja] Error:", error);
    return "";
  }
}

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
  detailPengajuan?: AnggaranDetailPengajuan;
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

    // Validasi akumulasi total anggaran per tim (maks Rp 40.000.000, mengecualikan status ditolak)
    const existingList = await db
      .select({ nominal: anggaranPengajuan.nominalDiajukan, status: anggaranPengajuan.status })
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.timInovatorId, timId));

    const currentTotal = existingList
      .filter((item) => item.status !== 'ditolak')
      .reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);

    if (currentTotal + Number(data.nominalDiajukan) > 40000000) {
      return {
        success: false,
        error: `Total akumulasi pengajuan anggaran tim tidak boleh melebihi Rp 40.000.000. Saat ini sudah diajukan ${formatRupiah(currentTotal)}, sisa alokasi adalah ${formatRupiah(Math.max(0, 40000000 - currentTotal))}.`,
      };
    }

    const [pengajuan] = await db.insert(anggaranPengajuan).values({
      timInovatorId: timId,
      fase: data.fase,
      nominalDiajukan: data.nominalDiajukan,
      fileDokumenUrl: data.fileDokumenUrl || null,
      detailPengajuan: data.detailPengajuan || null,
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
    detailPengajuan?: AnggaranDetailPengajuan;
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

    // Validasi akumulasi total anggaran per tim mengecualikan pengajuan yang sedang diedit
    const existingList = await db
      .select({ id: anggaranPengajuan.id, nominal: anggaranPengajuan.nominalDiajukan, status: anggaranPengajuan.status })
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.timInovatorId, timId));

    const otherTotal = existingList
      .filter((item) => item.id !== anggaranId && item.status !== 'ditolak')
      .reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);

    if (otherTotal + Number(data.nominalDiajukan) > 40000000) {
      return {
        success: false,
        error: `Total akumulasi pengajuan anggaran tim tidak boleh melebihi Rp 40.000.000. Total pengajuan lain adalah ${formatRupiah(otherTotal)}, sisa alokasi adalah ${formatRupiah(Math.max(0, 40000000 - otherTotal))}.`,
      };
    }

    const [updated] = await db
      .update(anggaranPengajuan)
      .set({
        fase: data.fase,
        nominalDiajukan: data.nominalDiajukan,
        fileDokumenUrl: data.fileDokumenUrl || null,
        detailPengajuan: data.detailPengajuan || existing.detailPengajuan,
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

function addBusinessDays(startDate: Date, businessDays: number): Date {
  const target = new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    target.setDate(target.getDate() + 1);
    const day = target.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return target;
}

export async function submitLpjAction(
  anggaranId: string,
  timId: string,
  data: {
    detailLpj: LpjDetailPengajuan;
    fileDokumenUrl?: string;
    buktiElektronikUrl?: string;
    tanggalKegiatanSelesai?: Date | string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "anggaran.submit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengirimkan LPJ untuk tim ini.",
      };
    }

    // 1. Ambil data pengajuan RAB terkait
    const [anggaran] = await db
      .select()
      .from(anggaranPengajuan)
      .where(and(eq(anggaranPengajuan.id, anggaranId), eq(anggaranPengajuan.timInovatorId, timId)))
      .limit(1);

    if (!anggaran) {
      return { success: false, error: "Pengajuan anggaran (RAB) terkait tidak ditemukan." };
    }

    if (anggaran.status !== "disetujui" && anggaran.status !== "diotorisasi") {
      return {
        success: false,
        error: `LPJ hanya dapat diajukan untuk RAB yang telah disetujui (status saat ini: "${anggaran.status}").`,
      };
    }

    // 2. Cek apakah RAB ini sudah memiliki LPJ
    const [existingLpj] = await db
      .select()
      .from(lpj)
      .where(eq(lpj.anggaranPengajuanId, anggaranId))
      .limit(1);

    if (existingLpj) {
      return {
        success: false,
        error: "Pengajuan RAB ini sudah memiliki LPJ. Setiap pengajuan RAB hanya dapat memiliki 1 LPJ terkait.",
      };
    }

    // 3. Validasi Total Nominal LPJ tidak boleh melebihi Nominal RAB Disetujui
    const totalNominal = Number(data.detailLpj.totalNominal) || 0;
    const maxNominal = Number(anggaran.nominalDiajukan) || 0;
    if (totalNominal > maxNominal) {
      return {
        success: false,
        error: `Total penggunaan dana LPJ (${formatRupiah(totalNominal)}) melebihi nominal RAB yang disetujui (${formatRupiah(maxNominal)}). Harap sesuaikan rincian pengeluaran agar tidak melebihi anggaran yang disetujui.`,
      };
    }

    // 4. Validasi Evidence wajib per baris
    if (!data.detailLpj.items || data.detailLpj.items.length === 0) {
      return { success: false, error: "Minimal harus ada 1 baris rincian penggunaan anggaran." };
    }

    for (let i = 0; i < data.detailLpj.items.length; i++) {
      const row = data.detailLpj.items[i];
      if (!row.uraian || row.uraian.trim() === "") {
        return { success: false, error: `Uraian penggunaan pada baris ke-${i + 1} wajib diisi.` };
      }
      if (!row.nominal || row.nominal <= 0) {
        return { success: false, error: `Nominal pada baris ke-${i + 1} harus lebih besar dari Rp 0.` };
      }
      if (!row.evidence || row.evidence.length === 0) {
        return {
          success: false,
          error: `Baris ke-${i + 1} ("${row.uraian}") wajib menyertakan bukti penggunaan dana (upload nota/kwitansi atau link bukti).`,
        };
      }
    }

    // 5. Validasi Tanda Tangan PIC
    if (!data.detailLpj.pernyataanPic?.signatureImage) {
      return {
        success: false,
        error: "Pernyataan PIC wajib ditandatangani secara digital sebelum mengirimkan LPJ.",
      };
    }

    if (!data.detailLpj.pernyataanPic?.nik || data.detailLpj.pernyataanPic.nik.trim() === "") {
      return {
        success: false,
        error: "NIK PIC wajib diisi pada bagian pernyataan pengesahan.",
      };
    }

    // Hitung batas kirim 10 hari kerja
    const refDate = data.tanggalKegiatanSelesai
      ? new Date(data.tanggalKegiatanSelesai)
      : anggaran.updatedAt || new Date();
    const batasKirim = addBusinessDays(refDate, 10);
    const now = new Date();
    const isLate = now > batasKirim;

    const [inserted] = await db
      .insert(lpj)
      .values({
        anggaranPengajuanId: anggaranId,
        fileDokumenUrl: data.fileDokumenUrl || null,
        buktiElektronikUrl: data.buktiElektronikUrl || null,
        tanggalKegiatanSelesai: data.tanggalKegiatanSelesai ? new Date(data.tanggalKegiatanSelesai) : new Date(),
        tanggalKirim: now,
        batasKirim,
        status: isLate ? "terlambat" : "terkirim",
        detailLpj: data.detailLpj,
      })
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "LPJ_SUBMIT",
      entity: "lpj",
      entityId: inserted.id,
      details: {
        timId,
        anggaranId,
        totalNominal,
        nominalRab: maxNominal,
        isLate,
      },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error("[submitLpjAction] Error:", error);
    return { success: false, error: error.message || "Gagal mengirimkan Formulir LPJ." };
  }
}

export async function getAnggaranApprovers(): Promise<Array<{ id: string; nama: string; email: string }>> {
  try {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.kodeRole, 'approve_anggaran'))
      .limit(1);

    if (!role) return [];

    const assigned = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
      })
      .from(userRoleTim)
      .innerJoin(users, eq(userRoleTim.userId, users.id))
      .where(eq(userRoleTim.roleId, role.id));

    return assigned;
  } catch (err) {
    console.error("[getAnggaranApprovers] error:", err);
    return [];
  }
}

export async function approveAnggaranWithSignatureAction(
  anggaranId: string,
  timId: string,
  data: {
    signatureImage: string;
    nik?: string;
    unitKerja?: string;
    catatan?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isApprover =
      user.globalRoles.includes('approve_anggaran') ||
      user.timRoles.some((r) => r.roleCode === 'approve_anggaran') ||
      (await hasPermission(user, 'anggaran.manage', timId));

    if (!isApprover) {
      return {
        success: false,
        error: 'Forbidden: Hanya akun dengan role Approve Anggaran (Kepala Departemen IC) yang berhak menyetujui anggaran.',
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

    const currentDetail = (existing.detailPengajuan as AnggaranDetailPengajuan) || {};
    const pengesahanApprover: AnggaranApproverPengesahan = {
      nama: user.nama,
      nik: data.nik || undefined,
      unitKerja: data.unitKerja || "Innovation Center",
      tanggal: new Date().toISOString(),
      signatureImage: data.signatureImage,
      userId: user.id,
    };

    const updatedDetail: AnggaranDetailPengajuan = {
      ...currentDetail,
      pengesahanApprover,
    };

    const [updated] = await db
      .update(anggaranPengajuan)
      .set({
        status: 'disetujui',
        detailPengajuan: updatedDetail,
        catatanPenilaian: data.catatan || existing.catatanPenilaian || null,
        updatedAt: new Date(),
      })
      .where(eq(anggaranPengajuan.id, anggaranId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ANGGARAN_APPROVE_SIGN',
      entity: 'anggaran_pengajuan',
      entityId: anggaranId,
      details: { timId, approverNama: user.nama, catatan: data.catatan },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menandatangani dan menyetujui anggaran.' };
  }
}

export async function rejectAnggaranAction(
  anggaranId: string,
  timId: string,
  alasanPenolakan: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    if (!alasanPenolakan || !alasanPenolakan.trim()) {
      return { success: false, error: 'Alasan penolakan wajib diisi.' };
    }

    const isApprover =
      user.globalRoles.includes('approve_anggaran') ||
      user.timRoles.some((r) => r.roleCode === 'approve_anggaran') ||
      (await hasPermission(user, 'anggaran.manage', timId));

    if (!isApprover) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk menolak pengajuan anggaran.',
      };
    }

    const [updated] = await db
      .update(anggaranPengajuan)
      .set({
        status: 'ditolak',
        catatanPenilaian: alasanPenolakan.trim(),
        updatedAt: new Date(),
      })
      .where(eq(anggaranPengajuan.id, anggaranId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ANGGARAN_REJECT',
      entity: 'anggaran_pengajuan',
      entityId: anggaranId,
      details: { timId, alasanPenolakan: alasanPenolakan.trim() },
    });

    revalidatePath(`/tim/${timId}/keuangan`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menolak pengajuan anggaran.' };
  }
}

export async function authorizeAnggaranAction(
  anggaranId: string,
  timId: string,
  status: 'disetujui' | 'diotorisasi' | 'ditolak',
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
      action: status === 'ditolak' ? 'ANGGARAN_REJECT' : 'ANGGARAN_AUTHORIZE',
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

