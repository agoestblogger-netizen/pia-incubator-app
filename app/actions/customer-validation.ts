"use server";

import { db } from "@/lib/db";
import { customerValidationPlan, customerValidationReport, rencanaValidasiMetrik, hasilValidasiMetrik, customerValidationDimensiFeedback } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";


export async function getCustomerValidationData(timId: string) {
  const [plan] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
  let report = null;
  let metrikRencana: any[] = [];
  let metrikHasil: any[] = [];
  let dimensiFeedback: any[] = [];

  if (plan) {
    [report] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, plan.id)).limit(1);
    metrikRencana = await db.select().from(rencanaValidasiMetrik).where(eq(rencanaValidasiMetrik.planId, plan.id));
    dimensiFeedback = await db.select().from(customerValidationDimensiFeedback).where(eq(customerValidationDimensiFeedback.planId, plan.id));
  }

  if (report) {
    metrikHasil = await db.select().from(hasilValidasiMetrik).where(eq(hasilValidasiMetrik.reportId, report.id));
  }

  return { plan, report, metrikRencana, metrikHasil, dimensiFeedback };
}


export async function saveCustomerValidationPlanAction(timId: string, values: Partial<typeof customerValidationPlan.$inferInsert>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Customer Validation Plan tim ini.',
      };
    }

    const [existing] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
    let planId = existing?.id;

    if (existing) {
      await db.update(customerValidationPlan).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(customerValidationPlan.id, existing.id));
    } else {
      const [inserted] = await db.insert(customerValidationPlan).values({
        timInovatorId: timId,
        ...values,
      }).returning();
      planId = inserted.id;
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CUST_VAL_PLAN_SAVE',
      entity: 'customer_validation_plan',
      entityId: planId,
      details: { timId, prototypeType: values.prototypeType },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan rencana validasi pelanggan.' };
  }
}

export async function saveCustomerValidationReportAction(planId: string, timId: string, values: Partial<typeof customerValidationReport.$inferInsert>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Customer Validation Report tim ini.',
      };
    }

    const [existing] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, planId)).limit(1);
    let reportId = existing?.id;

    if (existing) {
      await db.update(customerValidationReport).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(customerValidationReport.id, existing.id));
    } else {
      const [inserted] = await db.insert(customerValidationReport).values({
        planId,
        ...values,
      }).returning();
      reportId = inserted.id;
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CUST_VAL_REPORT_SAVE',
      entity: 'customer_validation_report',
      entityId: reportId,
      details: { timId, planId, ketercapaianPsf: values.ketercapaianPsf, keputusan: values.keputusan },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan laporan validasi pelanggan.' };
  }
}

const METRIK_ROWS_STATIC = [
  { validasi: 'desirability', metrik: 'Kepuasan Pengguna', unitUkuran: 'Skala 1-5', kriteriaKesuksesan: 'Rata-rata ≥4 atau target lain yang disepakati', caraPengukuran: 'Survey pasca-testing dan alasan verbal di balik skor' },
  { validasi: 'desirability', metrik: 'Ketertarikan Penggunaan Berulang', unitUkuran: 'Sering sekali/Sering/Kadang/Jarang/Tidak pernah', kriteriaKesuksesan: 'Mayoritas minimal "Sering" atau target lain yang disepakati', caraPengukuran: 'Survey/wawancara' },
  { validasi: 'desirability', metrik: 'Rekomendasi kepada Orang Lain', unitUkuran: 'Ya pasti/Mungkin/Tidak yakin/Mungkin tidak/Pasti tidak', kriteriaKesuksesan: 'Mayoritas minimal "Mungkin"', caraPengukuran: 'Survey/wawancara' },
  { validasi: 'desirability', metrik: 'Kejelasan dan Kemudahan Penggunaan', unitUkuran: 'Skala 1-5 atau Mudah sekali s.d. Sangat sulit', kriteriaKesuksesan: 'Rata-rata ≥4 atau mayoritas "Mudah"', caraPengukuran: 'Observasi dan survey' },
  { validasi: 'desirability', metrik: 'Kesediaan Membayar / Menggunakan', unitUkuran: 'Skala kesediaan', kriteriaKesuksesan: 'Mayoritas bersedia membayar/menggunakan sesuai konteks inovasi', caraPengukuran: 'Survey harga/value atau komitmen penggunaan' },
  { validasi: 'feasibility', metrik: 'Kelayakan teknis/operasional awal', unitUkuran: 'Skala 1-5 / catatan SME', kriteriaKesuksesan: 'Tidak ada blocker kritis sebelum MVP', caraPengukuran: 'Review awal IT/Operasional/SME' },
  { validasi: 'viability', metrik: 'Potensi dampak bisnis/ekonomi awal', unitUkuran: 'Estimasi Rp/%/skala 1-5', kriteriaKesuksesan: 'Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP', caraPengukuran: 'Estimasi dampak, cost-benefit awal, input Renstra/Finance' },
];

