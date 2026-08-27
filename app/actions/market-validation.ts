"use server";

import { db } from "@/lib/db";
import {
  timInovator,
  marketValidationPlan,
  marketValidationReport,
  mvpMappingFitur,
  mvpResourcesNeeded,
  rencanaValidasiMetrik,
  customerValidationPlan,
  customerValidationReport,
  mvReleaseLog,
  dfvRekapitulasi,
  anggotaTim,
  kanbanCard,
  kanbanSubtask,
  sprint,
  sprintReview,
  hasilValidasiMetrik,
} from "@/lib/db/schema";
import { eq, and, ne, inArray, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { getCharterRolesData } from "./charter";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAiBacklogFromMvPlan } from "@/lib/ai/mv-backlog-generator";

export async function getMarketValidationData(timId: string) {
  const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);
  const [plan] = await db.select().from(marketValidationPlan).where(eq(marketValidationPlan.timInovatorId, timId)).limit(1);
  
  // Ambil CV Report untuk auto-fill hasil Customer Validation jika MV Plan belum terisi
  let cvReport = null;
  const [cvPlan] = await db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1);
  if (cvPlan) {
    const [foundCvReport] = await db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, cvPlan.id)).limit(1);
    if (foundCvReport) {
      cvReport = {
        validatedSolution: foundCvReport.validatedSolution || "",
        kesimpulan: foundCvReport.kesimpulan || "",
        valueProposition: foundCvReport.valueProposition || "",
      };
    }
  }

  let report = null;
  let fiturMapping: any[] = [];
  let resources: any[] = [];
  let metrikRencana: any[] = [];
  let releaseLogs: any[] = [];
  let dfv: any[] = [];
  let hasilMetrik: any[] = [];

  if (plan) {
    [report] = await db.select().from(marketValidationReport).where(eq(marketValidationReport.planId, plan.id)).limit(1);
    fiturMapping = await db.select().from(mvpMappingFitur).where(eq(mvpMappingFitur.planId, plan.id));
    resources = await db.select().from(mvpResourcesNeeded).where(eq(mvpResourcesNeeded.planId, plan.id));
    metrikRencana = await db
      .select()
      .from(rencanaValidasiMetrik)
      .where(
        and(
          eq(rencanaValidasiMetrik.planId, plan.id),
          eq(rencanaValidasiMetrik.fase, "market_validation")
        )
      );
  }

  if (report) {
    releaseLogs = await db.select().from(mvReleaseLog).where(eq(mvReleaseLog.reportId, report.id)).orderBy(asc(mvReleaseLog.tanggal));
    dfv = await db.select().from(dfvRekapitulasi).where(eq(dfvRekapitulasi.reportId, report.id));
    hasilMetrik = await db
      .select()
      .from(hasilValidasiMetrik)
      .where(
        and(
          eq(hasilValidasiMetrik.reportId, report.id),
          eq(hasilValidasiMetrik.fase, "market_validation")
        )
      );
  }

  const teamMembers = await db.select().from(anggotaTim).where(eq(anggotaTim.timInovatorId, timId));

  // Ambil sprint review untuk sprint-sprint yang memiliki kartu ber-tag market_validation
  const mvCards = await db
    .select({ sprintNumber: kanbanCard.sprintNumber })
    .from(kanbanCard)
    .where(
      and(
        eq(kanbanCard.timInovatorId, timId),
        eq(kanbanCard.tahap, "market_validation")
      )
    );

  const mvSprintNumbers = Array.from(
    new Set(mvCards.map((c) => c.sprintNumber).filter((s): s is number => s !== null && s !== undefined))
  );

  const sprintReviews = await db
    .select()
    .from(sprintReview)
    .where(eq(sprintReview.timInovatorId, timId))
    .orderBy(asc(sprintReview.sprintNumber));

  // Filter atau sertakan semua sprint review (jika mvSprintNumbers kosong, ambil semua)
  const filteredSprintReviews =
    mvSprintNumbers.length > 0
      ? sprintReviews.filter((sr) => mvSprintNumbers.includes(sr.sprintNumber))
      : sprintReviews;

  // Ambil kartu per sprint untuk Sprint Review - Backlog
  const allTeamCards = await db
    .select()
    .from(kanbanCard)
    .where(eq(kanbanCard.timInovatorId, timId))
    .orderBy(asc(kanbanCard.urutan));

  return {
    tim,
    plan,
    report,
    cvReport,
    fiturMapping,
    resources,
    metrikRencana,
    teamMembers,
    releaseLogs,
    dfv,
    hasilMetrik,
    sprintReviews: filteredSprintReviews,
    allTeamCards,
  };
}

