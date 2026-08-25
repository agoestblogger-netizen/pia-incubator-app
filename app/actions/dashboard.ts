"use server";

import { db } from "@/lib/db";
import {
  timInovator,
  charter,
  customerValidationPlan,
  customerValidationReport,
  marketValidationPlan,
  marketValidationReport,
  kanbanCard,
  sprint,
} from "@/lib/db/schema";
import { eq, and, ne, desc, inArray } from "drizzle-orm";
import { getCurrentUser, type UserProfile } from "@/lib/auth/rbac";
import { getTimInovatorList } from "./tim";

export type TeamDashboardMetrics = {
  tim: any;
  fase: {
    key: "belum_mulai" | "innovation_setup" | "sprint" | "selesai";
    label: string;
    stageNumber: number;
  };
  activeSprint: {
    nomorSprint: number;
    tujuan?: string | null;
    status: string;
    totalCards: number;
    doneCards: number;
    progressPercentage: number;
  } | null;
  activeCardsCount: number;
  overdueTasksCount: number;
  latestActivityText: string;
};

export type DashboardData = {
  teams: TeamDashboardMetrics[];
  aggregates: {
    totalTeams: number;
    totalBelumMulai: number;
    totalInnovationSetup: number;
    totalSprint: number;
    totalSelesai: number;
  };
};

function formatRelativeTime(date: Date | null): string {
  if (!date) return "-";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 5) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  return `${Math.floor(diffDays / 30)} bulan lalu`;
}

