"use server";

import { db } from "@/lib/db";
import {
  customerValidationPlan,
  customerValidationReport,
  rencanaValidasiMetrik,
  hasilValidasiMetrik,
  customerValidationDimensiFeedback,
  kanbanCard,
  kanbanSubtask,
  kanbanColumn,
  sprint,
  timInovator,
  charter,
} from "@/lib/db/schema";
import { eq, and, ne, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { generateAiBacklogFromCvPlan } from "@/lib/ai/cv-backlog-generator";


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

export async function generateCvBacklogAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) return { success: false, error: 'Forbidden: Anda tidak memiliki izin mengedit tim ini.' };

    const [plan] = await db.select().from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);

    if (!plan) {
      return {
        success: false,
        error: 'Form Perencanaan CV belum disimpan. Simpan form rencana validasi terlebih dahulu.',
      };
    }

    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);
    const namaProyek = tim?.namaProyekInovasi || 'Proyek Inovasi';

    const teamSprints = await db.select().from(sprint).where(eq(sprint.timInovatorId, timId));
    const totalSprints = Math.max(2, teamSprints.length || 4);

    // Call AI / Fallback Generator
    const generatedTasks = await generateAiBacklogFromCvPlan({
      teamId: timId,
      namaProyek,
      totalSprints,
      plan: {
        projectMission: plan.projectMission,
        customerDanContext: plan.customerDanContext,
        problemHypothesis: plan.problemHypothesis,
        hmw: plan.hmw,
        solutionHypothesis: plan.solutionHypothesis,
        prototypeType: plan.prototypeType,
        fiturAlurDiuji: plan.fiturAlurDiuji,
        skenarioUserTesting: plan.skenarioUserTesting,
        instrumenValidasi: plan.instrumenValidasi,
        targetEarlyAdopters: plan.targetEarlyAdopters,
        kriteriaSeleksi: plan.kriteriaSeleksi,
        jumlahTargetResponden: plan.jumlahTargetResponden,
        lokasiChannelTesting: plan.lokasiChannelTesting,
        metodeRekrutmen: plan.metodeRekrutmen,
        etikaPersetujuanData: plan.etikaPersetujuanData,
      },
    });

    if (!generatedTasks || generatedTasks.length === 0) {
      return { success: false, error: 'Gagal menghasilkan backlog dari AI.' };
    }

    // Clean up previous UNADOPTED AI-generated CV cards (do NOT delete adopted cards and do NOT delete Template Baku CV)
    const existingAiCvCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.tahap, 'customer_validation'),
          eq(kanbanCard.reviewStatus, 'ai_reference'),
          ne(kanbanCard.label, 'Template Baku CV')
        )
      );

    if (existingAiCvCards.length > 0) {
      const cardIdsToDelete = existingAiCvCards.map((c) => c.id);
      await db.delete(kanbanCard).where(inArray(kanbanCard.id, cardIdsToDelete));
    }

    // Get current max urutan for this team
    const [latestCard] = await db
      .select({ urutan: kanbanCard.urutan })
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(desc(kanbanCard.urutan))
      .limit(1);

    let nextUrutan = (latestCard?.urutan ?? 0) + 1;

    // Insert new AI recommendation cards
    const cardsToInsert = generatedTasks.map((t) => {
      const subtasks = t.subtasks || [];
      const totalEstHours = subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);

      return {
        timInovatorId: timId,
        judul: t.judul,
        deskripsi: t.deskripsi || null,
        acceptanceCriteria: t.acceptanceCriteria || null,
        statusKolom: 'To Do',
        tahap: 'customer_validation',
        sprintNumber: null,
        suggestedSprintNumber: t.suggestedSprintNumber || 1,
        storyPoint: t.storyPoint || 3,
        estimasiJam: totalEstHours > 0 ? totalEstHours : null,
        label: 'Rekomendasi CV',
        reviewStatus: 'ai_reference',
        urutan: nextUrutan++,
        _subtasks: subtasks,
      };
    });

    const insertedCards = await db.insert(kanbanCard).values(
      cardsToInsert.map(({ _subtasks, ...c }) => c)
    ).returning();

    // Insert initial subtasks
    const subtaskRows: Array<typeof kanbanSubtask.$inferInsert> = [];
    for (let i = 0; i < insertedCards.length; i++) {
      const card = insertedCards[i];
      const subtasks = cardsToInsert[i]._subtasks;
      if (subtasks && subtasks.length > 0) {
        for (let sIdx = 0; sIdx < subtasks.length; sIdx++) {
          const st = subtasks[sIdx];
          subtaskRows.push({
            taskId: card.id,
            title: st.title,
            estimatedHours: st.estimatedHours || 3,
            isDone: false,
            orderIndex: sIdx,
            createdBy: null,
          });
        }
      }
    }

    if (subtaskRows.length > 0) {
      await db.insert(kanbanSubtask).values(subtaskRows);
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CUST_VAL_GENERATE_BACKLOG',
      entity: 'customer_validation_plan',
      entityId: plan.id,
      details: { timId, count: insertedCards.length },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/kanban`);

    return {
      success: true,
      count: insertedCards.length,
      message: `Berhasil menghasilkan ${insertedCards.length} rekomendasi backlog Customer Validation!`,
    };
  } catch (error: any) {
    console.error('[generateCvBacklogAction] Error:', error);
    return { success: false, error: error.message || 'Gagal menghasilkan rekomendasi backlog.' };
  }
}

/**
 * Auto-fill Section A of CV Plan from the team's Innovation Charter.
 * Returns the mapped field values — does NOT save to DB (client does the
 * setPlanForm + confirms before saving).
 */
export async function autoFillCvPlanFromCharterAction(timId: string): Promise<{
  success: boolean;
  data?: {
    projectMission: string;
    customerDanContext: string;
    problemHypothesis: string;
    hmw: string;
    solutionHypothesis: string;
  };
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Tidak terautentikasi.' };

    const [charterRow] = await db
      .select({
        projectMission: charter.projectMission,
        customerEarlyAdopters: charter.customerEarlyAdopters,
        contextAreaBantuan: charter.contextAreaBantuan,
        problemWorthSolving: charter.problemWorthSolving,
        hmw: charter.hmw,
        desirabilityHypothesis: charter.desirabilityHypothesis,
        feasibilityHypothesis: charter.feasibilityHypothesis,
        viabilityHypothesis: charter.viabilityHypothesis,
      })
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!charterRow) {
      return { success: false, error: 'Innovation Charter belum ditemukan untuk tim ini.' };
    }

    // Check if charter has at least minimal data
    const hasData = [
      charterRow.projectMission,
      charterRow.problemWorthSolving,
      charterRow.hmw,
    ].some((f) => f && f.trim().length > 0);

    if (!hasData) {
      return { success: false, error: 'Innovation Charter belum memiliki data yang cukup. Lengkapi Charter terlebih dahulu.' };
    }

    // Mapping: Charter → CV Plan Section A
    const projectMission = charterRow.projectMission?.trim() || '';

    // Merge customerEarlyAdopters + contextAreaBantuan into a coherent paragraph
    const customer = charterRow.customerEarlyAdopters?.trim() || '';
    const context = charterRow.contextAreaBantuan?.trim() || '';
    let customerDanContext = '';
    if (customer && context) {
      customerDanContext = `${customer} dalam konteks ${context}`;
    } else {
      customerDanContext = customer || context;
    }

    const problemHypothesis = charterRow.problemWorthSolving?.trim() || '';
    const hmw = charterRow.hmw?.trim() || '';

    // Merge DFV hypotheses: prefer desirability, append feasibility + viability as context
    const desirability = charterRow.desirabilityHypothesis?.trim() || '';
    const feasibility = charterRow.feasibilityHypothesis?.trim() || '';
    const viability = charterRow.viabilityHypothesis?.trim() || '';
    const dfvParts = [desirability, feasibility, viability].filter(Boolean);
    const solutionHypothesis = dfvParts.length > 0
      ? dfvParts.join(' | ')
      : '';

    return {
      success: true,
      data: {
        projectMission,
        customerDanContext,
        problemHypothesis,
        hmw,
        solutionHypothesis,
      },
    };
  } catch (error: any) {
    console.error('[autoFillCvPlanFromCharterAction] Error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data Charter.' };
  }
}