export async function saveMarketValidationPlanFullAction(
  timId: string,
  planValues: Partial<typeof marketValidationPlan.$inferInsert>,
  mappingFiturList: Array<{
    solusiTervalidasi?: string;
    fiturSolusi: string;
    benefit?: string;
    fiturMvpStatus: string;
    acceptanceCriteriaEvidence?: string;
  }>,
  resourcesList: Array<{
    jenisResource: string;
    kebutuhanSpesifik: string;
    ownerSumber?: string;
    statusKetersediaan?: string;
    gapTindakLanjut?: string;
  }>,
  metrikList: Array<{
    validasi: string;
    metrik: string;
    unitUkuran?: string;
    baseline?: string;
    target?: string;
    threshold?: string;
    caraPengukuran?: string;
    pic?: string;
    evidence?: string;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "market_val.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit Market Validation Plan tim ini.",
      };
    }

    // 1. Upsert marketValidationPlan
    const [existing] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    let planId = existing?.id;

    if (existing) {
      await db
        .update(marketValidationPlan)
        .set({
          ...planValues,
          updatedAt: new Date(),
        })
        .where(eq(marketValidationPlan.id, existing.id));
    } else {
      const [inserted] = await db
        .insert(marketValidationPlan)
        .values({
          timInovatorId: timId,
          ...planValues,
        })
        .returning();
      planId = inserted.id;
    }

    if (!planId) {
      return { success: false, error: "Gagal menginisialisasi Plan ID." };
    }

    // 2. Sync mvpMappingFitur
    await db.delete(mvpMappingFitur).where(eq(mvpMappingFitur.planId, planId));
    if (mappingFiturList && mappingFiturList.length > 0) {
      const validFitur = mappingFiturList
        .filter((f) => f.fiturSolusi?.trim())
        .map((f) => ({
          planId: planId!,
          solusiTervalidasi: f.solusiTervalidasi || null,
          fiturSolusi: f.fiturSolusi.trim(),
          benefit: f.benefit || null,
          fiturMvpStatus: f.fiturMvpStatus || "dirilis",
          acceptanceCriteriaEvidence: f.acceptanceCriteriaEvidence || null,
        }));

      if (validFitur.length > 0) {
        await db.insert(mvpMappingFitur).values(validFitur);
      }
    }

    // 3. Sync mvpResourcesNeeded (5 baris)
    await db.delete(mvpResourcesNeeded).where(eq(mvpResourcesNeeded.planId, planId));
    if (resourcesList && resourcesList.length > 0) {
      const validResources = resourcesList.map((r) => ({
        planId: planId!,
        jenisResource: r.jenisResource,
        kebutuhanSpesifik: r.kebutuhanSpesifik || "",
        ownerSumber: r.ownerSumber || null,
        statusKetersediaan: r.statusKetersediaan || "Belum",
        gapTindakLanjut: r.gapTindakLanjut || null,
      }));

      if (validResources.length > 0) {
        await db.insert(mvpResourcesNeeded).values(validResources);
      }
    }

    // 4. Sync rencanaValidasiMetrik (fase = 'market_validation')
    await db
      .delete(rencanaValidasiMetrik)
      .where(
        and(
          eq(rencanaValidasiMetrik.planId, planId),
          eq(rencanaValidasiMetrik.fase, "market_validation")
        )
      );

    if (metrikList && metrikList.length > 0) {
      const validMetrik = metrikList.map((m) => ({
        planId: planId!,
        fase: "market_validation",
        validasi: m.validasi,
        metrik: m.metrik,
        unitUkuran: m.unitUkuran || null,
        baseline: m.baseline || null,
        target: m.target || null,
        threshold: m.threshold || "70%",
        caraPengukuran: m.caraPengukuran || null,
        pic: m.pic || null,
        evidence: m.evidence || null,
      }));

      await db.insert(rencanaValidasiMetrik).values(validMetrik);
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MARKET_VAL_PLAN_SAVE_FULL",
      entity: "market_validation_plan",
      entityId: planId,
      details: {
        timId,
        mvpVersion: planValues.mvpVersion,
        totalFitur: mappingFiturList.length,
        totalResources: resourcesList.length,
        totalMetrik: metrikList.length,
      },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, planId };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal menyimpan Market Validation Plan.",
    };
  }
}

