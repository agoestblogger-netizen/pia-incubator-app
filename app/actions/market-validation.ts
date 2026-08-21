"use server";

import { db } from "@/lib/db";
import { marketValidationPlan, marketValidationReport, mvpMappingFitur, mvpResourcesNeeded, mvReleaseLog, dfvRekapitulasi } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
    const [existing] = await db.select().from(marketValidationPlan).where(eq(marketValidationPlan.timInovatorId, timId)).limit(1);

    if (existing) {
      await db.update(marketValidationPlan).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(marketValidationPlan.id, existing.id));
    } else {
      await db.insert(marketValidationPlan).values({
        timInovatorId: timId,
        ...values,
      });
    }

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan rencana market validation.' };
  }
}

export async function saveMarketValidationReportAction(planId: string, timId: string, values: Partial<typeof marketValidationReport.$inferInsert>) {
  try {
    const [existing] = await db.select().from(marketValidationReport).where(eq(marketValidationReport.planId, planId)).limit(1);

    if (existing) {
      await db.update(marketValidationReport).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(marketValidationReport.id, existing.id));
    } else {
      await db.insert(marketValidationReport).values({
        planId,
        ...values,
      });
    }

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan laporan market validation.' };
  }
}
