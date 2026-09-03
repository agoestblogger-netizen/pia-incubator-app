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
  dossierPiaArchive,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and, ne, inArray, desc, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { getCharterRolesData } from "./charter";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAiBacklogFromMvPlan } from "@/lib/ai/mv-backlog-generator";
import { isMarketValidationUnlockedForUser } from "./phase-gate";

const TRACKED_MV_PLAN_FIELDS: Record<string, string> = {
  hasilCustomerValidationRingkasan: 'Hasil CV Ringkasan',
  deskripsiMvp: 'Deskripsi MVP',
  mvpVersion: 'Versi MVP',
  fiturMvpDirilis: 'Fitur MVP Dirilis',
  channelRelease: 'Channel Release',
  periodeReleaseMulai: 'Periode Release Mulai',
  periodeReleaseSelesai: 'Periode Release Selesai',
  deskripsiProsesMvp: 'Deskripsi Proses MVP',
  targetEarlyAdopters: 'Target Early Adopters',
  lokasiPilot: 'Lokasi Pilot',
  daftarEarlyAdopters: 'Daftar Early Adopters',
  jumlahTargetPengguna: 'Jumlah Target Pengguna',
  batasanScopeMvp: 'Batasan Scope MVP',
  dataDukungMvp: 'Data Dukung MVP',
  successCriteriaMvp: 'Kriteria Sukses MVP',
};

const MV_METRIK_ROWS_STATIC = [
  { validasi: 'desirability', metrik: 'Kepuasan Pengguna MVP' },
  { validasi: 'desirability', metrik: 'Adopsi / Penggunaan Berulang' },
  { validasi: 'desirability', metrik: 'Rekomendasi / Referral (NPS)' },
  { validasi: 'feasibility', metrik: 'Ketersediaan Sistem & Kelancaran Proses' },
  { validasi: 'feasibility', metrik: 'Waktu Proses / Response Time Solusi' },
  { validasi: 'feasibility', metrik: 'Error / Issue Rate (Tingkat Kegagalan Transaksi)' },
  { validasi: 'viability', metrik: 'Realisasi Potensi Revenue / Transaksi Finansial' },
  { validasi: 'viability', metrik: 'Efisiensi Biaya Operasional / Penghematan Waktu' },
  { validasi: 'viability', metrik: 'Proyeksi ROI / Cost-Benefit Tahap Pilot' },
];