export async function signMvPlanAction(
  timId: string,
  roleType: "po" | "coach" | "promotor",
  signatureDataUrl: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const isAdmin = user.globalRoles?.some((r: string) =>
      ['super_admin', 'admin_ic', 'admin'].includes(r)
    );

    const [existingPlan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!existingPlan) {
      return {
        success: false,
        error: "Harap simpan Market Validation Plan terlebih dahulu sebelum menandatangani.",
      };
    }

    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, user.id)))
      .limit(1);

    const rolesData = await getCharterRolesData(timId);
    const targetRoleCode = roleType === "po" ? "project_owner" : roleType === "coach" ? "coach" : "promotor";
    const defaultRoleTitle = roleType === "po" ? "Project Owner" : roleType === "coach" ? "Innovation Coach" : "Promotor Inovasi";

    // ── Role-gate enforcement ─────────────────────────────────────────────────
    if (!isAdmin) {
      const assigned = rolesData?.assignments?.find((a: any) => a.roleCode === targetRoleCode);
      if (!assigned?.userId || assigned.userId !== user.id) {
        return {
          success: false,
          error: `Forbidden: Hanya pemegang role ${defaultRoleTitle} yang terdaftar di Innovation Charter tim ini yang dapat menandatangani.`,
        };
      }
    }

    const assignedName = rolesData?.assignments?.find((r: any) => r.roleCode === targetRoleCode)?.userName;
    const processedImageUrl = await processMvSignatureImage(timId, signatureDataUrl);

    const signatureData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || defaultRoleTitle,
      unit: anggota?.unitKerja || "PT Pegadaian",
      tanggal: new Date().toISOString(),
      status: "signed",
      signatureImage: processedImageUrl,
    };

    const updateField =
      roleType === "po"
        ? { ttdDisusun: signatureData }
        : roleType === "coach"
        ? { ttdDiperiksa: signatureData }
        : { ttdDisetujui: signatureData };

    await db
      .update(marketValidationPlan)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationPlan.id, existingPlan.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MV_PLAN_SIGN",
      entity: "market_validation_plan",
      entityId: existingPlan.id,
      details: { timId, roleType, signer: user.nama },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, signatureData };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menandatangani MVP Plan." };
  }
}

