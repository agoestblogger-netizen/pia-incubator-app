'use server';

import { db } from '@/lib/db';
import {
  timInovator,
  anggotaTim,
  durasiLog,
  dossierPiaArchive,
  charter,
  kanbanColumn,
  kanbanCard,
  sprint,
  sprintLog,
  customerValidationPlan,
  customerValidationDimensiFeedback,
  rencanaValidasiMetrik,
  customerValidationReport,
  customerTestingFeedbackResponden,
  customerValidationTemuanKualitatif,
  hasilValidasiMetrik,
  marketValidationPlan,
  mvpMappingFitur,
  mvpResourcesNeeded,
  marketValidationReport,
  mvReleaseLog,
  mvSprintReviewOutcome,
  mvSprintReviewBacklog,
  mvSprintRetrospective,
  dfvRekapitulasi,
  anggaranPengajuan,
  lpj,
  forumManajemenInovasi,
  penghargaan,
  userRoleTim,
  auditLogs,
} from '@/lib/db/schema';
import { inArray, eq, sql, isNotNull, and } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';

export interface ResetCountSummary {
  timCount: number;
  charterCount: number;
  kanbanCardCount: number;
  sprintCount: number;
  sprintLogCount: number;
  custValCount: number;
  marketValCount: number;
  keuanganCount: number;
  governanceCount: number;
  dossierCount: number;
  roleTimCount: number;
}

export interface ResetParams {
  mode: 'total' | 'section';
  teamScope: 'all' | 'selected';
  selectedTeamIds?: string[];
  selectedSections?: string[]; // 'tim_profil' | 'charter' | 'kanban' | 'customer_validation' | 'market_validation' | 'keuangan' | 'governance' | 'dossier'
  confirmationWord?: string;
}

