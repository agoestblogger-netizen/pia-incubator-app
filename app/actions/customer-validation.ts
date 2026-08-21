"use server";

import { db } from "@/lib/db";
import { customerValidationPlan, customerValidationReport, rencanaValidasiMetrik, hasilValidasiMetrik } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCustomerValidationData(timId: string) {
  const [plan] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
  let report = null;
  let metrikRencana: any[] = [];
  let metrikHasil: any[] = [];

  if (plan) {
    [report] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, plan.id)).limit(1);
    metrikRencana = await db.select().from(rencanaValidasiMetrik).where(eq(rencanaValidasiMetrik.planId, plan.id));
  }

  if (report) {
    metrikHasil = await db.select().from(hasilValidasiMetrik).where(eq(hasilValidasiMetrik.reportId, report.id));
  }

  return { plan, report, metrikRencana, metrikHasil };
}

export async function saveCustomerValidationPlanAction(timId: string, values: Partial<typeof customerValidationPlan.$inferInsert>) {
  try {
    const [existing] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);

    if (existing) {
      await db.update(customerValidationPlan).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(customerValidationPlan.id, existing.id));
    } else {
      await db.insert(customerValidationPlan).values({
        timInovatorId: timId,
        ...values,
      });
    }

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan rencana validasi pelanggan.' };
  }
}

export async function saveCustomerValidationReportAction(planId: string, timId: string, values: Partial<typeof customerValidationReport.$inferInsert>) {
  try {
    const [existing] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, planId)).limit(1);

    if (existing) {
      await db.update(customerValidationReport).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(customerValidationReport.id, existing.id));
    } else {
      await db.insert(customerValidationReport).values({
        planId,
        ...values,
      });
    }

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan laporan validasi pelanggan.' };
  }
}
