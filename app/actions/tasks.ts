"use server";

import { db } from "@/lib/db";
import {
  timInovator,
  charter,
  marketValidationPlan,
  marketValidationReport,
  forumManajemenInovasi,
  anggaranPengajuan,
  lpj,
  kanbanCard,
  anggotaTim,
  taskDismissal,
} from "@/lib/db/schema";
import { eq, inArray, and, desc, ne } from "drizzle-orm";
import { getCurrentUser, type UserProfile } from "@/lib/auth/rbac";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type TaskCategory =
  | "persetujuan"
  | "otorisasi_anggaran"
  | "keputusan_fmi"
  | "durasi_tim"
  | "kanban";

export type TaskItem = {
  id: string;
  taskType: string;
  entityId: string;
  category: TaskCategory;
  categoryLabel: string;
  title: string;
  description: string;
  teamId?: string;
  teamName?: string;
  link: string;
  statusBadge?: {
    label: string;
    variant: "default" | "destructive" | "warning" | "secondary" | "gold" | "success";
  };
  dueDate?: Date | null;
  isOverdue?: boolean;
  createdAt?: Date | null;
};

export type MyTasksSummary = {
  totalCount: number;
  tasksByCategory: {
    persetujuan: TaskItem[];
    otorisasi_anggaran: TaskItem[];
    keputusan_fmi: TaskItem[];
    durasi_tim: TaskItem[];
    kanban: TaskItem[];
  };
  allTasks: TaskItem[];
};

export async function dismissTaskAction(taskType: string, entityId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    await db
      .insert(taskDismissal)
      .values({
        userId: user.id,
        taskType,
        entityId,
      })
      .onConflictDoNothing();

    revalidatePath("/tugas");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyembunyikan tugas." };
  }
}

