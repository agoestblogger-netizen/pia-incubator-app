"use server";

import { db } from "@/lib/db";
import { marketValidationPlan, marketValidationReport, mvpMappingFitur, mvpResourcesNeeded, mvReleaseLog, dfvRekapitulasi } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export async function getMarketValidationData(timId: string) {
  const [plan] = await db.select().from(marketValidationPlan).where(eq(marketValidationPlan.timInovatorId, timId)).limit(1);
  let report = null;
  let fiturMapping: any[] = [];
  let resources: any[] = [];
  let releaseLogs: any[] = [];
  let dfv: any[] = [];

  if (plan) {
    [report] = await db.select().from(marketValidationReport).where(eq(marketValidationReport.planId, plan.id)).limit(1);
    fiturMapping = await db.select().from(mvpMappingFitur).where(eq(mvpMappingFitur.planId, plan.id));
    resources = await db.select().from(mvpResourcesNeeded).where(eq(mvpResourcesNeeded.planId, plan.id));
  }

  if (report) {
    releaseLogs = await db.select().from(mvReleaseLog).where(eq(mvReleaseLog.reportId, report.id));
    dfv = await db.select().from(dfvRekapitulasi).where(eq(dfvRekapitulasi.reportId, report.id));
  }

  return { plan, report, fiturMapping, resources, releaseLogs, dfv };
}

export async function saveMarketValidationPlanAction(timId: string, values: Partial<typeof marketValidationPlan.$inferInsert>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'market_val.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Market Validation Plan tim ini.',
      };
    }

    const [existing] = await db.select().from(marketValidationPlan).where(eq(marketValidationPlan.timInovatorId, timId)).limit(1);
    let planId = existing?.id;

    if (existing) {
      await db.update(marketValidationPlan).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(marketValidationPlan.id, existing.id));
    } else {
      const [inserted] = await db.insert(marketValidationPlan).values({
        timInovatorId: timId,
        ...values,
      }).returning();
      planId = inserted.id;
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'MARKET_VAL_PLAN_SAVE',
      entity: 'market_validation_plan',
      entityId: planId,
      details: { timId, mvpVersion: values.mvpVersion, lokasiPilot: values.lokasiPilot },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan rencana market validation.' };
  }
}

export async function saveMarketValidationReportAction(planId: string, timId: string, values: Partial<typeof marketValidationReport.$inferInsert>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'market_val.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Market Validation Report tim ini.',
      };
    }

    const [existing] = await db.select().from(marketValidationReport).where(eq(marketValidationReport.planId, planId)).limit(1);
    let reportId = existing?.id;

    if (existing) {
      await db.update(marketValidationReport).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(marketValidationReport.id, existing.id));
    } else {
      const [inserted] = await db.insert(marketValidationReport).values({
        planId,
        ...values,
      }).returning();
      reportId = inserted.id;
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'MARKET_VAL_REPORT_SAVE',
      entity: 'market_validation_report',
      entityId: reportId,
      details: { timId, planId, keputusanGoNogo: values.keputusanGoNogo },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan laporan market validation.' };
  }
}