export async function revokeMvPlanSignatureAction(
  timId: string,
  roleType: "po" | "coach" | "promotor"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const isAdmin = user.globalRoles?.some((r: string) =>
      ['super_admin', 'admin_ic', 'admin'].includes(r)
    );

    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const targetRoleCode = roleType === "po" ? "project_owner" : roleType === "coach" ? "coach" : "promotor";
      const assigned = rolesData?.assignments?.find((a: any) => a.roleCode === targetRoleCode);
      if (!assigned?.userId || assigned.userId !== user.id) {
        return {
          success: false,
          error: "Forbidden: Anda tidak berwenang membatalkan tanda tangan role ini.",
        };
      }
    }

    const [existingPlan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!existingPlan) {
      return { success: false, error: "Plan tidak ditemukan." };
    }

    const updateField =
      roleType === "po"
        ? { ttdDisusun: null }
        : roleType === "coach"
        ? { ttdDiperiksa: null }
        : { ttdDisetujui: null };

    await db
      .update(marketValidationPlan)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationPlan.id, existingPlan.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MV_PLAN_REVOKE_SIGN",
      entity: "market_validation_plan",
      entityId: existingPlan.id,
      details: { timId, roleType, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan tanda tangan." };
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

async function processMvSignatureImage(timId: string, imageStr?: string | null): Promise<string | null> {
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
    const storagePath = `signatures/${timId}/${Date.now()}_mv_promotor_sig.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("task-attachments")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.warn("[processMvSignatureImage] Storage upload error, using data URI:", uploadError.message);
      return imageStr;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("task-attachments")
      .getPublicUrl(storagePath);

    return publicUrlData?.publicUrl || imageStr;
  } catch (err: any) {
    console.warn("[processMvSignatureImage] Failed, fallback to data URI:", err.message);
    return imageStr;
  }
}

export async function approveMarketValidationReportAction(
  reportId: string,
  timId: string,
  signatureImage?: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'market_val.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Hanya Promotor inovasi yang memiliki izin menyetujui Market Validation Report tim ini.',
      };
    }

    const [existingReport] = await db
      .select()
      .from(marketValidationReport)
      .where(eq(marketValidationReport.id, reportId))
      .limit(1);

    if (!existingReport) {
      return { success: false, error: 'Market Validation Report belum disimpan.' };
    }

    // Get user's jabatan and unitKerja from anggotaTim if available
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

    const processedImageUrl = await processMvSignatureImage(timId, signatureImage);

    const approvalData = {
      userId: user.id,
      nama: user.nama,
      jabatan: anggota?.jabatan || 'Promotor Inovasi',
      unit: anggota?.unitKerja || 'PT Pegadaian',
      tanggal: new Date().toISOString(),
      status: 'approved',
      signatureImage: processedImageUrl,
    };

    await db
      .update(marketValidationReport)
      .set({
        ttdDisetujui: approvalData,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationReport.id, reportId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'MARKET_VALIDATION_APPROVE',
      entity: 'market_validation_report',
      entityId: reportId,
      details: {
        timId,
        approvedBy: user.nama,
        email: user.email,
        signatureData: approvalData,
      },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, ttdDisetujui: approvalData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyetujui Market Validation Report.' };
  }
}

export async function revokeMarketValidationReportApprovalAction(reportId: string, timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'market_val.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk membatalkan persetujuan Market Validation Report tim ini.',
      };
    }

    await db
      .update(marketValidationReport)
      .set({
        ttdDisetujui: null,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationReport.id, reportId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'MARKET_VALIDATION_REVOKE_APPROVAL',
      entity: 'market_validation_report',
      entityId: reportId,
      details: {
        timId,
        revokedBy: user.nama,
      },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan persetujuan Market Validation Report.' };
  }
}

export async function signMvReportAction(
  timId: string,
  roleType: "po" | "coach" | "promotor",
  signatureDataUrl: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    let [plan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      const [newPlan] = await db
        .insert(marketValidationPlan)
        .values({ timInovatorId: timId })
        .returning();
      plan = newPlan;
    }

    let [report] = await db
      .select()
      .from(marketValidationReport)
      .where(eq(marketValidationReport.planId, plan.id))
      .limit(1);

    if (!report) {
      const [newReport] = await db
        .insert(marketValidationReport)
        .values({ planId: plan.id })
        .returning();
      report = newReport;
    }

    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, user.id)))
      .limit(1);

    const processedImageUrl = await processMvSignatureImage(timId, signatureDataUrl);

    const isAdmin = user.globalRoles?.some((r: string) =>
      ['super_admin', 'admin_ic', 'admin'].includes(r)
    );

    const defaultJabatan =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";

    const rolesData = await getCharterRolesData(timId);
    const targetRoleCode = roleType === "po" ? "project_owner" : roleType === "coach" ? "coach" : "promotor";

    // ── Role-gate enforcement ─────────────────────────────────────────────────
    if (!isAdmin) {
      const assigned = rolesData?.assignments?.find((a: any) => a.roleCode === targetRoleCode);
      if (!assigned?.userId || assigned.userId !== user.id) {
        return {
          success: false,
          error: `Forbidden: Hanya pemegang role ${defaultJabatan} yang terdaftar di Innovation Charter tim ini yang dapat menandatangani.`,
        };
      }
    }

    const assignedName = rolesData?.assignments?.find((r: any) => r.roleCode === targetRoleCode)?.userName;

    const signatureData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      role: roleType,
      jabatan: anggota?.jabatan || defaultJabatan,
      unit: anggota?.unitKerja || "PT Pegadaian",
      status: "signed",
      tanggal: new Date().toISOString(),
      signatureImage: processedImageUrl,
    };

    const updateField =
      roleType === "po"
        ? { ttdDisusun: signatureData }
        : roleType === "coach"
        ? { ttdDiperiksa: signatureData }
        : { ttdDisetujui: signatureData };

    await db
      .update(marketValidationReport)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationReport.id, report.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MV_REPORT_SIGN",
      entity: "market_validation_report",
      entityId: report.id,
      details: { timId, roleType, signer: user.nama },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, signatureData };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menandatangani Laporan Market Validation." };
  }
}

export async function revokeMvReportSignatureAction(
  timId: string,
  roleType: "po" | "coach" | "promotor"
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const isAdmin = user.globalRoles?.some((r: string) =>
      ['super_admin', 'admin_ic', 'admin'].includes(r)
    );

    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const targetRoleCode = roleType === "po" ? "project_owner" : roleType === "coach" ? "coach" : "promotor";
      const assigned = rolesData?.assignments?.find((a: any) => a.roleCode === targetRoleCode);
      if (!assigned?.userId || assigned.userId !== user.id) {
        return {
          success: false,
          error: "Forbidden: Anda tidak berwenang membatalkan tanda tangan role ini.",
        };
      }
    }

    const [plan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) return { success: false, error: "Plan tidak ditemukan." };

    const [report] = await db
      .select()
      .from(marketValidationReport)
      .where(eq(marketValidationReport.planId, plan.id))
      .limit(1);

    if (!report) return { success: false, error: "Laporan tidak ditemukan." };

    const updateField =
      roleType === "po"
        ? { ttdDisusun: null }
        : roleType === "coach"
        ? { ttdDiperiksa: null }
        : { ttdDisetujui: null };

    await db
      .update(marketValidationReport)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(marketValidationReport.id, report.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MV_REPORT_REVOKE_SIGN",
      entity: "market_validation_report",
      entityId: report.id,
      details: { timId, roleType, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan tanda tangan." };
  }
}

export async function generateMvBacklogAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const allowed = await hasPermission(user, "market_val.edit", timId);
    if (!allowed) return { success: false, error: "Forbidden: Anda tidak memiliki izin mengedit tim ini." };

    const [plan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      return {
        success: false,
        error: "Form MVP Release Plan belum disimpan. Simpan form rencana rilis MVP terlebih dahulu.",
      };
    }

    // Check if Rekomendasi MV cards already exist
    const existingMvRecCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.label, "Rekomendasi MV")
        )
      );

    const isAdmin = user.globalRoles.some((r) => ["super_admin", "admin_ic", "admin"].includes(r));
    const isCoach =
      user.globalRoles.some((r) => ["coach", "innovation_coach"].includes(r)) ||
      user.timRoles.some((tr) => tr.timId === timId && ["coach", "innovation_coach"].includes(tr.roleCode));

    if (existingMvRecCards.length > 0 && !isAdmin && !isCoach) {
      return {
        success: false,
        error: "Rekomendasi Backlog Market Validation sudah ada. Regenerasi backlog hanya diizinkan untuk Admin dan Innovation Coach.",
      };
    }

    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);
    const namaProyek = tim?.namaProyekInovasi || "Proyek Inovasi";

    const teamSprints = await db.select().from(sprint).where(eq(sprint.timInovatorId, timId));
    const totalSprints = Math.max(2, teamSprints.length || 4);

    const mappingFitur = await db
      .select()
      .from(mvpMappingFitur)
      .where(eq(mvpMappingFitur.planId, plan.id));
    const resources = await db
      .select()
      .from(mvpResourcesNeeded)
      .where(eq(mvpResourcesNeeded.planId, plan.id));
    const metrik = await db
      .select()
      .from(rencanaValidasiMetrik)
      .where(
        and(
          eq(rencanaValidasiMetrik.planId, plan.id),
          eq(rencanaValidasiMetrik.fase, "market_validation")
        )
      );

    // Call AI / Fallback Generator
    const generatedTasks = await generateAiBacklogFromMvPlan({
      teamId: timId,
      namaProyek,
      totalSprints,
      plan: {
        mvpVersion: plan.mvpVersion,
        channelRelease: plan.channelRelease,
        periodeReleaseMulai: plan.periodeReleaseMulai ? plan.periodeReleaseMulai.toISOString() : null,
        periodeReleaseSelesai: plan.periodeReleaseSelesai ? plan.periodeReleaseSelesai.toISOString() : null,
        deskripsiMvp: plan.deskripsiMvp,
        deskripsiProsesMvp: plan.deskripsiProsesMvp,
        fiturMvpDirilis: plan.fiturMvpDirilis,
        targetEarlyAdopters: plan.targetEarlyAdopters,
        lokasiPilot: plan.lokasiPilot,
        jumlahTargetPengguna: plan.jumlahTargetPengguna,
        daftarEarlyAdopters: plan.daftarEarlyAdopters,
        batasanScopeMvp: plan.batasanScopeMvp,
        mappingFitur: mappingFitur.map((f) => ({
          fiturSolusi: f.fiturSolusi,
          fiturMvpStatus: f.fiturMvpStatus,
          benefit: f.benefit || undefined,
        })),
        resources: resources.map((r) => ({
          jenisResource: r.jenisResource,
          kebutuhanSpesifik: r.kebutuhanSpesifik,
          ownerSumber: r.ownerSumber || undefined,
        })),
        metrik: metrik.map((m) => ({
          validasi: m.validasi,
          metrik: m.metrik,
          target: m.target || undefined,
        })),
      },
    });

    if (!generatedTasks || generatedTasks.length === 0) {
      return { success: false, error: "Gagal menghasilkan rekomendasi backlog Market Validation." };
    }

    // Clean up previous UNADOPTED AI-generated MV cards (do NOT delete adopted cards and do NOT delete Template Baku MV)
    const existingAiMvCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.tahap, "market_validation"),
          eq(kanbanCard.reviewStatus, "ai_reference"),
          ne(kanbanCard.label, "Template Baku MV")
        )
      );

    if (existingAiMvCards.length > 0) {
      const cardIdsToDelete = existingAiMvCards.map((c) => c.id);
      await db.delete(kanbanCard).where(inArray(kanbanCard.id, cardIdsToDelete));
    }

    // Get current max urutan for this team
    const [latestCard] = await db
      .select({ urutan: kanbanCard.urutan })
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(desc(kanbanCard.urutan))
      .limit(1);

    const cvSprintSpan = Math.max(1, Math.min(2, Math.floor(totalSprints / 2)));
    const mvMinSprint = Math.min(totalSprints, cvSprintSpan + 1);

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
        statusKolom: "To Do",
        tahap: "market_validation",
        sprintNumber: null,
        suggestedSprintNumber: t.suggestedSprintNumber || mvMinSprint,
        storyPoint: t.storyPoint || 3,
        estimasiJam: totalEstHours > 0 ? totalEstHours : null,
        label: "Rekomendasi MV",
        reviewStatus: "ai_reference",
        urutan: nextUrutan++,
        _subtasks: subtasks,
      };
    });

    const insertedCards = await db
      .insert(kanbanCard)
      .values(cardsToInsert.map(({ _subtasks, ...c }) => c))
      .returning();

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
      action: "MARKET_VAL_GENERATE_BACKLOG",
      entity: "market_validation_plan",
      entityId: plan.id,
      details: { timId, count: insertedCards.length },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    revalidatePath(`/tim/${timId}/kanban`);

    return {
      success: true,
      count: insertedCards.length,
      message: `Berhasil menghasilkan ${insertedCards.length} rekomendasi backlog Market Validation!`,
    };
  } catch (error: any) {
    console.error("[generateMvBacklogAction] Error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghasilkan rekomendasi backlog Market Validation.",
    };
  }
}