export async function getDashboardData(currentUser?: UserProfile | null): Promise<DashboardData> {
  const user = currentUser !== undefined ? currentUser : await getCurrentUser();
  const rawTeams = await getTimInovatorList(user);

  if (rawTeams.length === 0) {
    return {
      teams: [],
      aggregates: {
        totalTeams: 0,
        totalBelumMulai: 0,
        totalInnovationSetup: 0,
        totalSprint: 0,
        totalSelesai: 0,
      },
    };
  }

  const teamIds = rawTeams.map((t) => t.id);
  const now = new Date();

  // 1. Fetch all cards for these teams
  const allCards = await db
    .select()
    .from(kanbanCard)
    .where(inArray(kanbanCard.timInovatorId, teamIds));

  // 2. Fetch all sprints for these teams
  const allSprints = await db
    .select()
    .from(sprint)
    .where(inArray(sprint.timInovatorId, teamIds));

  // 3. Fetch phase documents to determine phase
  const allCharters = await db
    .select({
      timInovatorId: charter.timInovatorId,
      projectMission: charter.projectMission,
      problemWorthSolving: charter.problemWorthSolving,
      solusiAwal: charter.solusiAwal,
      ttdDisetujui: charter.ttdDisetujui,
      updatedAt: charter.updatedAt,
    })
    .from(charter)
    .where(inArray(charter.timInovatorId, teamIds));

  const allCustPlans = await db
    .select({ timInovatorId: customerValidationPlan.timInovatorId, updatedAt: customerValidationPlan.updatedAt })
    .from(customerValidationPlan)
    .where(inArray(customerValidationPlan.timInovatorId, teamIds));

  const allMarketPlans = await db
    .select({ timInovatorId: marketValidationPlan.timInovatorId, updatedAt: marketValidationPlan.updatedAt })
    .from(marketValidationPlan)
    .where(inArray(marketValidationPlan.timInovatorId, teamIds));

  const charterMap = new Map(allCharters.map((c) => [c.timInovatorId, c]));
  const custMap = new Map(allCustPlans.map((c) => [c.timInovatorId, c]));
  const marketMap = new Map(allMarketPlans.map((m) => [m.timInovatorId, m]));

  const teamCardsMap = new Map<string, typeof allCards>();
  for (const card of allCards) {
    const list = teamCardsMap.get(card.timInovatorId) || [];
    list.push(card);
    teamCardsMap.set(card.timInovatorId, list);
  }

  const teamSprintsMap = new Map<string, typeof allSprints>();
  for (const s of allSprints) {
    const list = teamSprintsMap.get(s.timInovatorId) || [];
    list.push(s);
    teamSprintsMap.set(s.timInovatorId, list);
  }

  let totalBelumMulai = 0;
  let totalInnovationSetup = 0;
  let totalSprint = 0;
  let totalSelesai = 0;

  const resultTeams: TeamDashboardMetrics[] = [];

  for (const tim of rawTeams) {
    const cards = teamCardsMap.get(tim.id) || [];
    const sprints = teamSprintsMap.get(tim.id) || [];
    const charterRow = charterMap.get(tim.id);

    // Check charter completeness
    const isCharterComplete = Boolean(
      charterRow &&
      (charterRow.projectMission || charterRow.problemWorthSolving || charterRow.ttdDisetujui)
    );

    // Sprints status analysis
    const hasSprints = sprints.length > 0;
    const allSprintsFinished = hasSprints && sprints.every((s) => s.status === "selesai");
    const hasActiveSprint = sprints.some((s) => s.status === "aktif");
    const hasStartedSprint = sprints.some((s) => s.status === "aktif" || s.status === "selesai");

    let faseInfo: TeamDashboardMetrics["fase"];

    // Evaluasi dari kondisi paling akhir (Selesai -> Sprint -> Innovation Setup -> Belum Mulai)
    if (allSprintsFinished) {
      // 1. Selesai (Semua sprint selesai)
      faseInfo = {
        key: "selesai",
        label: "Selesai",
        stageNumber: 4,
      };
      totalSelesai++;
    } else if (hasActiveSprint || (hasStartedSprint && !allSprintsFinished)) {
      // 2. Sprint (Sedang menjalankan sprint)
      faseInfo = {
        key: "sprint",
        label: "Sprint",
        stageNumber: 3,
      };
      totalSprint++;
    } else if (isCharterComplete) {
      // 3. Innovation Setup (Charter lengkap, belum mulai sprint)
      faseInfo = {
        key: "innovation_setup",
        label: "Innovation Setup",
        stageNumber: 1,
      };
      totalInnovationSetup++;
    } else {
      // 4. Belum Mulai (Default: Belum lengkap isi charter)
      faseInfo = {
        key: "belum_mulai",
        label: "Belum Mulai",
        stageNumber: 0,
      };
      totalBelumMulai++;
    }

    // Active Sprint & progress calculation
    const activeSprintRow = sprints.find((s) => s.status === "aktif");
    let activeSprintMetric: TeamDashboardMetrics["activeSprint"] = null;

    if (activeSprintRow) {
      const sprintCards = cards.filter(
        (c) => c.sprintNumber === activeSprintRow.nomorSprint
      );
      const totalSprintCards = sprintCards.length;
      const doneSprintCards = sprintCards.filter(
        (c) => c.statusKolom === "Done"
      ).length;
      const pct =
        totalSprintCards > 0
          ? Math.round((doneSprintCards / totalSprintCards) * 100)
          : 0;

      activeSprintMetric = {
        nomorSprint: activeSprintRow.nomorSprint,
        tujuan: activeSprintRow.tujuan,
        status: activeSprintRow.status,
        totalCards: totalSprintCards,
        doneCards: doneSprintCards,
        progressPercentage: pct,
      };
    }

    // Active (in-progress) cards count
    const activeCards = cards.filter((c) => c.statusKolom !== "Done");

    // Overdue cards count
    const overdueCards = cards.filter(
      (c) =>
        c.statusKolom !== "Done" &&
        c.tanggalSelesai &&
        new Date(c.tanggalSelesai) < now
    );

    // Latest activity determination
    const timestamps: Date[] = [];
    if (tim.updatedAt) timestamps.push(new Date(tim.updatedAt));
    if (charterMap.get(tim.id)?.updatedAt) timestamps.push(new Date(charterMap.get(tim.id)!.updatedAt));
    if (custMap.get(tim.id)?.updatedAt) timestamps.push(new Date(custMap.get(tim.id)!.updatedAt));
    if (marketMap.get(tim.id)?.updatedAt) timestamps.push(new Date(marketMap.get(tim.id)!.updatedAt));

    for (const c of cards) {
      if (c.updatedAt) timestamps.push(new Date(c.updatedAt));
    }

    let latestDate: Date | null = null;
    if (timestamps.length > 0) {
      latestDate = new Date(Math.max(...timestamps.map((d) => d.getTime())));
    }

    resultTeams.push({
      tim,
      fase: faseInfo,
      activeSprint: activeSprintMetric,
      activeCardsCount: activeCards.length,
      overdueTasksCount: overdueCards.length,
      latestActivityText: formatRelativeTime(latestDate),
    });
  }

  return {
    teams: resultTeams,
    aggregates: {
      totalTeams: rawTeams.length,
      totalBelumMulai,
      totalInnovationSetup,
      totalSprint,
      totalSelesai,
    },
  };
}