export async function getMyTasks(currentUser?: UserProfile | null): Promise<MyTasksSummary> {
  const user = currentUser !== undefined ? currentUser : await getCurrentUser();

  const emptySummary: MyTasksSummary = {
    totalCount: 0,
    tasksByCategory: {
      persetujuan: [],
      otorisasi_anggaran: [],
      keputusan_fmi: [],
      durasi_tim: [],
      kanban: [],
    },
    allTasks: [],
  };

  if (!user) return emptySummary;

  const now = new Date();
  const tasksByCategory: MyTasksSummary["tasksByCategory"] = {
    persetujuan: [],
    otorisasi_anggaran: [],
    keputusan_fmi: [],
    durasi_tim: [],
    kanban: [],
  };

  // Load user's dismissed tasks
  const dismissals = await db
    .select()
    .from(taskDismissal)
    .where(eq(taskDismissal.userId, user.id));

  const dismissedSet = new Set(
    dismissals.map((d) => `${d.taskType}_${d.entityId}`)
  );

  const isDismissed = (taskType: string, entityId: string) =>
    dismissedSet.has(`${taskType}_${entityId}`);

  const isAdmin = user.globalRoles.includes("admin_ic");
  const isDivisiIc = user.globalRoles.includes("divisi_ic");
  const isGlobalManagement = isAdmin || isDivisiIc;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Role Promotor: Persetujuan Charter & Market Validation Report
  // ─────────────────────────────────────────────────────────────────────────────
  const promotorTimRoles = user.timRoles.filter((tr) => tr.roleCode === "promotor");
  const promotorTimIds = Array.from(new Set(promotorTimRoles.map((tr) => tr.timId)));

  if (promotorTimIds.length > 0) {
    const teams = await db
      .select()
      .from(timInovator)
      .where(inArray(timInovator.id, promotorTimIds));

    for (const tim of teams) {
      // a. Check Innovation Charter
      if (!isDismissed("charter_approval", tim.id)) {
        const [timCharter] = await db
          .select()
          .from(charter)
          .where(eq(charter.timInovatorId, tim.id))
          .limit(1);

        const isCharterApproved = Boolean(
          timCharter &&
            timCharter.ttdDisetujui &&
            typeof timCharter.ttdDisetujui === "object" &&
            (timCharter.ttdDisetujui as any).status === "approved"
        );

        if (!isCharterApproved) {
          tasksByCategory.persetujuan.push({
            id: `charter_${tim.id}`,
            taskType: "charter_approval",
            entityId: tim.id,
            category: "persetujuan",
            categoryLabel: "Persetujuan Dokumen",
            title: `Persetujuan Innovation Charter — ${tim.namaProyekInovasi}`,
            description: `Innovation Charter untuk tim ${tim.namaProyekInovasi} belum disetujui oleh Promotor.`,
            teamId: tim.id,
            teamName: tim.namaProyekInovasi,
            link: `/tim/${tim.id}/charter`,
            statusBadge: { label: "Perlu Persetujuan", variant: "warning" },
            createdAt: timCharter?.createdAt || tim.createdAt,
          });
        }
      }

      // b. Check Market Validation Report
      if (!isDismissed("mv_report_approval", tim.id)) {
        const [mvPlan] = await db
          .select()
          .from(marketValidationPlan)
          .where(eq(marketValidationPlan.timInovatorId, tim.id))
          .limit(1);

        if (mvPlan) {
          const [mvReport] = await db
            .select()
            .from(marketValidationReport)
            .where(eq(marketValidationReport.planId, mvPlan.id))
            .limit(1);

          if (mvReport) {
            const isReportApproved = Boolean(
              mvReport.ttdDisetujui &&
                typeof mvReport.ttdDisetujui === "object" &&
                (mvReport.ttdDisetujui as any).status === "approved"
            );

            if (!isReportApproved) {
              tasksByCategory.persetujuan.push({
                id: `mv_report_${tim.id}`,
                taskType: "mv_report_approval",
                entityId: tim.id,
                category: "persetujuan",
                categoryLabel: "Persetujuan Dokumen",
                title: `Persetujuan Market Validation Report — ${tim.namaProyekInovasi}`,
                description: `Laporan Market Validation (MVP) tim ${tim.namaProyekInovasi} telah disusun dan menunggu persetujuan Promotor.`,
                teamId: tim.id,
                teamName: tim.namaProyekInovasi,
                link: `/tim/${tim.id}/market-validation`,
                statusBadge: { label: "Perlu Persetujuan", variant: "warning" },
                createdAt: mvReport.createdAt,
              });
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Role Divisi IC & Admin IC: Otorisasi Pengajuan Anggaran (RAB) & LPJ
  // ─────────────────────────────────────────────────────────────────────────────
  if (isGlobalManagement) {
    // a. Pengajuan Anggaran Pending ('diajukan')
    const pendingAnggaran = await db
      .select({
        id: anggaranPengajuan.id,
        fase: anggaranPengajuan.fase,
        nominalDiajukan: anggaranPengajuan.nominalDiajukan,
        tanggalPengajuan: anggaranPengajuan.tanggalPengajuan,
        timId: timInovator.id,
        timNama: timInovator.namaProyekInovasi,
      })
      .from(anggaranPengajuan)
      .innerJoin(timInovator, eq(anggaranPengajuan.timInovatorId, timInovator.id))
      .where(eq(anggaranPengajuan.status, "diajukan"))
      .orderBy(desc(anggaranPengajuan.tanggalPengajuan));

    for (const a of pendingAnggaran) {
      if (isDismissed("rab_authorization", a.id)) continue;

      tasksByCategory.otorisasi_anggaran.push({
        id: `anggaran_${a.id}`,
        taskType: "rab_authorization",
        entityId: a.id,
        category: "otorisasi_anggaran",
        categoryLabel: "Otorisasi Anggaran & LPJ",
        title: `Otorisasi RAB — ${a.timNama}`,
        description: `Pengajuan anggaran ${formatRupiah(a.nominalDiajukan)} (Fase ${a.fase.replace("_", " ")}) tim ${a.timNama} menunggu otorisasi Anda.`,
        teamId: a.timId,
        teamName: a.timNama,
        link: `/tim/${a.timId}/keuangan`,
        statusBadge: { label: "Diajukan", variant: "warning" },
        createdAt: a.tanggalPengajuan,
      });
    }

    // b. LPJ Pending Persetujuan ('dikirim' | 'terlambat')
    const pendingLpj = await db
      .select({
        id: lpj.id,
        status: lpj.status,
        tanggalKirim: lpj.tanggalKirim,
        timId: timInovator.id,
        timNama: timInovator.namaProyekInovasi,
      })
      .from(lpj)
      .innerJoin(anggaranPengajuan, eq(lpj.anggaranPengajuanId, anggaranPengajuan.id))
      .innerJoin(timInovator, eq(anggaranPengajuan.timInovatorId, timInovator.id))
      .where(inArray(lpj.status, ["dikirim", "terlambat"]))
      .orderBy(desc(lpj.tanggalKirim));

    for (const l of pendingLpj) {
      if (isDismissed("lpj_review", l.id)) continue;

      const isLate = l.status === "terlambat";
      tasksByCategory.otorisasi_anggaran.push({
        id: `lpj_${l.id}`,
        taskType: "lpj_review",
        entityId: l.id,
        category: "otorisasi_anggaran",
        categoryLabel: "Otorisasi Anggaran & LPJ",
        title: `Persetujuan LPJ — ${l.timNama}`,
        description: `Laporan Pertanggungjawaban (LPJ) tim ${l.timNama} ${isLate ? "terlambat dikirim dan " : ""}menunggu persetujuan.`,
        teamId: l.timId,
        teamName: l.timNama,
        link: `/tim/${l.timId}/keuangan`,
        statusBadge: {
          label: isLate ? "LPJ Terlambat" : "LPJ Dikirim",
          variant: isLate ? "destructive" : "warning",
        },
        createdAt: l.tanggalKirim,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Khusus Admin Innovation Center: Keputusan FMI & Durasi Tim
  // ─────────────────────────────────────────────────────────────────────────────
  if (isAdmin) {
    // a. Tim yang Market Validation Report sudah ada tapi FMI belum diinput
    const allTeams = await db.select().from(timInovator);

    for (const tim of allTeams) {
      if (!isDismissed("fmi_decision", tim.id)) {
        const [mvPlan] = await db
          .select()
          .from(marketValidationPlan)
          .where(eq(marketValidationPlan.timInovatorId, tim.id))
          .limit(1);

        if (mvPlan) {
          const [mvReport] = await db
            .select()
            .from(marketValidationReport)
            .where(eq(marketValidationReport.planId, mvPlan.id))
            .limit(1);

          if (mvReport) {
            const [fmi] = await db
              .select()
              .from(forumManajemenInovasi)
              .where(eq(forumManajemenInovasi.timInovatorId, tim.id))
              .limit(1);

            if (!fmi) {
              tasksByCategory.keputusan_fmi.push({
                id: `fmi_${tim.id}`,
                taskType: "fmi_decision",
                entityId: tim.id,
                category: "keputusan_fmi",
                categoryLabel: "Keputusan FMI",
                title: `Input Keputusan FMI — ${tim.namaProyekInovasi}`,
                description: `Tim ${tim.namaProyekInovasi} telah menyelesaikan Market Validation Report, namun keputusan Forum Manajemen Inovasi (FMI) belum diinput.`,
                teamId: tim.id,
                teamName: tim.namaProyekInovasi,
                link: `/tim/${tim.id}/governance`,
                statusBadge: { label: "FMI Belum Diinput", variant: "warning" },
                createdAt: mvReport.createdAt,
              });
            }
          }
        }
      }

      // b. Durasi Tim Aktif: Akan berakhir (<= 14 hari) ATAU sudah lewat waktu
      if (tim.status === "aktif" && tim.tanggalBerakhir && !isDismissed("durasi_tim", tim.id)) {
        const targetEnd = new Date(tim.tanggalBerakhir);
        const diffMs = targetEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          tasksByCategory.durasi_tim.push({
            id: `durasi_overdue_${tim.id}`,
            taskType: "durasi_tim",
            entityId: tim.id,
            category: "durasi_tim",
            categoryLabel: "Durasi Tim Inkubasi",
            title: `Masa Inkubasi Lewat Waktu — ${tim.namaProyekInovasi}`,
            description: `Masa inkubasi tim ${tim.namaProyekInovasi} telah berakhir ${Math.abs(diffDays)} hari lalu (${formatDateIndo(targetEnd)}), namun status tim masih "Aktif".`,
            teamId: tim.id,
            teamName: tim.namaProyekInovasi,
            link: `/tim/${tim.id}`,
            isOverdue: true,
            statusBadge: { label: "Sudah Lewat Waktu", variant: "destructive" },
            dueDate: targetEnd,
          });
        } else if (diffDays <= 14) {
          tasksByCategory.durasi_tim.push({
            id: `durasi_soon_${tim.id}`,
            taskType: "durasi_tim",
            entityId: tim.id,
            category: "durasi_tim",
            categoryLabel: "Durasi Tim Inkubasi",
            title: `Masa Inkubasi Akan Berakhir — ${tim.namaProyekInovasi}`,
            description: `Masa inkubasi tim ${tim.namaProyekInovasi} tersisa ${diffDays} hari lagi (target berakhir: ${formatDateIndo(targetEnd)}).`,
            teamId: tim.id,
            teamName: tim.namaProyekInovasi,
            link: `/tim/${tim.id}`,
            statusBadge: { label: `Sisa ${diffDays} Hari`, variant: "gold" },
            dueDate: targetEnd,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SEMUA Role: Kartu Kanban Ter-assign (Owner Anggota = User) Status != Done
  // ─────────────────────────────────────────────────────────────────────────────
  const userAnggotaRows = await db
    .select({
      anggotaId: anggotaTim.id,
      timId: anggotaTim.timInovatorId,
      timNama: timInovator.namaProyekInovasi,
    })
    .from(anggotaTim)
    .innerJoin(timInovator, eq(anggotaTim.timInovatorId, timInovator.id))
    .where(eq(anggotaTim.userId, user.id));

  if (userAnggotaRows.length > 0) {
    const anggotaIds = userAnggotaRows.map((a) => a.anggotaId);

    const assignedCards = await db
      .select({
        id: kanbanCard.id,
        judul: kanbanCard.judul,
        deskripsi: kanbanCard.deskripsi,
        statusKolom: kanbanCard.statusKolom,
        tahap: kanbanCard.tahap,
        tanggalSelesai: kanbanCard.tanggalSelesai,
        createdAt: kanbanCard.createdAt,
        timId: kanbanCard.timInovatorId,
      })
      .from(kanbanCard)
      .where(
        and(
          inArray(kanbanCard.ownerAnggotaId, anggotaIds),
          ne(kanbanCard.statusKolom, "Done")
        )
      )
      .orderBy(desc(kanbanCard.createdAt));

    const timNameMap = new Map(userAnggotaRows.map((a) => [a.timId, a.timNama]));

    for (const card of assignedCards) {
      if (isDismissed("kanban_card", card.id)) continue;

      const timNama = timNameMap.get(card.timId) || "Tim Inovator";
      const isOverdue = card.tanggalSelesai ? new Date(card.tanggalSelesai) < now : false;

      tasksByCategory.kanban.push({
        id: `kanban_${card.id}`,
        taskType: "kanban_card",
        entityId: card.id,
        category: "kanban",
        categoryLabel: "Kartu Board Sprint Saya",
        title: card.judul,
        description: `Tugas di tim ${timNama} • Kolom: ${card.statusKolom}${card.tahap ? ` • Tahap: ${card.tahap.replace("_", " ")}` : ""}`,
        teamId: card.timId,
        teamName: timNama,
        link: `/tim/${card.timId}/kanban`,
        dueDate: card.tanggalSelesai ? new Date(card.tanggalSelesai) : null,
        isOverdue,
        statusBadge: isOverdue
          ? { label: "Terlambat", variant: "destructive" }
          : { label: card.statusKolom, variant: "secondary" },
        createdAt: card.createdAt,
      });
    }
  }

  const allTasks = [
    ...tasksByCategory.persetujuan,
    ...tasksByCategory.otorisasi_anggaran,
    ...tasksByCategory.keputusan_fmi,
    ...tasksByCategory.durasi_tim,
    ...tasksByCategory.kanban,
  ];

  return {
    totalCount: allTasks.length,
    tasksByCategory,
    allTasks,
  };
}
