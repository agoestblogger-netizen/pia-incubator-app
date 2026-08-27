"use server";

import { db } from "@/lib/db";
import {
  timInovator,
  sprint,
  kanbanCard,
  kanbanSubtask,
  kanbanActivityLog,
  users,
  charter,
  customerValidationPlan,
  customerValidationReport,
  marketValidationPlan,
  marketValidationReport,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { detectCvBakuCardType } from "@/lib/utils/cv-cards";
import { detectMvBakuCardType, isMvMandatoryCard } from "@/lib/utils/mv-cards";
import { getTeamCapacityForSprint, MemberCapacityInfo } from "@/app/actions/capacity";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";

export interface TeamDashboardActivityItem {
  id: string;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  cardJudul: string;
  userName: string;
  userAvatarUrl: string | null;
  createdAt: Date;
}

export interface TeamDashboardPhaseGateBadge {
  phaseKey: "innovation_setup" | "customer_validation" | "market_validation";
  phaseName: string;
  statusText: string;
  variant: "success" | "warning" | "info" | "neutral";
  description: string;
}

export interface TeamDashboardData {
  timId: string;
  namaTim: string;
  kategoriPia: string;
  klasifikasiInovasi: string;
  statusTim: string;

  // 1. Ringkasan 4-Angka
  activeSprintNumber: number | null;
  activeSprintText: string;
  activeSprintGoal: string | null;
  cardsCompletedInActiveSprint: number;
  totalCardsInActiveSprint: number;
  mandatoryCardsPendingCount: number;
  approachingDeadlineCardsCount: number;

  // 2. Distribusi Kartu Sprint Aktif
  cardDistribution: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };

  // 3. Kapasitas Tim (Sprint Aktif)
  teamCapacity: MemberCapacityInfo[];

  // 4. Aktivitas Terbaru
  recentActivities: TeamDashboardActivityItem[];

  // 5. Status Gerbang Fase
  phaseGateBadges: TeamDashboardPhaseGateBadge[];
}