export async function saveCustomerValidationPlanFullAction(
  timId: string,
  planValues: Partial<typeof customerValidationPlan.$inferInsert>,
  dimensiEvidences: Record<string, string>,
  metrikCatatan: Record<string, string>,
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) return { success: false, error: 'Forbidden: Anda tidak memiliki izin.' };

    // Upsert main plan
    const [existing] = await db.select().from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
    let planId = existing?.id;

    if (existing) {
      await db.update(customerValidationPlan)
        .set({ ...planValues, updatedAt: new Date() })
        .where(eq(customerValidationPlan.id, existing.id));
    } else {
      const [inserted] = await db.insert(customerValidationPlan)
        .values({ timInovatorId: timId, ...planValues }).returning();
      planId = inserted.id;
    }

    if (!planId) return { success: false, error: 'Gagal mendapatkan plan ID.' };

    // Upsert dimensi feedback (5 baris tetap)
    for (const [dimensi, evidence] of Object.entries(dimensiEvidences)) {
      const [existingRow] = await db.select().from(customerValidationDimensiFeedback)
        .where(and(
          eq(customerValidationDimensiFeedback.planId, planId),
          eq(customerValidationDimensiFeedback.dimensi, dimensi)
        )).limit(1);

      if (existingRow) {
        await db.update(customerValidationDimensiFeedback)
          .set({ evidenceYangDikumpulkan: evidence, updatedAt: new Date() })
          .where(eq(customerValidationDimensiFeedback.id, existingRow.id));
      } else {
        await db.insert(customerValidationDimensiFeedback)
          .values({ planId, dimensi, evidenceYangDikumpulkan: evidence });
      }
    }

    // Seed & update metrik rencana (7 baris tetap)
    const existingMetrik = await db.select().from(rencanaValidasiMetrik)
      .where(eq(rencanaValidasiMetrik.planId, planId));
    const existingMetrikByKey = new Map(existingMetrik.map((m) => [m.metrik, m]));

    for (const row of METRIK_ROWS_STATIC) {
      const catatan = metrikCatatan[row.metrik] ?? null;
      const existingRow = existingMetrikByKey.get(row.metrik);
      if (existingRow) {
        await db.update(rencanaValidasiMetrik)
          .set({ catatan, updatedAt: new Date() })
          .where(eq(rencanaValidasiMetrik.id, existingRow.id));
      } else {
        await db.insert(rencanaValidasiMetrik).values({
          planId,
          fase: 'customer_validation',
          validasi: row.validasi,
          metrik: row.metrik,
          unitUkuran: row.unitUkuran,
          kriteriaKesuksesan: row.kriteriaKesuksesan,
          caraPengukuran: row.caraPengukuran,
          catatan,
        });
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CUST_VAL_PLAN_FULL_SAVE',
      entity: 'customer_validation_plan',
      entityId: planId,
      details: { timId },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true, planId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan rencana validasi pelanggan.' };
  }
}