export async function getResetPreview(params: {
  mode: 'total' | 'section';
  teamScope: 'all' | 'selected';
  selectedTeamIds?: string[];
  selectedSections?: string[];
}): Promise<{ success: boolean; message?: string; counts: ResetCountSummary; teams: { id: string; nama: string; status: string }[] }> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'system.reset_data'))) {
    return {
      success: false,
      message: 'Akses ditolak. Anda tidak memiliki izin reset data.',
      counts: {
        timCount: 0,
        charterCount: 0,
        kanbanCardCount: 0,
        sprintCount: 0,
        sprintLogCount: 0,
        custValCount: 0,
        marketValCount: 0,
        keuanganCount: 0,
        governanceCount: 0,
        dossierCount: 0,
        roleTimCount: 0,
      },
      teams: [],
    };
  }

  // Fetch all teams for selection
  const allTeams = await db.select({
    id: timInovator.id,
    nama: timInovator.namaProyekInovasi,
    status: timInovator.status,
  }).from(timInovator);

  let targetTeamIds: string[] = [];
  if (params.mode === 'total' || params.teamScope === 'all') {
    targetTeamIds = allTeams.map(t => t.id);
  } else {
    targetTeamIds = params.selectedTeamIds || [];
  }

  if (targetTeamIds.length === 0 && params.mode === 'section' && params.teamScope === 'selected') {
    return {
      success: true,
      counts: {
        timCount: 0,
        charterCount: 0,
        kanbanCardCount: 0,
        sprintCount: 0,
        sprintLogCount: 0,
        custValCount: 0,
        marketValCount: 0,
        keuanganCount: 0,
        governanceCount: 0,
        dossierCount: 0,
        roleTimCount: 0,
      },
      teams: allTeams,
    };
  }

  const sections = params.mode === 'total'
    ? ['tim_profil', 'charter', 'kanban', 'customer_validation', 'market_validation', 'keuangan', 'governance', 'dossier']
    : (params.selectedSections || []);

  const counts: ResetCountSummary = {
    timCount: 0,
    charterCount: 0,
    kanbanCardCount: 0,
    sprintCount: 0,
    sprintLogCount: 0,
    custValCount: 0,
    marketValCount: 0,
    keuanganCount: 0,
    governanceCount: 0,
    dossierCount: 0,
    roleTimCount: 0,
  };

  if (targetTeamIds.length > 0) {
    if (sections.includes('tim_profil') || params.mode === 'total') {
      counts.timCount = targetTeamIds.length;
      const roleTim = await db
        .select()
        .from(userRoleTim)
        .where(
          and(
            isNotNull(userRoleTim.timInovatorId),
            inArray(userRoleTim.timInovatorId, targetTeamIds)
          )
        );
      counts.roleTimCount = roleTim.length;
    }

    if (sections.includes('charter') || sections.includes('tim_profil') || params.mode === 'total') {
      const charters = await db.select().from(charter).where(inArray(charter.timInovatorId, targetTeamIds));
      counts.charterCount = charters.length;
    }

    if (sections.includes('kanban') || sections.includes('tim_profil') || params.mode === 'total') {
      const cards = await db.select().from(kanbanCard).where(inArray(kanbanCard.timInovatorId, targetTeamIds));
      counts.kanbanCardCount = cards.length;

      const sprints = await db.select().from(sprint).where(inArray(sprint.timInovatorId, targetTeamIds));
      counts.sprintCount = sprints.length;

      const sprintLogs = await db.select().from(sprintLog).where(inArray(sprintLog.timInovatorId, targetTeamIds));
      counts.sprintLogCount = sprintLogs.length;
    }

    if (sections.includes('customer_validation') || sections.includes('tim_profil') || params.mode === 'total') {
      const cvPlans = await db.select().from(customerValidationPlan).where(inArray(customerValidationPlan.timInovatorId, targetTeamIds));
      counts.custValCount = cvPlans.length;
    }

    if (sections.includes('market_validation') || sections.includes('tim_profil') || params.mode === 'total') {
      const mvPlans = await db.select().from(marketValidationPlan).where(inArray(marketValidationPlan.timInovatorId, targetTeamIds));
      counts.marketValCount = mvPlans.length;
    }

    if (sections.includes('keuangan') || sections.includes('tim_profil') || params.mode === 'total') {
      const angs = await db.select().from(anggaranPengajuan).where(inArray(anggaranPengajuan.timInovatorId, targetTeamIds));
      counts.keuanganCount = angs.length;
    }

    if (sections.includes('governance') || sections.includes('tim_profil') || params.mode === 'total') {
      const fmi = await db.select().from(forumManajemenInovasi).where(inArray(forumManajemenInovasi.timInovatorId, targetTeamIds));
      const ph = await db.select().from(penghargaan).where(inArray(penghargaan.timInovatorId, targetTeamIds));
      counts.governanceCount = fmi.length + ph.length;
    }

    if (sections.includes('dossier') || params.mode === 'total') {
      const dossiers = await db.select().from(dossierPiaArchive).where(inArray(dossierPiaArchive.timInovatorId, targetTeamIds));
      counts.dossierCount = dossiers.length;
    }
  }

  return {
    success: true,
    counts,
    teams: allTeams,
  };
}

