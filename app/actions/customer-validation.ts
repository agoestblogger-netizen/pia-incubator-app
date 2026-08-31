"use server";

import { db } from "@/lib/db";
import {
  customerValidationPlan,
  customerValidationReport,
  rencanaValidasiMetrik,
  hasilValidasiMetrik,
  customerValidationDimensiFeedback,
  customerValidationTemuanKualitatif,
  customerTestingFeedbackResponden,
  kanbanCard,
  kanbanSubtask,
  kanbanColumn,
  sprint,
  timInovator,
  charter,
  anggotaTim,
  userRoleTim,
  roles,
} from "@/lib/db/schema";
import { eq, and, ne, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { getCharterRolesData } from "./charter";
import { isCustomerValidationUnlockedForUser } from "./phase-gate";
import { generateAiBacklogFromCvPlan } from "@/lib/ai/cv-backlog-generator";
import { generateFullCvPlanDraft } from "@/lib/ai/cv-plan-full-generator";

export async function getCustomerValidationData(timId: string) {
  const [plan] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
  let report = null;
  let metrikRencana: any[] = [];
  let metrikHasil: any[] = [];
  let dimensiFeedback: any[] = [];
  let temuanKualitatif: any[] = [];
  let feedbackResponden: any[] = [];

  if (plan) {
    [report] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, plan.id)).limit(1);
    metrikRencana = await db.select().from(rencanaValidasiMetrik).where(eq(rencanaValidasiMetrik.planId, plan.id));
    dimensiFeedback = await db.select().from(customerValidationDimensiFeedback).where(eq(customerValidationDimensiFeedback.planId, plan.id));
  }

  if (report) {
    metrikHasil = await db.select().from(hasilValidasiMetrik).where(eq(hasilValidasiMetrik.reportId, report.id));
    temuanKualitatif = await db.select().from(customerValidationTemuanKualitatif).where(eq(customerValidationTemuanKualitatif.reportId, report.id));
    feedbackResponden = await db.select().from(customerTestingFeedbackResponden).where(eq(customerTestingFeedbackResponden.reportId, report.id));
  }

  // Cek kondisi: SEMUA kartu backlog CV (review_status = 'adopted') sudah berstatus 'Done'
  const cvAdoptedCards = await db
    .select({ id: kanbanCard.id, statusKolom: kanbanCard.statusKolom })
    .from(kanbanCard)
    .where(
      and(
        eq(kanbanCard.timInovatorId, timId),
        eq(kanbanCard.tahap, 'customer_validation'),
        eq(kanbanCard.reviewStatus, 'adopted')
      )
    );

  const allCvBacklogDone =
    cvAdoptedCards.length > 0 && cvAdoptedCards.every((c) => c.statusKolom === 'Done');

  return {
    plan,
    report,
    metrikRencana,
    metrikHasil,
    dimensiFeedback,
    temuanKualitatif,
    feedbackResponden,
    allCvBacklogDone,
  };
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

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
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

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
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
  dimensiRows: Array<{
    dimensi: string;
    fokusValidasi: string;
    contohPertanyaan: string;
    evidenceYangDikumpulkan: string;
  }>,
  metrikRows: Array<{
    validasi: string;
    metrik: string;
    unitUkuran: string;
    kriteriaKesuksesan: string;
    caraPengukuran: string;
    catatan: string;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) return { success: false, error: 'Forbidden: Anda tidak memiliki izin.' };

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

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

    // Update dimensi feedback: delete existing and insert new
    await db.delete(customerValidationDimensiFeedback)
      .where(eq(customerValidationDimensiFeedback.planId, planId));

    if (dimensiRows && dimensiRows.length > 0) {
      await db.insert(customerValidationDimensiFeedback).values(
        dimensiRows.map((r) => ({
          planId: planId as string,
          dimensi: r.dimensi || 'Custom',
          fokusValidasi: r.fokusValidasi || '',
          contohPertanyaan: r.contohPertanyaan || '',
          evidenceYangDikumpulkan: r.evidenceYangDikumpulkan || '',
        }))
      );
    }

    // Update metrik rencana: delete existing CV metrik and insert new
    await db.delete(rencanaValidasiMetrik)
      .where(and(
        eq(rencanaValidasiMetrik.planId, planId),
        eq(rencanaValidasiMetrik.fase, 'customer_validation')
      ));

    if (metrikRows && metrikRows.length > 0) {
      await db.insert(rencanaValidasiMetrik).values(
        metrikRows.map((r) => ({
          planId: planId as string,
          fase: 'customer_validation',
          validasi: r.validasi || 'Desirability',
          metrik: r.metrik || 'Metrik Custom',
          unitUkuran: r.unitUkuran || '',
          kriteriaKesuksesan: r.kriteriaKesuksesan || '',
          caraPengukuran: r.caraPengukuran || '',
          catatan: r.catatan || '',
        }))
      );
    }

    // Auto-generate AI backlog only if this is the first time (no Rekomendasi CV cards exist yet)
    const existingRekomendasi = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.tahap, 'customer_validation'),
          eq(kanbanCard.label, 'Rekomendasi CV')
        )
      )
      .limit(1);

    let backlogGenerated = false;
    let backlogCount = 0;

    if (existingRekomendasi.length === 0) {
      const genRes = await generateCvBacklogAction(timId);
      if (genRes.success) {
        backlogGenerated = true;
        backlogCount = genRes.count || 0;
      }
    }

    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, planId, backlogGenerated, backlogCount };
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

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    const [plan] = await db.select().from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);

    if (!plan) {
      return {
        success: false,
        error: 'Form Perencanaan CV belum disimpan. Simpan form rencana validasi terlebih dahulu.',
      };
    }

    // Check if Rekomendasi CV cards already exist
    const existingCvRecCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.label, "Rekomendasi CV")
        )
      );

    const isAdmin = user.globalRoles.some((r) => ["super_admin", "admin_ic", "admin"].includes(r));
    const isCoach =
      user.globalRoles.some((r) => ["coach", "innovation_coach"].includes(r)) ||
      user.timRoles.some((tr) => tr.timId === timId && ["coach", "innovation_coach"].includes(tr.roleCode));

    if (existingCvRecCards.length > 0 && !isAdmin && !isCoach) {
      return {
        success: false,
        error: "Rekomendasi Backlog CV sudah ada. Regenerasi backlog hanya diizinkan untuk Admin dan Innovation Coach.",
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
            estimatedHours: st.estimatedHours || 180,
            isDone: false,
            orderIndex: sIdx,
            subtaskType: st.subtaskType || 'regular',
            reportFieldMapping: st.reportFieldMapping || null,
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

/**
 * Auto-fill Sections A, B, and C of CV Plan using Innovation Charter data + AI.
 */
export async function autoFillFullCvPlanAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Tidak terautentikasi.' };

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    const [timRow] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    const [charterRow] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!charterRow) {
      return { success: false, error: 'Innovation Charter belum ditemukan untuk tim ini.' };
    }

    // Check if CV Plan already exists and has data (regenerate protection)
    const [existingPlan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    const isPlanFilled = Boolean(
      existingPlan &&
      [
        existingPlan.projectMission,
        existingPlan.customerDanContext,
        existingPlan.problemHypothesis,
        existingPlan.solutionHypothesis,
      ].some((f) => f && f.trim().length > 0)
    );

    const isAdmin = user.globalRoles.some((r) => ["super_admin", "admin_ic", "admin"].includes(r));
    const isCoach =
      user.globalRoles.some((r) => ["coach", "innovation_coach"].includes(r)) ||
      user.timRoles.some((tr) => tr.timId === timId && ["coach", "innovation_coach"].includes(tr.roleCode));

    // if (isPlanFilled && !isAdmin && !isCoach) {
    //   return {
    //     success: false,
    //     error: "Form Perencanaan CV sudah terisi. Pengisian ulang otomatis dengan AI hanya diizinkan untuk Admin dan Innovation Coach.",
    //   };
    // }

    const hasData = [
      charterRow.projectMission,
      charterRow.problemWorthSolving,
      charterRow.hmw,
    ].some((f) => f && f.trim().length > 0);

    if (!hasData) {
      return {
        success: false,
        error: 'Innovation Charter belum memiliki data yang cukup. Lengkapi Charter terlebih dahulu.',
      };
    }

    const draft = await generateFullCvPlanDraft({
      namaProyekInovasi: timRow?.namaProyekInovasi,
      klasifikasiInovasi: timRow?.klasifikasiInovasi || timRow?.kategoriPia,
      projectMission: charterRow.projectMission,
      customerEarlyAdopters: charterRow.customerEarlyAdopters,
      contextAreaBantuan: charterRow.contextAreaBantuan,
      problemWorthSolving: charterRow.problemWorthSolving,
      hmw: charterRow.hmw,
      desirabilityHypothesis: charterRow.desirabilityHypothesis,
      feasibilityHypothesis: charterRow.feasibilityHypothesis,
      viabilityHypothesis: charterRow.viabilityHypothesis,
      solusiAwal: charterRow.solusiAwal,
    });

    return {
      success: true,
      data: draft,
    };
  } catch (error: any) {
    console.error('[autoFillFullCvPlanAction] Error:', error);
    return { success: false, error: error.message || 'Gagal menghasilkan draf otomatis.' };
  }
}