export async function getTimDashboardDataAction(
  timId: string
): Promise<{ success: boolean; data?: TeamDashboardData; error?: string }> {
  try {
    const [tim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    if (!tim) {
      return { success: false, error: "Tim tidak ditemukan." };
    }

    // 1. Query Sprint Aktif
    const [activeSprintRow] = await db
      .select()
      .from(sprint)
      .where(and(eq(sprint.timInovatorId, timId), eq(sprint.status, "aktif")))
      .limit(1);

    const activeSprintNum = activeSprintRow ? activeSprintRow.nomorSprint : null;

    // 2. Query Kartu di Sprint Aktif (jika ada)
    let sprintCards: (typeof kanbanCard.$inferSelect)[] = [];
    if (activeSprintNum !== null) {
      sprintCards = await db
        .select()
        .from(kanbanCard)
        .where(
          and(
            eq(kanbanCard.timInovatorId, timId),
            eq(kanbanCard.sprintNumber, activeSprintNum)
          )
        );
    }

    const totalCardsInActiveSprint = sprintCards.length;
    const cardsCompletedInActiveSprint = sprintCards.filter(
      (c) => c.statusKolom === "done"
    ).length;

    const cardDistribution = {
      todo: sprintCards.filter((c) => c.statusKolom === "todo" || !c.statusKolom).length,
      in_progress: sprintCards.filter((c) => c.statusKolom === "in_progress").length,
      review: sprintCards.filter((c) => c.statusKolom === "review").length,
      done: sprintCards.filter((c) => c.statusKolom === "done").length,
    };

    // 3. Query Seluruh Kartu Tim untuk Kartu Wajib & Tenggat Mendekat
    const allTeamCards = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId));

    // A. Kartu Wajib Belum Selesai (CV + MV)
    const mandatoryCards = allTeamCards.filter((c) => {
      const isBakuCv =
        detectCvBakuCardType(c.judul, c.tahap || undefined) !== null ||
        c.label === "Template Baku CV";
      const isMandatoryMv = isMvMandatoryCard(c.judul, c.tahap || undefined);
      return isBakuCv || isMandatoryMv;
    });

    const cardIds = mandatoryCards.map((c) => c.id);
    let mandatoryCardsPendingCount = 0;

    if (cardIds.length > 0) {
      const allSubtasks = await db
        .select()
        .from(kanbanSubtask)
        .where(
          and(
            sql`${kanbanSubtask.taskId} IN (${sql.join(
              cardIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        );

      for (const card of mandatoryCards) {
        const cardSubtasks = allSubtasks.filter((s) => s.taskId === card.id);
        const mandatorySubtasks = cardSubtasks.filter(
          (s) =>
            s.subtaskType === "mandatory_simple" ||
            s.subtaskType === "mandatory_complex" ||
            s.reportFieldMapping !== null
        );

        // Jika kartu ber-badge wajib tapi subtask wajibnya belum ada atau belum semua done -> pending
        if (mandatorySubtasks.length === 0) {
          mandatoryCardsPendingCount++;
        } else {
          const hasIncompleteMandatorySubtask = mandatorySubtasks.some((ms) => !ms.isDone);
          if (hasIncompleteMandatorySubtask) {
            mandatoryCardsPendingCount++;
          }
        }
      }
    }

    // B. Tenggat Mendekat (target_selesai dalam 3 hari ke depan atau sudah lewat dan belum done)
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    const approachingDeadlineCards = allTeamCards.filter((c) => {
      if (c.statusKolom === "done") return false;
      if (!c.tanggalSelesai) return false;
      const targetDate = new Date(c.tanggalSelesai);
      // Sudah lewat ATAU jatuh tempo dalam 3 hari ke depan
      return targetDate <= threeDaysLater;
    });

    const approachingDeadlineCardsCount = approachingDeadlineCards.length;

    // 4. Kapasitas Tim (Sprint Aktif)
    let teamCapacity: MemberCapacityInfo[] = [];
    if (activeSprintNum !== null) {
      teamCapacity = await getTeamCapacityForSprint(timId, activeSprintNum);
    } else {
      // Jika belum ada sprint aktif, ambil sprint 1 sebagai fallback view kapasitas
      teamCapacity = await getTeamCapacityForSprint(timId, 1);
    }

    // 5. Query 5 Aktivitas Terbaru
    const recentActivitiesRaw = await db
      .select({
        id: kanbanActivityLog.id,
        actionType: kanbanActivityLog.actionType,
        fieldName: kanbanActivityLog.fieldName,
        oldValue: kanbanActivityLog.oldValue,
        newValue: kanbanActivityLog.newValue,
        createdAt: kanbanActivityLog.createdAt,
        cardJudul: kanbanCard.judul,
        userName: users.nama,
        userAvatarUrl: users.avatarUrl,
      })
      .from(kanbanActivityLog)
      .innerJoin(kanbanCard, eq(kanbanCard.id, kanbanActivityLog.taskId))
      .leftJoin(users, eq(users.id, kanbanActivityLog.userId))
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(desc(kanbanActivityLog.createdAt))
      .limit(5);

    const recentActivities: TeamDashboardActivityItem[] = recentActivitiesRaw.map(
      (item) => ({
        id: item.id,
        actionType: item.actionType,
        fieldName: item.fieldName,
        oldValue: item.oldValue,
        newValue: item.newValue,
        cardJudul: item.cardJudul,
        userName: item.userName || "Pengguna",
        userAvatarUrl: item.userAvatarUrl,
        createdAt: item.createdAt,
      })
    );

    // 6. Status Gerbang Fase (Phase Gate Badges)
    const phaseGateStatus = await getTeamPhaseGateStatus(timId);

    const [charterRow] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    const charterApproval = charterRow?.ttdDisetujui as any;
    const isCharterApproved = Boolean(
      charterApproval && (charterApproval.disetujui === true || charterApproval.status === "approved")
    );

    const [cvPlan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    let cvStatusText = "Belum Terbuka";
    let cvVariant: TeamDashboardPhaseGateBadge["variant"] = "neutral";
    let cvDesc = "Menunggu persetujuan Innovation Charter";

    if (phaseGateStatus.gates.customerValidation.unlocked) {
      if (cvPlan) {
        const [cvReport] = await db
          .select()
          .from(customerValidationReport)
          .where(eq(customerValidationReport.planId, cvPlan.id))
          .limit(1);

        if (cvReport && cvReport.keputusan) {
          const kep = cvReport.keputusan.toLowerCase();
          if (kep.includes("lanjut") || kep === "lanjut") {
            cvStatusText = "Lanjut ke MV";
            cvVariant = "success";
            cvDesc = "Keputusan lolos menuju Market Validation";
          } else if (kep.includes("iterasi") || kep === "iterasi") {
            cvStatusText = "Iterasi Solusi";
            cvVariant = "warning";
            cvDesc = "Perlu perbaikan/iterasi rancangan solusi";
          } else if (kep.includes("hold") || kep === "hold") {
            cvStatusText = "Hold / Tunda";
            cvVariant = "warning";
            cvDesc = "Proyek ditunda sementara";
          } else if (kep.includes("stop") || kep === "stop") {
            cvStatusText = "Stop";
            cvVariant = "neutral";
            cvDesc = "Proyek dihentikan pada fase Customer Validation";
          } else {
            cvStatusText = "Sedang Berjalan";
            cvVariant = "info";
            cvDesc = "Uji coba dan wawancara responden sedang berlangsung";
          }
        } else {
          cvStatusText = "Sedang Berjalan";
          cvVariant = "info";
          cvDesc = "Fase aktif: pengujian prototype dan pencatatan responden";
        }
      } else {
        cvStatusText = "Sedang Berjalan";
        cvVariant = "info";
        cvDesc = "Fase aktif: pengujian prototype dan pencatatan responden";
      }
    }

    const [mvPlan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    let mvStatusText = "Belum Terbuka";
    let mvVariant: TeamDashboardPhaseGateBadge["variant"] = "neutral";
    let mvDesc = "Menunggu kelolosan Customer Validation";

    if (phaseGateStatus.gates.marketValidation.unlocked) {
      if (mvPlan) {
        const [mvReport] = await db
          .select()
          .from(marketValidationReport)
          .where(eq(marketValidationReport.planId, mvPlan.id))
          .limit(1);

        if (mvReport && mvReport.keputusanGoNogo) {
          const kep = mvReport.keputusanGoNogo.toLowerCase();
          if (kep.includes("go") || kep === "go_ke_fmi") {
            mvStatusText = "Go ke FMI";
            mvVariant = "success";
            mvDesc = "Lolos ke Forum Manajemen Inovasi / Sidang Direksi";
          } else if (kep.includes("iterasi") || kep === "iterasi_mvp") {
            mvStatusText = "Iterasi MVP";
            mvVariant = "warning";
            mvDesc = "Iterasi MVP & lanjutkan pilot uji coba";
          } else if (kep.includes("hold") || kep === "hold") {
            mvStatusText = "Hold / Tunda";
            mvVariant = "warning";
            mvDesc = "Proyek ditunda sementara";
          } else if (kep.includes("stop") || kep === "stop") {
            mvStatusText = "Stop";
            mvVariant = "neutral";
            mvDesc = "Proyek dihentikan pada fase Market Validation";
          } else {
            mvStatusText = "Sedang Berjalan";
            mvVariant = "info";
            mvDesc = "Pilot rilis MVP & pengukuran traksi pasar (DFV)";
          }
        } else {
          mvStatusText = "Sedang Berjalan";
          mvVariant = "info";
          mvDesc = "Pilot rilis MVP & pengukuran traksi pasar (DFV)";
        }
      } else {
        mvStatusText = "Sedang Berjalan";
        mvVariant = "info";
        mvDesc = "Pilot rilis MVP & pengukuran traksi pasar (DFV)";
      }
    }

    const phaseGateBadges: TeamDashboardPhaseGateBadge[] = [
      {
        phaseKey: "innovation_setup",
        phaseName: "Innovation Setup",
        statusText: isCharterApproved
          ? "Disetujui"
          : phaseGateStatus.gates.innovationSetup.isFilled
          ? "Menunggu Persetujuan"
          : "Draft",
        variant: isCharterApproved ? "success" : "warning",
        description: isCharterApproved
          ? "Charter telah ditandatangani Promotor"
          : "Charter dalam penyusunan / menunggu TTD Promotor",
      },
      {
        phaseKey: "customer_validation",
        phaseName: "Customer Validation",
        statusText: cvStatusText,
        variant: cvVariant,
        description: cvDesc,
      },
      {
        phaseKey: "market_validation",
        phaseName: "Market Validation",
        statusText: mvStatusText,
        variant: mvVariant,
        description: mvDesc,
      },
    ];

    return {
      success: true,
      data: {
        timId: tim.id,
        namaTim: tim.namaProyekInovasi,
        kategoriPia: tim.kategoriPia,
        klasifikasiInovasi: tim.klasifikasiInovasi || "Gold",
        statusTim: tim.status,

        activeSprintNumber: activeSprintNum,
        activeSprintText: activeSprintNum !== null ? `Sprint ${activeSprintNum}` : "Belum ada",
        activeSprintGoal: activeSprintRow?.sprintGoal || null,
        cardsCompletedInActiveSprint,
        totalCardsInActiveSprint,
        mandatoryCardsPendingCount,
        approachingDeadlineCardsCount,

        cardDistribution,
        teamCapacity,
        recentActivities,
        phaseGateBadges,
      },
    };
  } catch (error: any) {
    console.error("[getTimDashboardDataAction] Error:", error);
    return {
      success: false,
      error: error.message || "Gagal memuat data dashboard tim.",
    };
  }
}