function isCanonicalMvMetricMatch(m1: string, m2: string): boolean {
  const n1 = (m1 || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const n2 = (m2 || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (n1 === n2) return true;
  if ((n1.includes('kepuasan') && n2.includes('kepuasan')) || (n1.includes('csat') && n2.includes('csat'))) return true;
  if ((n1.includes('adopsi') || n1.includes('berulang')) && (n2.includes('adopsi') || n2.includes('berulang'))) return true;
  if ((n1.includes('rekomendasi') || n1.includes('referral') || n1.includes('nps')) && (n2.includes('rekomendasi') || n2.includes('referral') || n2.includes('nps'))) return true;
  if ((n1.includes('ketersediaan') || n1.includes('uptime')) && (n2.includes('ketersediaan') || n2.includes('uptime'))) return true;
  if ((n1.includes('waktu proses') || n1.includes('response time')) && (n2.includes('waktu proses') || n2.includes('response time'))) return true;
  if ((n1.includes('error') || n1.includes('kegagalan')) && (n2.includes('error') || n2.includes('kegagalan'))) return true;
  if ((n1.includes('revenue') || n1.includes('pendapatan') || n1.includes('finansial')) && (n2.includes('revenue') || n2.includes('pendapatan') || n2.includes('finansial'))) return true;
  if ((n1.includes('efisiensi') || n1.includes('penghematan')) && (n2.includes('efisiensi') || n2.includes('penghematan'))) return true;
  if ((n1.includes('roi') || n1.includes('cost-benefit')) && (n2.includes('roi') || n2.includes('cost-benefit'))) return true;
  return false;
}

export async function getMarketValidationData(timId: string, existingTim?: any) {
  // Batch 1: Query tim, plan, cvPlan, sprintReview, allTeamCards, teamMembers, dan dossier secara paralel
  const [
    timRes,
    planRes,
    cvPlanRes,
    sprintReviewsRes,
    allTeamCards,
    teamMembersRes,
    dossierRes,
  ] = await Promise.all([
    existingTim ? Promise.resolve([existingTim]) : db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1),
    db.select().from(marketValidationPlan).where(eq(marketValidationPlan.timInovatorId, timId)).limit(1),
    db.select().from(customerValidationPlan).where(eq(customerValidationPlan.timInovatorId, timId)).limit(1),
    db.select().from(sprintReview).where(eq(sprintReview.timInovatorId, timId)).orderBy(asc(sprintReview.sprintNumber)),
    db.select().from(kanbanCard).where(eq(kanbanCard.timInovatorId, timId)).orderBy(asc(kanbanCard.urutan)),
    existingTim?.anggota ? Promise.resolve(existingTim.anggota) : db.select().from(anggotaTim).where(eq(anggotaTim.timInovatorId, timId)),
    db.select({ snapshotData: dossierPiaArchive.snapshotData }).from(dossierPiaArchive).where(eq(dossierPiaArchive.timInovatorId, timId)).limit(1),
  ]);

  const tim = timRes[0] || null;
  const plan = planRes[0] || null;
  const cvPlan = cvPlanRes[0] || null;
  const teamMembers = teamMembersRes || [];

  // Hitung mvSprintNumbers langsung dari allTeamCards tanpa query ulang ke kanbanCard
  const mvCards = allTeamCards.filter((c) => c.tahap === "market_validation");
  const mvSprintNumbers = Array.from(
    new Set(mvCards.map((c) => c.sprintNumber).filter((s): s is number => s !== null && s !== undefined))
  );
  const filteredSprintReviews =
    mvSprintNumbers.length > 0
      ? sprintReviewsRes.filter((sr) => mvSprintNumbers.includes(sr.sprintNumber))
      : sprintReviewsRes;

  // Batch 2: Query CV report & data terkait plan secara paralel
  const [
    foundCvReportRes,
    reportRes,
    fiturMapping,
    resources,
    metrikRencana,
  ] = await Promise.all([
    cvPlan
      ? db.select().from(customerValidationReport).where(eq(customerValidationReport.planId, cvPlan.id)).limit(1)
      : Promise.resolve([]),
    plan
      ? db.select().from(marketValidationReport).where(eq(marketValidationReport.planId, plan.id)).limit(1)
      : Promise.resolve([]),
    plan
      ? db.select().from(mvpMappingFitur).where(eq(mvpMappingFitur.planId, plan.id))
      : Promise.resolve([]),
    plan
      ? db.select().from(mvpResourcesNeeded).where(eq(mvpResourcesNeeded.planId, plan.id))
      : Promise.resolve([]),
    plan
      ? db
          .select()
          .from(rencanaValidasiMetrik)
          .where(
            and(
              eq(rencanaValidasiMetrik.planId, plan.id),
              eq(rencanaValidasiMetrik.fase, "market_validation")
            )
          )
      : Promise.resolve([]),
  ]);

  // Bangun cvReport
  let cvReport: any = null;
  const foundCvReport = foundCvReportRes[0];
  if (foundCvReport) {
    cvReport = {
      validatedSolution: foundCvReport.validatedSolution || "",
      kesimpulan: foundCvReport.kesimpulan || "",
      valueProposition: foundCvReport.valueProposition || "",
    };
  } else if (dossierRes[0]) {
    const snap = (dossierRes[0].snapshotData as any) || {};
    const gf = snap.hasil_grand_final || snap.data_submisi?.hasil_grand_final;
    if (gf) {
      cvReport = {
        validatedSolution: gf.solution || "",
        kesimpulan: gf.validasi ? `${gf.validasi.ringkasan_validasi || ''}\n${gf.validasi.pembelajaran_validasi || ''}`.trim() : "",
        valueProposition: gf.business_impact || "",
        isFallbackFromDossier: true,
      };
    }
  }

  const report = reportRes[0] || null;

  // Batch 3: Query releaseLogs, dfv, hasilMetrik secara paralel jika report ada
  let releaseLogs: any[] = [];
  let dfv: any[] = [];
  let hasilMetrik: any[] = [];

  if (report) {
    const [rlRes, dfvRes, hmRes] = await Promise.all([
      db.select().from(mvReleaseLog).where(eq(mvReleaseLog.reportId, report.id)).orderBy(asc(mvReleaseLog.tanggal)),
      db.select().from(dfvRekapitulasi).where(eq(dfvRekapitulasi.reportId, report.id)),
      db
        .select()
        .from(hasilValidasiMetrik)
        .where(
          and(
            eq(hasilValidasiMetrik.reportId, report.id),
            eq(hasilValidasiMetrik.fase, "market_validation")
          )
        ),
    ]);
    releaseLogs = rlRes;
    dfv = dfvRes;
    hasilMetrik = hmRes;
  }

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
    isStandard?: boolean;
    defaultMetrik?: string;
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

    // Cek apakah plan sudah pernah ditandatangani
    const hadSignatures = Boolean(existing?.ttdDisusun || existing?.ttdDiperiksa || existing?.ttdDisetujui);
    let signatureRevoked = false;
    let changedFields: string[] = [];

    const updatePayload: any = {
      ...planValues,
      updatedAt: new Date(),
    };

    if (existing && hadSignatures) {
      for (const [k, label] of Object.entries(TRACKED_MV_PLAN_FIELDS)) {
        const oldVal = (existing as any)[k];
        const newVal = (planValues as any)[k];
        if (newVal !== undefined && JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null)) {
          changedFields.push(label);
        }
      }

      if (changedFields.length > 0 || (mappingFiturList && mappingFiturList.length > 0) || (resourcesList && resourcesList.length > 0) || (metrikList && metrikList.length > 0)) {
        signatureRevoked = true;
        updatePayload.ttdDisusun = null;
        updatePayload.ttdDiperiksa = null;
        updatePayload.ttdDisetujui = null;
      }
    }

    if (existing) {
      await db
        .update(marketValidationPlan)
        .set(updatePayload)
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
    const userRole = ((user as any)?.role || "").toLowerCase();
    const isAdmin = Boolean(
      user.globalRoles?.some((r: string) => ['super_admin', 'admin_ic', 'admin'].includes(r)) ||
      ['super_admin', 'admin_ic', 'admin'].includes(userRole)
    );
    const isCoach = Boolean(
      userRole === 'coach' ||
      userRole === 'innovation_coach' ||
      user.globalRoles?.some((r: string) => ['coach', 'innovation_coach'].includes(r)) ||
      user.timRoles?.some((r: any) => (r.timId === timId || !r.timId) && ['coach', 'innovation_coach'].includes(r.roleCode))
    );
    const isCoachOrAdmin = isAdmin || isCoach;

    // Ambil baris metrik rencana yang saat ini ada di DB sebelum di-delete
    const currentDbMetrikRows = planId
      ? await db
          .select()
          .from(rencanaValidasiMetrik)
          .where(
            and(
              eq(rencanaValidasiMetrik.planId, planId),
              eq(rencanaValidasiMetrik.fase, "market_validation")
            )
          )
      : [];

    // Jika BUKAN Coach/Admin, lakukan validasi proteksi baris baku Section E:
    if (!isCoachOrAdmin && metrikList) {
      const expectedStandardRows = currentDbMetrikRows.length > 0
        ? currentDbMetrikRows.filter((dbM) =>
            MV_METRIK_ROWS_STATIC.some((s) => isCanonicalMvMetricMatch(s.metrik, dbM.metrik))
          )
        : MV_METRIK_ROWS_STATIC;

      for (const stdRow of expectedStandardRows) {
        const matchInPayload = metrikList.find((m: any) =>
          (m.isStandard && isCanonicalMvMetricMatch(m.defaultMetrik || m.metrik, stdRow.metrik)) ||
          isCanonicalMvMetricMatch(m.metrik, stdRow.metrik)
        );

        if (!matchInPayload) {
          return {
            success: false,
            error: `Forbidden: Hanya Innovation Coach atau Administrator yang berwenang untuk menghapus parameter Metrik Baku Juklak ("${stdRow.metrik}").`,
          };
        }

        const baseStatic = MV_METRIK_ROWS_STATIC.find((s) => isCanonicalMvMetricMatch(s.metrik, stdRow.metrik));
        const originalValidasi = (baseStatic?.validasi || stdRow.validasi || '').toLowerCase().replace(/\s+/g, '');
        const payloadValidasi = (matchInPayload.validasi || '').toLowerCase().replace(/\s+/g, '');
        if (originalValidasi && payloadValidasi && originalValidasi !== payloadValidasi) {
          return {
            success: false,
            error: `Forbidden: Hanya Innovation Coach atau Administrator yang berwenang untuk mengubah kategori validasi Metrik Baku Juklak ("${stdRow.metrik}").`,
          };
        }
      }
    }

    await db
      .delete(rencanaValidasiMetrik)
      .where(
        and(
          eq(rencanaValidasiMetrik.planId, planId),
          eq(rencanaValidasiMetrik.fase, "market_validation")
        )
      );

    if (metrikList && metrikList.length > 0) {
      const validMetrik = metrikList.map((m: any) => ({
        planId: planId!,
        fase: "market_validation",
        validasi: m.validasi,
        metrik: m.metrik?.trim() || m.defaultMetrik || "Metrik",
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

    if (signatureRevoked) {
      await logAudit({
        userId: user.id,
        userName: user.nama,
        action: "MV_PLAN_EDITED_AFTER_SIGN",
        entity: "market_validation_plan",
        entityId: planId,
        details: {
          timId,
          changedFields: changedFields.length > 0 ? changedFields : ['Pembaruan Fitur/Resource/Metrik'],
          revokedSignatures: [
            existing?.ttdDisusun ? 'Project Owner' : null,
            existing?.ttdDiperiksa ? 'Coach' : null,
            existing?.ttdDisetujui ? 'Promotor' : null,
          ].filter(Boolean),
          note: 'Tanda tangan dibatalkan otomatis karena rencana diubah setelah penandatanganan.',
        },
      });
    } else {
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
    }

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true, planId, signatureRevoked };
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

    const permCode = `mv_plan.sign_${roleType}`;
    const allowed = await hasPermission(user, permCode, timId);
    if (!allowed) {
      return {
        success: false,
        error: `Forbidden: Role Anda tidak memiliki izin menandatangani Perencanaan MV (${permCode}).`,
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka untuk penandatanganan rencana.",
      };
    }

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

    // ── Role-gate enforcement: Admin IC bypasses identity check, per_tim requires assignment match ──
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
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
      role: roleType,
      jabatan: anggota?.jabatan || defaultRoleTitle,
      unit: anggota?.unitKerja || "PT Pegadaian (Persero)",
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
    return { success: false, error: error.message || "Gagal menandatangani Rencana Market Validation." };
  }
}

export async function revokeMvPlanSignatureAction(
  timId: string,
  roleType: "po" | "coach" | "promotor"
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const permCode = `mv_plan.sign_${roleType}`;
    const allowed = (await hasPermission(user, permCode, timId)) || (await hasPermission(user, 'market_val.edit', timId));
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin membatalkan tanda tangan role ini.",
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
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

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka untuk pengisian laporan.",
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

    const isPermitted = (await hasPermission(user, 'market_val.approve', timId)) || (await hasPermission(user, 'mv_report.sign_promotor', timId));
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk menyetujui Market Validation Report tim ini.',
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka untuk persetujuan laporan.",
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
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    const rolesData = await getCharterRolesData(timId);

    if (!isAdmin) {
      const assignedPromotor = rolesData?.assignments?.find((a: any) => a.roleCode === 'promotor');
      if (!assignedPromotor?.userId || assignedPromotor.userId !== user.id) {
        return {
          success: false,
          error: 'Forbidden: Hanya pemegang role Promotor yang terdaftar di Innovation Charter tim ini yang dapat menyetujui.',
        };
      }
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

    const assignedName = rolesData?.assignments?.find((r: any) => r.roleCode === 'promotor')?.userName;
    const processedImageUrl = await processMvSignatureImage(timId, signatureImage);

    const approvalData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || 'Promotor Inovasi',
      unit: anggota?.unitKerja || 'PT Pegadaian (Persero)',
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

    const isPermitted = (await hasPermission(user, 'market_val.approve', timId)) || (await hasPermission(user, 'mv_report.sign_promotor', timId)) || (await hasPermission(user, 'market_val.edit', timId));
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk membatalkan persetujuan Market Validation Report tim ini.',
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const assignedPromotor = rolesData?.assignments?.find((a: any) => a.roleCode === 'promotor');
      if (!assignedPromotor?.userId || assignedPromotor.userId !== user.id) {
        return {
          success: false,
          error: 'Forbidden: Anda tidak berwenang membatalkan persetujuan role Promotor tim ini.',
        };
      }
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
      details: { timId, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan persetujuan Market Validation Report.' };
  }
}

/**
 * Tandatangani Market Validation Report (Peran PO, Coach, atau Promotor)
 */
export async function signMvReportAction(
  timId: string,
  roleType: "po" | "coach" | "promotor",
  signatureDataUrl: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const permCode = `mv_report.sign_${roleType}`;
    const allowed = await hasPermission(user, permCode, timId);
    if (!allowed) {
      return {
        success: false,
        error: `Forbidden: Role Anda tidak memiliki izin menandatangani Laporan MV (${permCode}).`,
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka untuk penandatanganan laporan.",
      };
    }

    const [plan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      return { success: false, error: "Market Validation Plan belum dibuat." };
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

    const defaultJabatan =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";

    const rolesData = await getCharterRolesData(timId);
    const targetRoleCode = roleType === "po" ? "project_owner" : roleType === "coach" ? "coach" : "promotor";

    // ── Role-gate enforcement: Admin IC bypasses identity check, per_tim requires assignment match ──
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
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
      unit: anggota?.unitKerja || "PT Pegadaian (Persero)",
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

    const permCode = `mv_report.sign_${roleType}`;
    const allowed = (await hasPermission(user, permCode, timId)) || (await hasPermission(user, 'market_val.edit', timId));
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin membatalkan tanda tangan role ini.",
      };
    }

    const isMvUnlocked = await isMarketValidationUnlockedForUser(user, timId);
    if (!isMvUnlocked) {
      return {
        success: false,
        error: "Forbidden: Gerbang fase Market Validation belum terbuka.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
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

    let activePlan: any = plan;

    if (!activePlan) {
      const [dossier] = await db
        .select({ snapshotData: dossierPiaArchive.snapshotData })
        .from(dossierPiaArchive)
        .where(eq(dossierPiaArchive.timInovatorId, timId))
        .limit(1);
      const snap = (dossier?.snapshotData as any) || {};
      const gf = snap.hasil_grand_final || snap.data_submisi?.hasil_grand_final;
      if (gf) {
        activePlan = {
          mvpVersion: "v1.0-pilot",
          channelRelease: "Internal / Pilot Channel",
          deskripsiMvp: gf.solution || "",
          fiturMvpDirilis: Array.isArray(gf.fitur_utama) ? gf.fitur_utama.join(', ') : String(gf.fitur_utama || ""),
        };
      }
    }

    if (!activePlan) {
      return {
        success: false,
        error: "Form MVP Release Plan belum disimpan dan data Grand Final tidak ditemukan.",
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

    const mappingFitur = plan ? await db
      .select()
      .from(mvpMappingFitur)
      .where(eq(mvpMappingFitur.planId, plan.id)) : [];
    const resources = plan ? await db
      .select()
      .from(mvpResourcesNeeded)
      .where(eq(mvpResourcesNeeded.planId, plan.id)) : [];
    const metrik = plan ? await db
      .select()
      .from(rencanaValidasiMetrik)
      .where(
        and(
          eq(rencanaValidasiMetrik.planId, plan.id),
          eq(rencanaValidasiMetrik.fase, "market_validation")
        )
      ) : [];

    const [teamDossier] = await db
      .select({ snapshotData: dossierPiaArchive.snapshotData })
      .from(dossierPiaArchive)
      .where(eq(dossierPiaArchive.timInovatorId, timId))
      .limit(1);

    const snap = (teamDossier?.snapshotData as any) || {};
    const hasilGrandFinal = snap.hasil_grand_final || snap.data_submisi?.hasil_grand_final || null;

    // Call AI / Fallback Generator
    const generatedTasks = await generateAiBacklogFromMvPlan({
      teamId: timId,
      namaProyek,
      totalSprints,
      plan: {
        mvpVersion: activePlan.mvpVersion,
        channelRelease: activePlan.channelRelease,
        periodeReleaseMulai: activePlan.periodeReleaseMulai ? (activePlan.periodeReleaseMulai instanceof Date ? activePlan.periodeReleaseMulai.toISOString() : String(activePlan.periodeReleaseMulai)) : null,
        periodeReleaseSelesai: activePlan.periodeReleaseSelesai ? (activePlan.periodeReleaseSelesai instanceof Date ? activePlan.periodeReleaseSelesai.toISOString() : String(activePlan.periodeReleaseSelesai)) : null,
        deskripsiMvp: activePlan.deskripsiMvp,
        deskripsiProsesMvp: activePlan.deskripsiProsesMvp,
        fiturMvpDirilis: activePlan.fiturMvpDirilis,
        targetEarlyAdopters: activePlan.targetEarlyAdopters,
        lokasiPilot: activePlan.lokasiPilot,
        jumlahTargetPengguna: activePlan.jumlahTargetPengguna,
        daftarEarlyAdopters: activePlan.daftarEarlyAdopters,
        batasanScopeMvp: activePlan.batasanScopeMvp,
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
      grandFinalContext: hasilGrandFinal
        ? {
            fitur_utama: hasilGrandFinal.fitur_utama,
            business_impact: hasilGrandFinal.business_impact,
            risk_mitigation: hasilGrandFinal.risk_mitigation,
          }
        : null,
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

/**
 * Mengambil riwayat perubahan Market Validation Plan yang tercatat di audit_logs,
 * khususnya yang memicu pembatalan tanda tangan otomatis maupun penyimpanan data.
 */
export async function getMvPlanAuditHistoryAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entity, "market_validation_plan"),
          sql`${auditLogs.details}->>'timId' = ${timId}`
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    return { success: true, logs };
  } catch (error: any) {
    console.error("[getMvPlanAuditHistoryAction] Error:", error);
    return { success: false, error: error.message || "Gagal mengambil riwayat perubahan." };
  }
}