import { createAdminClient } from "@/lib/supabase/admin";

async function processSignatureImage(timId: string, imageStr?: string | null): Promise<string | null> {
  if (!imageStr) return null;
  if (!imageStr.startsWith("data:image/")) return imageStr;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "task-attachments");
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket("task-attachments", { public: true });
    }

    const base64Data = imageStr.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const storagePath = `signatures/${timId}/${Date.now()}_sig.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("task-attachments")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.warn("[processSignatureImage] Storage upload error, using data URI:", uploadError.message);
      return imageStr;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("task-attachments")
      .getPublicUrl(storagePath);

    return publicUrlData?.publicUrl || imageStr;
  } catch (err: any) {
    console.warn("[processSignatureImage] Failed, fallback to data URI:", err.message);
    return imageStr;
  }
}

/**
 * Tandatangani Customer Validation Plan sebagai Inisiator / Coach / Project Owner
 */
export async function signCvPlanAction(
  timId: string,
  roleType: 'inisiator' | 'coach' | 'po',
  signatureImage?: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const permCode = `cv_plan.sign_${roleType}`;
    const allowed = await hasPermission(user, permCode, timId);
    if (!allowed) {
      return {
        success: false,
        error: `Forbidden: Role Anda tidak memiliki izin menandatangani (${permCode}). Hubungi Admin untuk mengatur hak akses role.`,
      };
    }

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    // Get user details in this team
    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(
        and(
          eq(anggotaTim.timInovatorId, timId),
          eq(anggotaTim.userId, user.id)
        )
      )
      .limit(1);

    const defaultRoleTitle =
      roleType === 'inisiator'
        ? 'Inisiator Inovasi'
        : roleType === 'coach'
        ? 'Innovation Coach'
        : 'Project Owner';
    const rolesData = await getCharterRolesData(timId);
    const targetRoleCode = roleType === 'inisiator' ? 'inisiator' : roleType === 'coach' ? 'coach' : 'project_owner';

    // ── Role-gate enforcement: Admin IC bypasses identity check, per_tim roles require assignment match ──
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const assignments = rolesData?.assignments || [];
      let isAuthorized = false;
      if (roleType === 'inisiator') {
        // Inisiator is multi-user — any registered inisiator may sign
        isAuthorized = assignments
          .filter((a: any) => a.roleCode === 'inisiator')
          .some((a: any) => a.userId && a.userId === user.id);
      } else {
        const assigned = assignments.find((a: any) => a.roleCode === targetRoleCode);
        isAuthorized = Boolean(assigned?.userId && assigned.userId === user.id);
      }
      if (!isAuthorized) {
        return {
          success: false,
          error: `Forbidden: Hanya pemegang role ${defaultRoleTitle} yang terdaftar di Innovation Charter tim ini yang dapat menandatangani. Hubungi Innovation Coach atau Admin untuk mengubah penugasan role.`,
        };
      }
    }

    const assignedName = roleType === 'inisiator'
      ? rolesData?.assignments?.find((r: any) => r.roleCode === 'inisiator' && r.userId === user.id)?.userName
      : rolesData?.assignments?.find((r: any) => r.roleCode === targetRoleCode)?.userName;

    const processedImageUrl = await processSignatureImage(timId, signatureImage);

    const ttdData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || defaultRoleTitle,
      unit: anggota?.unitKerja || 'PT Pegadaian (Persero)',
      tanggal: new Date().toISOString(),
      email: user.email,
      status: 'signed',
      disetujui: true,
      signatureImage: processedImageUrl,
    };

    // Ensure plan exists
    const [existing] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (roleType === 'inisiator') {
      updatePayload.ttdDisusun = ttdData;
    } else if (roleType === 'coach') {
      updatePayload.ttdDiperiksa = ttdData;
    } else {
      updatePayload.ttdDisetujui = ttdData;
    }

    if (existing) {
      await db
        .update(customerValidationPlan)
        .set(updatePayload)
        .where(eq(customerValidationPlan.id, existing.id));
    } else {
      await db.insert(customerValidationPlan).values({
        timInovatorId: timId,
        ...updatePayload,
      });
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: `CV_PLAN_SIGN_${roleType.toUpperCase()}`,
      entity: 'customer_validation_plan',
      entityId: existing?.id || timId,
      details: { timId, roleType, ttdData },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true, signatureData: ttdData, ttd: ttdData };
  } catch (error: any) {
    console.error('[signCvPlanAction] Error:', error);
    return { success: false, error: error.message || 'Gagal membubuhkan tanda tangan.' };
  }
}

export async function revokeCvPlanSignatureAction(
  timId: string,
  roleType: 'inisiator' | 'coach' | 'po'
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));

    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const targetRoleCode = roleType === 'inisiator' ? 'inisiator' : roleType === 'coach' ? 'coach' : 'project_owner';
      const assignments = rolesData?.assignments || [];
      let isAuthorized = false;
      if (roleType === 'inisiator') {
        isAuthorized = assignments
          .filter((a: any) => a.roleCode === 'inisiator')
          .some((a: any) => a.userId && a.userId === user.id);
      } else {
        const assigned = assignments.find((a: any) => a.roleCode === targetRoleCode);
        isAuthorized = Boolean(assigned?.userId && assigned.userId === user.id);
      }
      if (!isAuthorized) {
        return {
          success: false,
          error: 'Forbidden: Anda tidak berwenang membatalkan tanda tangan role ini.',
        };
      }
    }

    const [existing] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Customer Validation Plan belum dibuat.' };
    }

    const fieldToClear =
      roleType === 'inisiator'
        ? { ttdDisusun: null }
        : roleType === 'coach'
        ? { ttdDiperiksa: null }
        : { ttdDisetujui: null };

    await db
      .update(customerValidationPlan)
      .set({
        ...fieldToClear,
        updatedAt: new Date(),
      })
      .where(eq(customerValidationPlan.id, existing.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: `CV_PLAN_REVOKE_SIGN_${roleType.toUpperCase()}`,
      entity: 'customer_validation_plan',
      entityId: existing.id,
      details: { timId, roleType, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    console.error('[revokeCvPlanSignatureAction] Error:', error);
    return { success: false, error: error.message || 'Gagal membatalkan tanda tangan.' };
  }
}

/**
 * Simpan lengkap Laporan Customer Validation beserta Tabel Temuan Kualitatif & Tabel Hasil Metrik
 */
export async function saveCustomerValidationReportFullAction(
  timId: string,
  reportValues: Partial<typeof customerValidationReport.$inferInsert>,
  temuanList?: Array<{ kategori: string; pertanyaanKunci: string; temuanUtama: string }>,
  metrikHasilList?: Array<{
    validasi: string;
    metrik: string;
    target?: string;
    hasilAktual?: string;
    interpretasi?: string;
    learning?: string;
    enhancement?: string;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'cust_val.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Laporan Customer Validation tim ini.',
      };
    }

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    // 1. Pastikan plan ada
    let [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      const [newPlan] = await db
        .insert(customerValidationPlan)
        .values({ timInovatorId: timId })
        .returning();
      plan = newPlan;
    }

    // 2. Simpan / Update Report
    const [existingReport] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, plan.id))
      .limit(1);

    let reportId = existingReport?.id;

    if (existingReport) {
      await db
        .update(customerValidationReport)
        .set({
          ...reportValues,
          updatedAt: new Date(),
        })
        .where(eq(customerValidationReport.id, existingReport.id));
    } else {
      const [inserted] = await db
        .insert(customerValidationReport)
        .values({
          planId: plan.id,
          ...reportValues,
        })
        .returning();
      reportId = inserted.id;
    }

    // 3. Simpan / Replace Tabel 1: Temuan Kualitatif (6 baris tetap)
    if (reportId && Array.isArray(temuanList) && temuanList.length > 0) {
      await db
        .delete(customerValidationTemuanKualitatif)
        .where(eq(customerValidationTemuanKualitatif.reportId, reportId));

      const temuanPayload = temuanList.map((t) => ({
        reportId: reportId!,
        kategori: t.kategori,
        pertanyaanKunci: t.pertanyaanKunci,
        temuanUtama: t.temuanUtama || '',
      }));

      await db.insert(customerValidationTemuanKualitatif).values(temuanPayload);
    }

    // 4. Simpan / Replace Tabel 2: Hasil Pengukuran Customer Validation (7 baris tetap)
    if (reportId && Array.isArray(metrikHasilList) && metrikHasilList.length > 0) {
      await db
        .delete(hasilValidasiMetrik)
        .where(
          and(
            eq(hasilValidasiMetrik.reportId, reportId),
            eq(hasilValidasiMetrik.fase, 'customer_validation')
          )
        );

      const metrikPayload = metrikHasilList.map((m) => ({
        reportId: reportId!,
        fase: 'customer_validation' as const,
        validasi: m.validasi,
        metrik: m.metrik,
        target: m.target || null,
        hasilAktual: m.hasilAktual || null,
        interpretasi: m.interpretasi || null,
        learning: m.learning || null,
        enhancement: m.enhancement || null,
      }));

      await db.insert(hasilValidasiMetrik).values(metrikPayload);
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CUST_VAL_REPORT_SAVE_FULL',
      entity: 'customer_validation_report',
      entityId: reportId,
      details: {
        timId,
        planId: plan.id,
        ketercapaianPsf: reportValues.ketercapaianPsf,
        keputusan: reportValues.keputusan,
      },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, reportId };
  } catch (error: any) {
    console.error('[saveCustomerValidationReportFullAction] Error:', error);
    return { success: false, error: error.message || 'Gagal menyimpan laporan validasi pelanggan.' };
  }
}

/**
 * Tanda tangani Customer Validation Report (Inisiator / Coach / PO)
 */
export async function signCvReportAction(
  timId: string,
  roleType: 'inisiator' | 'coach' | 'po',
  signatureDataUrl?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const permCode = `cv_report.sign_${roleType}`;
    const allowed = await hasPermission(user, permCode, timId);
    if (!allowed) {
      return { success: false, error: `Forbidden: Role Anda tidak memiliki izin menandatangani laporan CV (${permCode}).` };
    }

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    const rolesData = await getCharterRolesData(timId);
    const targetRoleCode = roleType === 'inisiator' ? 'inisiator' : roleType === 'coach' ? 'coach' : 'project_owner';
    const defaultRoleTitle =
      roleType === 'inisiator' ? 'Inisiator Inovasi' : roleType === 'coach' ? 'Innovation Coach' : 'Project Owner';

    // ── Role-gate enforcement: Admin IC bypasses identity check, per_tim roles require assignment match ──
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const assignments = rolesData?.assignments || [];
      let isAuthorized = false;
      if (roleType === 'inisiator') {
        isAuthorized = assignments
          .filter((a: any) => a.roleCode === 'inisiator')
          .some((a: any) => a.userId && a.userId === user.id);
      } else {
        const assigned = assignments.find((a: any) => a.roleCode === targetRoleCode);
        isAuthorized = Boolean(assigned?.userId && assigned.userId === user.id);
      }
      if (!isAuthorized) {
        return {
          success: false,
          error: `Forbidden: Hanya pemegang role ${defaultRoleTitle} yang terdaftar di Innovation Charter tim ini yang dapat menandatangani.`,
        };
      }
    }

    const assignedName = roleType === 'inisiator'
      ? rolesData?.assignments?.find((r: any) => r.roleCode === 'inisiator' && r.userId === user.id)?.userName
      : rolesData?.assignments?.find((r: any) => r.roleCode === targetRoleCode)?.userName;

    let [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      const [newPlan] = await db
        .insert(customerValidationPlan)
        .values({ timInovatorId: timId })
        .returning();
      plan = newPlan;
    }

    let [report] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, plan.id))
      .limit(1);

    if (!report) {
      const [newReport] = await db
        .insert(customerValidationReport)
        .values({ planId: plan.id })
        .returning();
      report = newReport;
    }

    const signatureData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      role: roleType,
      jabatan: roleType === 'inisiator' ? 'Inisiator Inovasi' : roleType === 'coach' ? 'Innovation Coach' : 'Project Owner',
      unit: 'PT Pegadaian (Persero)',
      status: 'signed' as const,
      tanggal: new Date().toISOString(),
      signatureImage: signatureDataUrl || null,
    };

    const fieldToUpdate =
      roleType === 'inisiator'
        ? { ttdDisusun: signatureData }
        : roleType === 'coach'
        ? { ttdDiperiksa: signatureData }
        : { ttdDisetujui: signatureData };

    await db
      .update(customerValidationReport)
      .set({
        ...fieldToUpdate,
        updatedAt: new Date(),
      })
      .where(eq(customerValidationReport.id, report.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: `CV_REPORT_SIGN_${roleType.toUpperCase()}`,
      entity: 'customer_validation_report',
      entityId: report.id,
      details: { timId, roleType, signatureData },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true, signatureData };
  } catch (error: any) {
    console.error('[signCvReportAction] Error:', error);
    return { success: false, error: error.message || 'Gagal membubuhkan tanda tangan laporan.' };
  }
}

/**
 * Batalkan tanda tangan Customer Validation Report
 */
export async function revokeCvReportSignatureAction(
  timId: string,
  roleType: 'inisiator' | 'coach' | 'po'
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };

    const permCode = `cv_report.sign_${roleType}`;
    const allowed = (await hasPermission(user, permCode, timId)) || (await hasPermission(user, 'cust_val.edit', timId));
    if (!allowed) {
      return { success: false, error: 'Forbidden: Anda tidak berwenang membatalkan tanda tangan role ini.' };
    }

    const isCvUnlocked = await isCustomerValidationUnlockedForUser(user, timId);
    if (!isCvUnlocked) {
      return {
        success: false,
        error: 'Forbidden: Gerbang fase Customer Validation belum terbuka (menunggu persetujuan Innovation Charter dari Promotor Inovasi atau izin Admin).',
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const targetRoleCode = roleType === 'inisiator' ? 'inisiator' : roleType === 'coach' ? 'coach' : 'project_owner';
      const assignments = rolesData?.assignments || [];
      let isAuthorized = false;
      if (roleType === 'inisiator') {
        isAuthorized = assignments
          .filter((a: any) => a.roleCode === 'inisiator')
          .some((a: any) => a.userId && a.userId === user.id);
      } else {
        const assigned = assignments.find((a: any) => a.roleCode === targetRoleCode);
        isAuthorized = Boolean(assigned?.userId && assigned.userId === user.id);
      }
      if (!isAuthorized) {
        return {
          success: false,
          error: 'Forbidden: Anda tidak berwenang membatalkan tanda tangan role ini.',
        };
      }
    }

    const [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) return { success: false, error: 'Plan belum dibuat.' };

    const [report] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, plan.id))
      .limit(1);

    if (!report) return { success: false, error: 'Report belum dibuat.' };

    const fieldToClear =
      roleType === 'inisiator'
        ? { ttdDisusun: null }
        : roleType === 'coach'
        ? { ttdDiperiksa: null }
        : { ttdDisetujui: null };

    await db
      .update(customerValidationReport)
      .set({
        ...fieldToClear,
        updatedAt: new Date(),
      })
      .where(eq(customerValidationReport.id, report.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: `CV_REPORT_REVOKE_SIGN_${roleType.toUpperCase()}`,
      entity: 'customer_validation_report',
      entityId: report.id,
      details: { timId, roleType, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    return { success: true };
  } catch (error: any) {
    console.error('[revokeCvReportSignatureAction] Error:', error);
    return { success: false, error: error.message || 'Gagal membatalkan tanda tangan laporan.' };
  }
}