export async function executeResetData(params: ResetParams): Promise<{
  success: boolean;
  message: string;
  deletedCounts?: ResetCountSummary;
}> {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'system.reset_data'))) {
    return { success: false, message: 'Akses ditolak. Anda tidak memiliki izin untuk mereset data.' };
  }

  if (params.confirmationWord !== 'HAPUS PERMANEN') {
    return { success: false, message: 'Kata konfirmasi salah. Anda harus mengetik persis "HAPUS PERMANEN".' };
  }

  const allTeams = await db.select({ id: timInovator.id, nama: timInovator.namaProyekInovasi }).from(timInovator);
  let targetTeamIds: string[] = [];

  if (params.mode === 'total' || params.teamScope === 'all') {
    targetTeamIds = allTeams.map(t => t.id);
  } else {
    targetTeamIds = params.selectedTeamIds || [];
  }

  if (targetTeamIds.length === 0) {
    return { success: false, message: 'Tidak ada tim yang dipilih untuk direset.' };
  }

  const sections = params.mode === 'total'
    ? ['tim_profil', 'charter', 'kanban', 'customer_validation', 'market_validation', 'keuangan', 'governance', 'dossier']
    : (params.selectedSections || []);

  if (sections.length === 0) {
    return { success: false, message: 'Pilih minimal satu section yang ingin direset.' };
  }

  const deletedCounts: ResetCountSummary = {
    timCount: 0,
    charterCount: 0,
    kanbanCardCount: 0,
    sprintCount: 0,
    sprintLogCount: 0,
    custValCount: 0,
    marketValCount: 0,
    keuanganCount: 0,
    governanceCount: 0,
    dossierCount: 0,
    roleTimCount: 0,
  };

  try {
    // 1. Dossier (if explicitly selected or total mode)
    if (sections.includes('dossier') || params.mode === 'total') {
      const res = await db.delete(dossierPiaArchive).where(inArray(dossierPiaArchive.timInovatorId, targetTeamIds)).returning();
      deletedCounts.dossierCount = res.length;
    }

    // 2. Governance (FMI & Penghargaan)
    if (sections.includes('governance') || sections.includes('tim_profil') || params.mode === 'total') {
      const fmiRes = await db.delete(forumManajemenInovasi).where(inArray(forumManajemenInovasi.timInovatorId, targetTeamIds)).returning();
      const phRes = await db.delete(penghargaan).where(inArray(penghargaan.timInovatorId, targetTeamIds)).returning();
      deletedCounts.governanceCount = fmiRes.length + phRes.length;
    }

    // 3. Keuangan (LPJ & Anggaran)
    if (sections.includes('keuangan') || sections.includes('tim_profil') || params.mode === 'total') {
      const angs = await db.select({ id: anggaranPengajuan.id }).from(anggaranPengajuan).where(inArray(anggaranPengajuan.timInovatorId, targetTeamIds));
      const angIds = angs.map(a => a.id);
      if (angIds.length > 0) {
        await db.delete(lpj).where(inArray(lpj.anggaranPengajuanId, angIds));
        const angRes = await db.delete(anggaranPengajuan).where(inArray(anggaranPengajuan.id, angIds)).returning();
        deletedCounts.keuanganCount = angRes.length;
      }
    }

    // 4. Market Validation (Plans, Reports, Metrics, Sprints, Resources, Fitur)
    if (sections.includes('market_validation') || sections.includes('tim_profil') || params.mode === 'total') {
      const mvPlans = await db.select({ id: marketValidationPlan.id }).from(marketValidationPlan).where(inArray(marketValidationPlan.timInovatorId, targetTeamIds));
      const mvPlanIds = mvPlans.map(p => p.id);
      if (mvPlanIds.length > 0) {
        const mvReports = await db.select({ id: marketValidationReport.id }).from(marketValidationReport).where(inArray(marketValidationReport.planId, mvPlanIds));
        const mvReportIds = mvReports.map(r => r.id);

        if (mvReportIds.length > 0) {
          await db.delete(mvReleaseLog).where(inArray(mvReleaseLog.reportId, mvReportIds));
          await db.delete(mvSprintReviewOutcome).where(inArray(mvSprintReviewOutcome.reportId, mvReportIds));
          await db.delete(mvSprintReviewBacklog).where(inArray(mvSprintReviewBacklog.reportId, mvReportIds));
          await db.delete(mvSprintRetrospective).where(inArray(mvSprintRetrospective.reportId, mvReportIds));
          await db.delete(dfvRekapitulasi).where(inArray(dfvRekapitulasi.reportId, mvReportIds));
          await db.delete(hasilValidasiMetrik).where(inArray(hasilValidasiMetrik.reportId, mvReportIds));
          await db.delete(marketValidationReport).where(inArray(marketValidationReport.id, mvReportIds));
        }

        await db.delete(mvpMappingFitur).where(inArray(mvpMappingFitur.planId, mvPlanIds));
        await db.delete(mvpResourcesNeeded).where(inArray(mvpResourcesNeeded.planId, mvPlanIds));
        await db.delete(rencanaValidasiMetrik).where(inArray(rencanaValidasiMetrik.planId, mvPlanIds));
        const planRes = await db.delete(marketValidationPlan).where(inArray(marketValidationPlan.id, mvPlanIds)).returning();
        deletedCounts.marketValCount = planRes.length;
      }
    }

    // 5. Customer Validation (Plans, Reports, Feedback, Temuan, Metrics)
    if (sections.includes('customer_validation') || sections.includes('tim_profil') || params.mode === 'total') {
      const cvPlans = await db.select({ id: customerValidationPlan.id }).from(customerValidationPlan).where(inArray(customerValidationPlan.timInovatorId, targetTeamIds));
      const cvPlanIds = cvPlans.map(p => p.id);
      if (cvPlanIds.length > 0) {
        const cvReports = await db.select({ id: customerValidationReport.id }).from(customerValidationReport).where(inArray(customerValidationReport.planId, cvPlanIds));
        const cvReportIds = cvReports.map(r => r.id);

        if (cvReportIds.length > 0) {
          await db.delete(customerTestingFeedbackResponden).where(inArray(customerTestingFeedbackResponden.reportId, cvReportIds));
          await db.delete(customerValidationTemuanKualitatif).where(inArray(customerValidationTemuanKualitatif.reportId, cvReportIds));
          await db.delete(hasilValidasiMetrik).where(inArray(hasilValidasiMetrik.reportId, cvReportIds));
          await db.delete(customerValidationReport).where(inArray(customerValidationReport.id, cvReportIds));
        }

        await db.delete(customerValidationDimensiFeedback).where(inArray(customerValidationDimensiFeedback.planId, cvPlanIds));
        await db.delete(rencanaValidasiMetrik).where(inArray(rencanaValidasiMetrik.planId, cvPlanIds));
        const planRes = await db.delete(customerValidationPlan).where(inArray(customerValidationPlan.id, cvPlanIds)).returning();
        deletedCounts.custValCount = planRes.length;
      }
    }

    // 6. Kanban Board, Cards & Sprint Entities
    if (sections.includes('kanban') || sections.includes('tim_profil') || params.mode === 'total') {
      const cardRes = await db.delete(kanbanCard).where(inArray(kanbanCard.timInovatorId, targetTeamIds)).returning();
      await db.delete(kanbanColumn).where(inArray(kanbanColumn.timInovatorId, targetTeamIds));
      deletedCounts.kanbanCardCount = cardRes.length;

      const sprintLogRes = await db.delete(sprintLog).where(inArray(sprintLog.timInovatorId, targetTeamIds)).returning();
      deletedCounts.sprintLogCount = sprintLogRes.length;

      const sprintRes = await db.delete(sprint).where(inArray(sprint.timInovatorId, targetTeamIds)).returning();
      deletedCounts.sprintCount = sprintRes.length;
    }

    // 7. Charter
    if (sections.includes('charter') || sections.includes('tim_profil') || params.mode === 'total') {
      const charterRes = await db.delete(charter).where(inArray(charter.timInovatorId, targetTeamIds)).returning();
      deletedCounts.charterCount = charterRes.length;
    }

    // 8. Tim Inovator & Profil (Complete removal of team entity & members - NEVER touch global roles where timInovatorId is NULL)
    if (sections.includes('tim_profil') || params.mode === 'total') {
      const roleTimRes = await db
        .delete(userRoleTim)
        .where(
          and(
            isNotNull(userRoleTim.timInovatorId),
            inArray(userRoleTim.timInovatorId, targetTeamIds)
          )
        )
        .returning();
      deletedCounts.roleTimCount = roleTimRes.length;

      await db.delete(durasiLog).where(inArray(durasiLog.timInovatorId, targetTeamIds));
      await db.delete(anggotaTim).where(inArray(anggotaTim.timInovatorId, targetTeamIds));

      const timRes = await db.delete(timInovator).where(inArray(timInovator.id, targetTeamIds)).returning();
      deletedCounts.timCount = timRes.length;
    }

    // 9. AUDIT LOGGING (MANDATORY & PERMANENT)
    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.nama,
      action: 'DATA_RESET',
      entity: 'SYSTEM',
      details: {
        mode: params.mode,
        teamScope: params.teamScope,
        targetTeamCount: targetTeamIds.length,
        selectedSections: sections,
        deletedCounts,
        performedBy: `${user.nama} (${user.email})`,
        timestamp: new Date().toISOString(),
      },
    });

    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);

    return {
      success: true,
      message: `Proses reset berhasil. Sebanyak ${totalDeleted} entitas data berhasil dihapus permanen.`,
      deletedCounts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Terjadi kesalahan saat mengeksekusi reset: ${err.message}`,
    };
  }
}
