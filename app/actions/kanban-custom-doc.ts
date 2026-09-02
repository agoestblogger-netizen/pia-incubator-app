"use server";

import { db } from "@/lib/db";
import {
  kanbanCard,
  kanbanSubtask,
  customerValidationPlan,
  customerValidationReport,
  customerValidationTemuanKualitatif,
  customerTestingFeedbackResponden,
  marketValidationPlan,
  marketValidationReport,
  mvReleaseLog,
  hasilValidasiMetrik,
  dfvRekapitulasi,
  rencanaValidasiMetrik,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { randomUUID } from "crypto";
import { detectCvBakuCardType, type CvBakuCardType } from "@/lib/utils/cv-cards";
import { detectMvBakuCardType, type MvBakuCardType } from "@/lib/utils/mv-cards";
import { METRIK_ROWS } from "@/lib/data/cv-metrics";
import { TEMUAN_KUALITATIF_BAKU_ROWS } from "@/lib/data/subtask-templates";

export { type CvBakuCardType, type MvBakuCardType };

/**
 * Menyimpan data dokumen kerja kustom ke kartu kanban (kanban_card.custom_document_data)
 */
export async function saveCardCustomDocAction(
  timId: string,
  cardId: string,
  customDocData: Record<string, any>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit kartu Kanban tim ini.",
      };
    }

    await db
      .update(kanbanCard)
      .set({
        customDocumentData: customDocData,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCard.id, cardId));

    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/market-validation`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan dokumen kerja kartu." };
  }
}

/**
 * Mengecek apakah field target di Report (CV atau MV) sudah terisi
 * (untuk konfirmasi timpa sebelum user klik simpan ke laporan)
 */
export async function checkReportFieldHasDataAction(timId: string, cardId: string) {
  try {
    const [card] = await db
      .select({ id: kanbanCard.id, judul: kanbanCard.judul, tahap: kanbanCard.tahap })
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!card) return { hasData: false, currentPreview: null, cardType: null };

    const cvCardType = detectCvBakuCardType(card.judul, card.tahap || undefined);
    const mvCardType = detectMvBakuCardType(card.judul, card.tahap || undefined);

    if (!cvCardType && !mvCardType) {
      return { hasData: false, currentPreview: null, cardType: null };
    }

    // ── Check Customer Validation Report ──
    if (cvCardType) {
      const [plan] = await db
        .select()
        .from(customerValidationPlan)
        .where(eq(customerValidationPlan.timInovatorId, timId))
        .limit(1);

      if (!plan) return { hasData: false, currentPreview: null, cardType: cvCardType };

      const [report] = await db
        .select()
        .from(customerValidationReport)
        .where(eq(customerValidationReport.planId, plan.id))
        .limit(1);

      if (!report) return { hasData: false, currentPreview: null, cardType: cvCardType };

      let hasData = false;
      let currentPreview = "";

      switch (cvCardType) {
        case "prototype":
          if (report.prototypeSolusiLink && report.prototypeSolusiLink.trim().length > 0) {
            hasData = true;
            currentPreview = report.prototypeSolusiLink;
          }
          break;
        case "responden":
          if (report.jumlahRespondenAktual || report.profilRespondenAktual) {
            hasData = true;
            currentPreview = `${report.jumlahRespondenAktual || 0} responden — ${report.profilRespondenAktual || ""}`;
          }
          break;
        case "testing":
          if (report.mekanismeUserTesting || report.tanggalLokasiTesting) {
            hasData = true;
            currentPreview = `${report.mekanismeUserTesting || ""} (${report.tanggalLokasiTesting || ""})`;
          }
          break;
        case "analisis":
          if (report.validatedSolution || report.ketercapaianPsf || report.kesimpulan) {
            hasData = true;
            currentPreview = `PSF: ${report.ketercapaianPsf || "-"}`;
          }
          break;
        case "sme":
          hasData = false;
          break;
        case "keputusan":
          if (report.keputusan) {
            hasData = true;
            currentPreview = report.keputusan;
          }
          break;
      }

      return {
        hasData,
        currentPreview: hasData ? currentPreview : null,
        cardType: cvCardType,
      };
    }

    // ── Check Market Validation Report ──
    if (mvCardType) {
      const [plan] = await db
        .select()
        .from(marketValidationPlan)
        .where(eq(marketValidationPlan.timInovatorId, timId))
        .limit(1);

      if (!plan) return { hasData: false, currentPreview: null, cardType: mvCardType };

      const [report] = await db
        .select()
        .from(marketValidationReport)
        .where(eq(marketValidationReport.planId, plan.id))
        .limit(1);

      if (!report) return { hasData: false, currentPreview: null, cardType: mvCardType };

      let hasData = false;
      let currentPreview = "";

      switch (mvCardType) {
        case "mvp_release":
          if (report.ringkasanAktivitasRilis || report.jumlahEarlyAdoptersAktual) {
            hasData = true;
            currentPreview = `${report.mvpVersionDilaporkan || "MVP"} — ${report.jumlahEarlyAdoptersAktual || 0} pengguna`;
          }
          break;
        case "market_testing": {
          const count = await db
            .select()
            .from(hasilValidasiMetrik)
            .where(
              and(
                eq(hasilValidasiMetrik.reportId, report.id),
                eq(hasilValidasiMetrik.fase, "market_validation")
              )
            );
          if (count.length > 0) {
            hasData = true;
            currentPreview = `${count.length} metrik DFV sudah terukur`;
          }
          break;
        }
        case "sme_mv": {
          const mvBukti = Array.isArray(report.catatanReviewSme) ? report.catatanReviewSme : [];
          const mvCatatan = mvBukti.find((b: any) => b.type === "catatan_sme");
          if (mvCatatan?.content?.trim()) {
            hasData = true;
            currentPreview = `Review oleh ${mvCatatan.reviewer || "SME"} — ${mvCatatan.content.slice(0, 40)}...`;
          }
          break;
        }
        case "analisis_mv":
          if (report.kesimpulanPmf || report.keputusanGoNogo) {
            hasData = true;
            currentPreview = `PMF: ${report.kesimpulanPmf?.slice(0, 30) || "-"} (Keputusan: ${report.keputusanGoNogo || "-"})`;
          }
          break;
      }

      return {
        hasData,
        currentPreview: hasData ? currentPreview : null,
        cardType: mvCardType,
      };
    }

    return { hasData: false, currentPreview: null, cardType: null };
  } catch (error: any) {
    return { hasData: false, currentPreview: null, cardType: null };
  }
}

/**
 * Menyinkronkan isi Dokumen Kerja Kustom Kartu ke Laporan (Customer Validation atau Market Validation)
 */
export async function syncCardCustomDocToReportAction(
  timId: string,
  cardId: string,
  customDocData: Record<string, any>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const [card] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!card) {
      return { success: false, error: "Kartu tidak ditemukan." };
    }

    const cvCardType = detectCvBakuCardType(card.judul, card.tahap || undefined);
    const mvCardType = detectMvBakuCardType(card.judul, card.tahap || undefined);

    if (!cvCardType && !mvCardType) {
      return {
        success: false,
        error: "Kartu ini bukan kartu baku yang memiliki integrasi ke Laporan.",
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ALUR A: CUSTOMER VALIDATION REPORT SYNC
    // ═════════════════════════════════════════════════════════════════════════
    if (cvCardType) {
      const allowed = await hasPermission(user, "cust_val.edit", timId);
      if (!allowed) {
        return {
          success: false,
          error: "Forbidden: Anda tidak memiliki izin untuk mengedit Customer Validation tim ini.",
        };
      }

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

      const reportUpdates: any = { updatedAt: new Date() };
      let syncedDetails = "";

      switch (cvCardType) {
        case "prototype": {
          reportUpdates.prototypeSolusiLink = customDocData.prototypeLink || null;
          syncedDetails = `Prototype Solusi Link: ${customDocData.prototypeLink || ""}`;
          break;
        }
        case "responden": {
          const jlh = customDocData.jumlahRespondenAktual;
          reportUpdates.jumlahRespondenAktual =
            jlh !== undefined && jlh !== null && jlh !== "" ? Number(jlh) : null;
          reportUpdates.profilRespondenAktual = customDocData.profilRespondenAktual || null;
          syncedDetails = `Jumlah: ${jlh || 0}, Profil: ${customDocData.profilRespondenAktual || ""}`;
          break;
        }
        case "testing": {
          reportUpdates.mekanismeUserTesting = customDocData.mekanismeUserTesting || null;
          reportUpdates.tanggalLokasiTesting = customDocData.tanggalLokasiTesting || null;

          const feedbackRows: any[] = Array.isArray(customDocData.feedbackRows)
            ? customDocData.feedbackRows
            : [];

          await db
            .delete(customerTestingFeedbackResponden)
            .where(
              and(
                eq(customerTestingFeedbackResponden.reportId, report.id),
                eq(customerTestingFeedbackResponden.sourceCardId, cardId)
              )
            );

          if (feedbackRows.length > 0) {
            const insertPayload = feedbackRows
              .filter((r) => r.respondenProfil && r.respondenProfil.trim().length > 0)
              .map((r) => ({
                reportId: report.id,
                sourceCardId: cardId,
                respondenProfil: r.respondenProfil.trim(),
                usabilitySkorFeedback: r.usability || null,
                functionalitySkorFeedback: r.functionality || null,
                solvabilitySkorFeedback: r.solvability || null,
                payabilitySkorFeedback: r.payability || null,
                others: r.others || null,
                priorityInsightAction: r.priorityInsightAction || null,
              }));

            if (insertPayload.length > 0) {
              await db.insert(customerTestingFeedbackResponden).values(insertPayload);
            }
          }

          syncedDetails = `Mekanisme & Feedback Matrix (${feedbackRows.length} responden)`;
          break;
        }
        case "analisis": {
          reportUpdates.validatedSolution = customDocData.validatedSolution || null;
          reportUpdates.ketercapaianPsf = customDocData.ketercapaianPsf || null;
          reportUpdates.kesimpulan = customDocData.kesimpulan || null;
          syncedDetails = `Validated Solution & Ketercapaian PSF (${customDocData.ketercapaianPsf || "-"})`;
          break;
        }
        case "sme": {
          const existingBukti = Array.isArray(report.catatanReviewSme) ? report.catatanReviewSme : [];
          const filtered = existingBukti.filter(
            (b: any) =>
              !(
                b.sourceCardId === cardId &&
                (b.type === "catatan_sme" || b.type === "dokumen_preliminary_review")
              )
          );

          if (customDocData.catatanSme?.trim()) {
            filtered.push({
              id: randomUUID(),
              type: "catatan_sme",
              content: customDocData.catatanSme.trim(),
              reviewer: customDocData.reviewerNama || "SME / Innovation Coach",
              tanggal: customDocData.tanggalReview || new Date().toISOString(),
              sourceCardId: cardId,
            });
          }

          const files: Array<{ url: string; name: string; size?: number; type?: string }> =
            Array.isArray(customDocData.dokumenFiles) ? customDocData.dokumenFiles : [];

          for (const f of files) {
            if (f.url) {
              filtered.push({
                id: randomUUID(),
                type: "dokumen_preliminary_review",
                file_url: f.url,
                file_name: f.name || "Dokumen Preliminary Review",
                file_size: f.size || null,
                tanggal: new Date().toISOString(),
                sourceCardId: cardId,
              });
            }
          }

          reportUpdates.catatanReviewSme = filtered;
          syncedDetails = `Review SME & ${files.length} Dokumen ditambahkan ke Catatan Review SME`;
          break;
        }
        case "keputusan": {
          reportUpdates.keputusan = customDocData.keputusan || null;
          if (customDocData.catatanKeputusan) {
            reportUpdates.catatanMvpPlanning = customDocData.catatanKeputusan;
          }
          syncedDetails = `Keputusan Gerbang Fase: ${customDocData.keputusan || "-"}`;
          break;
        }
      }

      await db
        .update(customerValidationReport)
        .set(reportUpdates)
        .where(eq(customerValidationReport.id, report.id));

      await logAudit({
        userId: user.id,
        userName: user.nama,
        action: "CUST_VAL_CARD_CUSTOM_DOC_SYNC",
        entity: "customer_validation_report",
        entityId: report.id,
        details: { timId, cardId, cardTitle: card.judul, cardType: cvCardType, syncedDetails },
      });

      revalidatePath(`/tim/${timId}/customer-validation`);
      revalidatePath(`/tim/${timId}/kanban`);
      revalidatePath(`/tim/${timId}/market-validation`);

      return { success: true, cardType: cvCardType, syncedDetails, reportId: report.id };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ALUR B: MARKET VALIDATION REPORT SYNC
    // ═════════════════════════════════════════════════════════════════════════
    if (mvCardType) {
      const allowed = await hasPermission(user, "market_val.edit", timId);
      if (!allowed) {
        return {
          success: false,
          error: "Forbidden: Anda tidak memiliki izin untuk mengedit Market Validation tim ini.",
        };
      }

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

      const reportUpdates: any = { updatedAt: new Date() };
      let syncedDetails = "";

      switch (mvCardType) {
        // 1. MVP Release
        case "mvp_release": {
          reportUpdates.mvpVersionDilaporkan = customDocData.mvpVersion || null;
          reportUpdates.periodeRilisMulai = customDocData.periodeRilisMulai
            ? new Date(customDocData.periodeRilisMulai)
            : null;
          reportUpdates.periodeRilisSelesai = customDocData.periodeRilisSelesai
            ? new Date(customDocData.periodeRilisSelesai)
            : null;
          reportUpdates.lokasiChannelRilis = customDocData.channelRelease || null;
          reportUpdates.jumlahEarlyAdoptersAktual = customDocData.jumlahEarlyAdoptersAktual
            ? Number(customDocData.jumlahEarlyAdoptersAktual)
            : null;
          reportUpdates.ringkasanAktivitasRilis = customDocData.ringkasanAktivitasRilis || null;
          reportUpdates.kendalaUtama = customDocData.kendalaUtama || null;
          reportUpdates.perubahanDariPlan = customDocData.perubahanDariPlan || null;

          // Sync mvReleaseLog
          const releaseLogs: any[] = Array.isArray(customDocData.releaseLogs)
            ? customDocData.releaseLogs
            : [];

          await db.delete(mvReleaseLog).where(eq(mvReleaseLog.reportId, report.id));

          if (releaseLogs.length > 0) {
            const validLogs = releaseLogs
              .filter((r) => r.aktivitas && r.aktivitas.trim().length > 0)
              .map((r) => ({
                reportId: report.id,
                tanggal: r.tanggal ? new Date(r.tanggal) : new Date(),
                aktivitas: r.aktivitas.trim(),
                output: r.output || null,
                dataEvidence: r.dataEvidence || null,
                pic: r.pic || null,
                catatan: r.catatan || null,
              }));

            if (validLogs.length > 0) {
              await db.insert(mvReleaseLog).values(validLogs);
            }
          }

          syncedDetails = `Rilis MVP ${customDocData.mvpVersion || ""} & ${releaseLogs.length} Log Rilis`;
          break;
        }

        // 2. Market Testing (Ukur Metrik DFV)
        case "market_testing": {
          const metrikResults: any[] = Array.isArray(customDocData.metrikResults)
            ? customDocData.metrikResults
            : [];

          await db
            .delete(hasilValidasiMetrik)
            .where(
              and(
                eq(hasilValidasiMetrik.reportId, report.id),
                eq(hasilValidasiMetrik.fase, "market_validation")
              )
            );

          if (metrikResults.length > 0) {
            const validRows = metrikResults.map((m) => ({
              reportId: report.id,
              fase: "market_validation",
              validasi: m.validasi,
              metrik: m.metrik,
              target: m.target || null,
              hasilAktual: m.hasilAktual || null,
              persenTercapai: m.persenTercapai ? parseFloat(m.persenTercapai) : null,
              status: m.status || "belum",
              learning: m.learning || null,
              enhancement: m.enhancement || null,
            }));

            await db.insert(hasilValidasiMetrik).values(validRows);
          }

          syncedDetails = `Hasil Pengukuran ${metrikResults.length} Metrik DFV`;
          break;
        }

        // 3. Preliminary Review SME (MV)
        case "sme_mv": {
          const existingBukti = Array.isArray(report.catatanReviewSme) ? report.catatanReviewSme : [];
          const filtered = existingBukti.filter(
            (b: any) =>
              !(
                b.sourceCardId === cardId &&
                (b.type === "catatan_sme" || b.type === "dokumen_preliminary_review")
              )
          );

          if (customDocData.catatanSme?.trim()) {
            filtered.push({
              id: randomUUID(),
              type: "catatan_sme",
              content: customDocData.catatanSme.trim(),
              reviewer: customDocData.reviewerNama || "SME / Innovation Coach",
              tanggal: customDocData.tanggalReview || new Date().toISOString(),
              sourceCardId: cardId,
            });
          }

          const files: Array<{ url: string; name: string; size?: number; type?: string }> =
            Array.isArray(customDocData.dokumenFiles) ? customDocData.dokumenFiles : [];

          for (const f of files) {
            if (f.url) {
              filtered.push({
                id: randomUUID(),
                type: "dokumen_preliminary_review",
                file_url: f.url,
                file_name: f.name || "Dokumen Preliminary Review",
                file_size: f.size || null,
                tanggal: new Date().toISOString(),
                sourceCardId: cardId,
              });
            }
          }

          reportUpdates.catatanReviewSme = filtered;
          syncedDetails = `Review SME & ${files.length} Dokumen ditambahkan ke Catatan Review SME MV`;
          break;
        }

        // 4. Analisis Hasil & Laporan MV
        case "analisis_mv": {
          reportUpdates.kesimpulanPmf = customDocData.kesimpulanPmf || null;
          reportUpdates.keputusanGoNogo = customDocData.keputusanGoNogo || null;
          reportUpdates.rekomendasiIterasi = customDocData.rekomendasiIterasi || null;
          reportUpdates.rencanaMvpBerikutnya = customDocData.rencanaMvpBerikutnya || null;
          reportUpdates.rekomendasiPromotorSponsor = customDocData.rekomendasiPromotorSponsor || null;

          // Sync dfvRekapitulasi
          const dfvRows: any[] = Array.isArray(customDocData.dfvRekapitulasiRows)
            ? customDocData.dfvRekapitulasiRows
            : [];

          await db.delete(dfvRekapitulasi).where(eq(dfvRekapitulasi.reportId, report.id));

          if (dfvRows.length > 0) {
            const validDfv = dfvRows.map((r) => ({
              reportId: report.id,
              kategoriDfv: r.kategoriDfv,
              rataRataKetercapaian: parseFloat(r.rataRataKetercapaian) || 0,
              threshold: parseFloat(r.threshold) || 70,
              status: r.status || "lolos",
              catatanKeputusan: r.catatanKeputusan || null,
            }));

            await db.insert(dfvRekapitulasi).values(validDfv);
          }

          syncedDetails = `Kesimpulan PMF, Rekapitulasi DFV, & Keputusan Gerbang FMI (${customDocData.keputusanGoNogo || "-"})`;
          break;
        }
      }

      await db
        .update(marketValidationReport)
        .set(reportUpdates)
        .where(eq(marketValidationReport.id, report.id));

      await logAudit({
        userId: user.id,
        userName: user.nama,
        action: "MARKET_VAL_CARD_CUSTOM_DOC_SYNC",
        entity: "market_validation_report",
        entityId: report.id,
        details: { timId, cardId, cardTitle: card.judul, cardType: mvCardType, syncedDetails },
      });

      revalidatePath(`/tim/${timId}/market-validation`);
      revalidatePath(`/tim/${timId}/kanban`);

      return { success: true, cardType: mvCardType, syncedDetails, reportId: report.id };
    }

    return { success: false, error: "Tipe kartu tidak dikenali." };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal menyinkronkan dokumen kerja ke Laporan.",
    };
  }
}

const DEFAULT_MV_DFV_METRICS = [
  { validasi: "desirability", metrik: "Tingkat adopsi fitur inti MVP oleh early adopters", baseline: "0%", target: "80%", threshold: "70%" },
  { validasi: "desirability", metrik: "Tingkat retensi mingguan pengguna aktif MVP", baseline: "0%", target: "60%", threshold: "50%" },
  { validasi: "desirability", metrik: "Skor kepuasan pengguna (CSAT / NPS) terhadap MVP", baseline: "0", target: "4.0/5.0", threshold: "3.5/5.0" },
  { validasi: "feasibility", metrik: "Tingkat ketersediaan & stabilitas sistem MVP (Uptime)", baseline: "0%", target: "99%", threshold: "95%" },
  { validasi: "feasibility", metrik: "Kecepatan response time & performa transaksi inti", baseline: "0s", target: "< 3 detik", threshold: "< 5 detik" },
  { validasi: "feasibility", metrik: "Kepatuhan SOP & integrasi operasional unit kerja", baseline: "0%", target: "100%", threshold: "80%" },
  { validasi: "viability", metrik: "Rasio efisiensi biaya & waktu proses per transaksi", baseline: "0%", target: "50%", threshold: "30%" },
  { validasi: "viability", metrik: "Proyeksi potensi revenue / cost savings per bulan", baseline: "Rp 0", target: "Rp 100 Juta", threshold: "Rp 50 Juta" },
  { validasi: "viability", metrik: "Unit economics & payback period model bisnis", baseline: "0 bln", target: "< 12 bulan", threshold: "< 18 bulan" },
];

/**
 * Mengambil data awal untuk modal subtask wajib (mandatory subtask)
 */
export async function getMandatorySubtaskDataAction(
  timId: string,
  cardId: string,
  mappingField: string
) {
  try {
    // ── MV Mapping Fields ──
    if (["mvp_release_data", "dfv_traction_measurement", "kesimpulan_keputusan_mv", "preliminary_review_mv"].includes(mappingField)) {
      let [mvPlan] = await db
        .select()
        .from(marketValidationPlan)
        .where(eq(marketValidationPlan.timInovatorId, timId))
        .limit(1);

      let [mvReport] = mvPlan
        ? await db
            .select()
            .from(marketValidationReport)
            .where(eq(marketValidationReport.planId, mvPlan.id))
            .limit(1)
        : [null];

      let data: Record<string, any> = {};

      switch (mappingField) {
        case "mvp_release_data":
          data = {
            mvpVersionDilaporkan: mvReport?.mvpVersionDilaporkan || "MVP 1.0",
            periodeRilisMulai: mvReport?.periodeRilisMulai
              ? new Date(mvReport.periodeRilisMulai).toISOString().split("T")[0]
              : "",
            periodeRilisSelesai: mvReport?.periodeRilisSelesai
              ? new Date(mvReport.periodeRilisSelesai).toISOString().split("T")[0]
              : "",
            lokasiChannelRilis: mvReport?.lokasiChannelRilis || "",
            jumlahEarlyAdoptersAktual: mvReport?.jumlahEarlyAdoptersAktual ?? "",
            ringkasanAktivitasRilis: mvReport?.ringkasanAktivitasRilis || "",
            kendalaUtama: mvReport?.kendalaUtama || "",
            perubahanDariPlan: mvReport?.perubahanDariPlan || "",
          };
          break;

        case "dfv_traction_measurement": {
          let existingRows: any[] = [];
          if (mvReport) {
            existingRows = await db
              .select()
              .from(hasilValidasiMetrik)
              .where(
                and(
                  eq(hasilValidasiMetrik.reportId, mvReport.id),
                  eq(hasilValidasiMetrik.fase, "market_validation")
                )
              );
          }

          if (existingRows.length > 0) {
            data = {
              dfvMeasurementRows: existingRows.map((r) => ({
                id: r.id,
                validasi: r.validasi,
                metrik: r.metrik,
                baseline: "-",
                target: r.target || "-",
                threshold: "70%",
                hasilAktual: r.hasilAktual || "",
                persenTercapai: r.persenTercapai,
                status: r.status || "belum",
                learning: r.learning || "",
                enhancement: r.enhancement || "",
              })),
            };
          } else {
            let planMetrikRows: any[] = [];
            if (mvPlan) {
              planMetrikRows = await db
                .select()
                .from(rencanaValidasiMetrik)
                .where(
                  and(
                    eq(rencanaValidasiMetrik.planId, mvPlan.id),
                    eq(rencanaValidasiMetrik.fase, "market_validation")
                  )
                );
            }

            if (planMetrikRows.length >= 9) {
              data = {
                dfvMeasurementRows: planMetrikRows.map((r) => ({
                  id: r.id,
                  validasi: r.validasi,
                  metrik: r.metrik,
                  baseline: r.baseline || "-",
                  target: r.target || "-",
                  threshold: r.threshold || "70%",
                  hasilAktual: "",
                  persenTercapai: null,
                  status: "belum",
                  learning: "",
                  enhancement: "",
                })),
              };
            } else {
              data = {
                dfvMeasurementRows: DEFAULT_MV_DFV_METRICS.map((m, idx) => ({
                  id: `default_${idx}`,
                  ...m,
                  hasilAktual: "",
                  persenTercapai: null,
                  status: "belum",
                  learning: "",
                  enhancement: "",
                })),
              };
            }
          }
          break;
        }

        case "kesimpulan_keputusan_mv":
          data = {
            kesimpulanPmf: mvReport?.kesimpulanPmf || "",
            keputusanGoNogo: mvReport?.keputusanGoNogo || "go_ke_fmi",
            rekomendasiIterasi: mvReport?.rekomendasiIterasi || "",
            rencanaMvpBerikutnya: mvReport?.rencanaMvpBerikutnya || "",
            rekomendasiPromotorSponsor: mvReport?.rekomendasiPromotorSponsor || "",
          };
          break;

        case "preliminary_review_mv": {
          // Load existing catatan SME dan dokumen dari catatanReviewSme MV
          const mvBukti = Array.isArray(mvReport?.catatanReviewSme) ? mvReport!.catatanReviewSme : [];
          const mvCatatanObj = mvBukti.find(
            (b: any) => b.type === "catatan_sme" && b.sourceCardId === cardId
          );
          const mvDocs = mvBukti.filter(
            (b: any) => b.type === "dokumen_preliminary_review" && b.sourceCardId === cardId
          );
          data = {
            catatanSme: mvCatatanObj?.content || "",
            reviewerNama: mvCatatanObj?.reviewer || "",
            tanggalReview: mvCatatanObj?.tanggal
              ? new Date(mvCatatanObj.tanggal).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            dokumenFiles: mvDocs.map((d: any) => ({
              name: d.file_name || d.name,
              url: d.file_url || d.url,
              size: d.size,
            })),
          };
          break;
        }
      }

      return { success: true, data };
    }

    // ── CV Mapping Fields (Default) ──
    let [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      return { success: true, data: {} };
    }

    let [report] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, plan.id))
      .limit(1);

    if (!report) {
      return { success: true, data: {} };
    }

    let data: Record<string, any> = {};

    switch (mappingField) {
      case "prototype_link":
        data = {
          prototypeLink: report.prototypeSolusiLink || "",
        };
        break;
      case "responden_profil":
        data = {
          jumlahRespondenAktual: report.jumlahRespondenAktual ?? "",
          profilRespondenAktual: report.profilRespondenAktual || "",
        };
        break;
      case "mekanisme_lokasi":
        data = {
          mekanismeUserTesting: report.mekanismeUserTesting || "",
          tanggalLokasiTesting: report.tanggalLokasiTesting || "",
        };
        break;
      case "feedback_matrix": {
        const rows = await db
          .select()
          .from(customerTestingFeedbackResponden)
          .where(
            and(
              eq(customerTestingFeedbackResponden.reportId, report.id),
              eq(customerTestingFeedbackResponden.sourceCardId, cardId)
            )
          );
        data = {
          feedbackRows: rows.map((r) => ({
            id: r.id,
            respondenProfil: r.respondenProfil || "",
            usability: r.usabilitySkorFeedback || "",
            functionality: r.functionalitySkorFeedback || "",
            solvability: r.solvabilitySkorFeedback || "",
            payability: r.payabilitySkorFeedback || "",
            others: r.others || "",
            priorityInsightAction: r.priorityInsightAction || "",
          })),
        };
        break;
      }
      case "psf_7param_measurement": {
        let existingResults: any[] = [];
        if (report) {
          existingResults = await db
            .select()
            .from(hasilValidasiMetrik)
            .where(
              and(
                eq(hasilValidasiMetrik.reportId, report.id),
                eq(hasilValidasiMetrik.fase, "customer_validation")
              )
            );
        }
        let planMetrikRows: any[] = [];
        if (plan) {
          planMetrikRows = await db
            .select()
            .from(rencanaValidasiMetrik)
            .where(
              and(
                eq(rencanaValidasiMetrik.planId, plan.id),
                eq(rencanaValidasiMetrik.fase, "customer_validation")
              )
            );
        }

        const rows = METRIK_ROWS.map((row) => {
          const rencana = planMetrikRows.find((r) => r.metrik === row.metrik);
          const found = existingResults.find((m) => m.metrik === row.metrik);
          return {
            validasi: row.validasi,
            metrik: row.metrik,
            target: rencana?.kriteriaKesuksesan || row.kriteria || found?.target || "-",
            hasilAktual: found?.hasilAktual || "",
            interpretasi: found?.interpretasi || "",
            learning: found?.learning || "",
            enhancement: found?.enhancement || "",
          };
        });

        data = { psfMeasurementRows: rows };
        break;
      }
      case "validated_solution_psf":
        data = {
          validatedSolution: report.validatedSolution || "",
          ketercapaianPsf: report.ketercapaianPsf || "tercapai",
        };
        break;
      case "value_proposition_features":
        data = {
          valueProposition: report.valueProposition || "",
          fiturKunci1: report.fiturKunci1 || "",
          fiturKunci2: report.fiturKunci2 || "",
          fiturKunci3: report.fiturKunci3 || "",
          flowSolusi: report.flowSolusi || "",
        };
        break;
      case "temuan_kualitatif_6baris": {
        const existing = await db
          .select()
          .from(customerValidationTemuanKualitatif)
          .where(eq(customerValidationTemuanKualitatif.reportId, report.id));

        data = {
          temuanRows: TEMUAN_KUALITATIF_BAKU_ROWS.map((baku) => {
            const found = existing.find(
              (e) => e.kategori === baku.kategori || e.pertanyaanKunci === baku.pertanyaanKunci
            );
            return {
              kategori: baku.kategori,
              pertanyaanKunci: baku.pertanyaanKunci,
              temuanUtama: found?.temuanUtama || "",
            };
          }),
        };
        break;
      }
      case "kesimpulan_pembelajaran":
        data = {
          kesimpulan: report.kesimpulan || "",
        };
        break;
      case "preliminary_review": {
        const bukti = Array.isArray(report.catatanReviewSme) ? report.catatanReviewSme : [];
        const catatanObj = bukti.find((b: any) => b.type === "catatan_sme" && b.sourceCardId === cardId);
        const docs = bukti.filter(
          (b: any) => b.type === "dokumen_preliminary_review" && b.sourceCardId === cardId
        );
        data = {
          catatanSme: catatanObj?.content || "",
          reviewerNama: catatanObj?.reviewer || "",
          tanggalReview: catatanObj?.tanggal || new Date().toISOString().split("T")[0],
          dokumenFiles: docs.map((d: any) => ({
            name: d.file_name || d.name,
            url: d.file_url || d.url,
            size: d.size,
          })),
        };
        break;
      }
      case "keputusan_lanjut":
        data = {
          keputusan: report.keputusan || "lanjut",
          catatanMvpPlanning: report.catatanMvpPlanning || "",
        };
        break;
      default:
        data = {};
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat data subtask wajib." };
  }
}

/**
 * Menyimpan data dari modal subtask wajib ke Laporan CV/MV dan otomatis mencentang subtask (isDone = true)
 */
export async function saveMandatorySubtaskDataAction(
  timId: string,
  cardId: string,
  subtaskId: string,
  mappingField: string,
  payload: Record<string, any>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    // ── Check if this is an MV mapping field ──
    const isMvField = ["mvp_release_data", "dfv_traction_measurement", "kesimpulan_keputusan_mv", "preliminary_review_mv"].includes(mappingField);

    if (isMvField) {
      const allowedMv = await hasPermission(user, "market_val.edit", timId);
      if (!allowedMv) {
        return {
          success: false,
          error: "Forbidden: Anda tidak memiliki izin untuk mengedit Market Validation tim ini.",
        };
      }

      let [mvPlan] = await db
        .select()
        .from(marketValidationPlan)
        .where(eq(marketValidationPlan.timInovatorId, timId))
        .limit(1);

      if (!mvPlan) {
        const [newPlan] = await db
          .insert(marketValidationPlan)
          .values({ timInovatorId: timId })
          .returning();
        mvPlan = newPlan;
      }

      let [mvReport] = await db
        .select()
        .from(marketValidationReport)
        .where(eq(marketValidationReport.planId, mvPlan.id))
        .limit(1);

      if (!mvReport) {
        const [newReport] = await db
          .insert(marketValidationReport)
          .values({ planId: mvPlan.id })
          .returning();
        mvReport = newReport;
      }

      const mvReportUpdates: any = { updatedAt: new Date() };

      switch (mappingField) {
        case "mvp_release_data":
          mvReportUpdates.mvpVersionDilaporkan = payload.mvpVersionDilaporkan || null;
          mvReportUpdates.periodeRilisMulai = payload.periodeRilisMulai ? new Date(payload.periodeRilisMulai) : null;
          mvReportUpdates.periodeRilisSelesai = payload.periodeRilisSelesai ? new Date(payload.periodeRilisSelesai) : null;
          mvReportUpdates.lokasiChannelRilis = payload.lokasiChannelRilis || null;
          mvReportUpdates.jumlahEarlyAdoptersAktual =
            payload.jumlahEarlyAdoptersAktual !== undefined &&
            payload.jumlahEarlyAdoptersAktual !== null &&
            payload.jumlahEarlyAdoptersAktual !== ""
              ? Number(payload.jumlahEarlyAdoptersAktual)
              : null;
          mvReportUpdates.ringkasanAktivitasRilis = payload.ringkasanAktivitasRilis || null;
          mvReportUpdates.kendalaUtama = payload.kendalaUtama || null;
          mvReportUpdates.perubahanDariPlan = payload.perubahanDariPlan || null;
          break;

        case "dfv_traction_measurement": {
          const rows: any[] = Array.isArray(payload.dfvMeasurementRows) ? payload.dfvMeasurementRows : [];
          await db
            .delete(hasilValidasiMetrik)
            .where(
              and(
                eq(hasilValidasiMetrik.reportId, mvReport.id),
                eq(hasilValidasiMetrik.fase, "market_validation")
              )
            );

          if (rows.length > 0) {
            const insertPayload = rows.map((r) => {
              let pct = typeof r.persenTercapai === "number" ? r.persenTercapai : null;
              if (pct === null && r.hasilAktual && r.target) {
                const numActual = parseFloat(String(r.hasilAktual).replace(/[^0-9.-]/g, ""));
                const numTarget = parseFloat(String(r.target).replace(/[^0-9.-]/g, ""));
                if (!isNaN(numActual) && !isNaN(numTarget) && numTarget > 0) {
                  pct = Math.round((numActual / numTarget) * 100);
                }
              }
              const threshNum = parseFloat(String(r.threshold || "70").replace(/[^0-9.-]/g, "")) || 70;
              const status = pct !== null && pct >= threshNum ? "lolos" : "belum";

              return {
                reportId: mvReport.id,
                fase: "market_validation",
                validasi: r.validasi || "desirability",
                metrik: r.metrik || "",
                target: r.target || null,
                hasilAktual: r.hasilAktual || null,
                persenTercapai: pct,
                status: status,
                learning: r.learning || null,
                enhancement: r.enhancement || null,
              };
            });

            await db.insert(hasilValidasiMetrik).values(insertPayload);

            // Update dfv_rekapitulasi (3 rows: desirability, feasibility, viability)
            const categories = ["desirability", "feasibility", "viability"];
            const rekapRows = [];

            for (const cat of categories) {
              const catRows = insertPayload.filter((p) => (p.validasi || "").toLowerCase() === cat);
              const validPcts = catRows
                .map((c) => c.persenTercapai)
                .filter((p): p is number => p !== null && !isNaN(p));
              const avgPct =
                validPcts.length > 0
                  ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length)
                  : 0;
              const thresholdVal = 70.0;
              const catStatus = avgPct >= thresholdVal ? "lolos" : "belum";

              rekapRows.push({
                reportId: mvReport.id,
                kategoriDfv: cat,
                rataRataKetercapaian: avgPct,
                threshold: thresholdVal,
                status: catStatus,
                catatanKeputusan: `Rata-rata capaian metrik ${cat}: ${avgPct}% (Target threshold: ${thresholdVal}%)`,
              });
            }

            await db.delete(dfvRekapitulasi).where(eq(dfvRekapitulasi.reportId, mvReport.id));
            await db.insert(dfvRekapitulasi).values(rekapRows);
          }
          break;
        }

        case "kesimpulan_keputusan_mv":
          mvReportUpdates.kesimpulanPmf = payload.kesimpulanPmf || null;
          mvReportUpdates.keputusanGoNogo = payload.keputusanGoNogo || "go_ke_fmi"; // 4 opsi resmi: go_ke_fmi, iterasi_mvp, hold, stop
          mvReportUpdates.rekomendasiIterasi = payload.rekomendasiIterasi || null;
          mvReportUpdates.rencanaMvpBerikutnya = payload.rencanaMvpBerikutnya || null;
          mvReportUpdates.rekomendasiPromotorSponsor = payload.rekomendasiPromotorSponsor || null;
          break;

        case "preliminary_review_mv": {
          // Simpan catatan SME + dokumen ke catatanReviewSme MV
          const existingMvBukti = Array.isArray(mvReport.catatanReviewSme)
            ? mvReport.catatanReviewSme
            : [];
          const filteredMvBukti = (existingMvBukti as any[]).filter(
            (b: any) =>
              !(
                b.sourceCardId === cardId &&
                (b.type === "catatan_sme" || b.type === "dokumen_preliminary_review")
              )
          );

          if (payload.catatanSme?.trim()) {
            filteredMvBukti.push({
              id: randomUUID(),
              type: "catatan_sme",
              content: payload.catatanSme.trim(),
              reviewer: payload.reviewerNama || "SME / Innovation Coach",
              tanggal: payload.tanggalReview || new Date().toISOString(),
              sourceCardId: cardId,
            });
          }

          const reviewFiles: Array<{ url: string; name: string; size?: number }> =
            Array.isArray(payload.dokumenFiles) ? payload.dokumenFiles : [];
          for (const f of reviewFiles) {
            if (f.url) {
              filteredMvBukti.push({
                id: randomUUID(),
                type: "dokumen_preliminary_review",
                file_url: f.url,
                file_name: f.name || "Dokumen Preliminary Review",
                file_size: f.size || null,
                tanggal: new Date().toISOString(),
                sourceCardId: cardId,
              });
            }
          }

          mvReportUpdates.catatanReviewSme = filteredMvBukti;
          break;
        }
      }

      await db
        .update(marketValidationReport)
        .set(mvReportUpdates)
        .where(eq(marketValidationReport.id, mvReport.id));

      await db
        .update(kanbanSubtask)
        .set({ isDone: true })
        .where(eq(kanbanSubtask.id, subtaskId));

      await logAudit({
        userId: user.id,
        userName: user.nama,
        action: "MANDATORY_SUBTASK_SAVE",
        entity: "market_validation_report",
        entityId: mvReport.id,
        details: { timId, cardId, subtaskId, mappingField },
      });

      revalidatePath(`/tim/${timId}/kanban`);
      revalidatePath(`/tim/${timId}/market-validation`);

      return { success: true };
    }

    // ── CV Field Handling ──
    const allowed = await hasPermission(user, "cust_val.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit Customer Validation tim ini.",
      };
    }

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

    const reportUpdates: any = { updatedAt: new Date() };

    switch (mappingField) {
      case "prototype_link":
        reportUpdates.prototypeSolusiLink = payload.prototypeLink || null;
        break;

      case "responden_profil": {
        const jlh = payload.jumlahRespondenAktual;
        reportUpdates.jumlahRespondenAktual =
          jlh !== undefined && jlh !== null && jlh !== "" ? Number(jlh) : null;
        reportUpdates.profilRespondenAktual = payload.profilRespondenAktual || null;
        break;
      }

      case "mekanisme_lokasi":
        reportUpdates.mekanismeUserTesting = payload.mekanismeUserTesting || null;
        reportUpdates.tanggalLokasiTesting = payload.tanggalLokasiTesting || null;
        break;

      case "feedback_matrix": {
        const rows: any[] = Array.isArray(payload.feedbackRows) ? payload.feedbackRows : [];
        await db
          .delete(customerTestingFeedbackResponden)
          .where(
            and(
              eq(customerTestingFeedbackResponden.reportId, report.id),
              eq(customerTestingFeedbackResponden.sourceCardId, cardId)
            )
          );

        if (rows.length > 0) {
          const insertPayload = rows
            .filter((r) => r.respondenProfil && r.respondenProfil.trim().length > 0)
            .map((r) => ({
              reportId: report.id,
              sourceCardId: cardId,
              respondenProfil: r.respondenProfil.trim(),
              usabilitySkorFeedback: r.usability || null,
              functionalitySkorFeedback: r.functionality || null,
              solvabilitySkorFeedback: r.solvability || null,
              payabilitySkorFeedback: r.payability || null,
              others: r.others || null,
              priorityInsightAction: r.priorityInsightAction || null,
            }));

          if (insertPayload.length > 0) {
            await db.insert(customerTestingFeedbackResponden).values(insertPayload);
          }
        }
        break;
      }

      case "psf_7param_measurement": {
        const rows: any[] = Array.isArray(payload.psfMeasurementRows) ? payload.psfMeasurementRows : [];
        await db
          .delete(hasilValidasiMetrik)
          .where(
            and(
              eq(hasilValidasiMetrik.reportId, report.id),
              eq(hasilValidasiMetrik.fase, "customer_validation")
            )
          );

        if (rows.length > 0) {
          const insertPayload = rows.map((r: any) => ({
            reportId: report.id,
            fase: "customer_validation",
            validasi: r.validasi || "Desirability",
            metrik: r.metrik || "",
            target: r.target || null,
            hasilAktual: r.hasilAktual || null,
            interpretasi: r.interpretasi || null,
            learning: r.learning || null,
            enhancement: r.enhancement || null,
          }));

          await db.insert(hasilValidasiMetrik).values(insertPayload);
        }
        break;
      }

      case "validated_solution_psf":
        reportUpdates.validatedSolution = payload.validatedSolution || null;
        reportUpdates.ketercapaianPsf = payload.ketercapaianPsf || null;
        break;

      case "value_proposition_features":
        reportUpdates.valueProposition = payload.valueProposition || null;
        reportUpdates.fiturKunci1 = payload.fiturKunci1 || null;
        reportUpdates.fiturKunci2 = payload.fiturKunci2 || null;
        reportUpdates.fiturKunci3 = payload.fiturKunci3 || null;
        reportUpdates.flowSolusi = payload.flowSolusi || null;
        break;

      case "temuan_kualitatif_6baris": {
        const rows: any[] = Array.isArray(payload.temuanRows) ? payload.temuanRows : [];
        await db
          .delete(customerValidationTemuanKualitatif)
          .where(eq(customerValidationTemuanKualitatif.reportId, report.id));

        if (rows.length > 0) {
          const insertPayload = rows.map((r: any) => ({
            reportId: report.id,
            kategori: r.kategori || "",
            pertanyaanKunci: r.pertanyaanKunci || "",
            temuanUtama: r.temuanUtama || "",
          }));
          await db.insert(customerValidationTemuanKualitatif).values(insertPayload);
        }
        break;
      }

      case "kesimpulan_pembelajaran":
        reportUpdates.kesimpulan = payload.kesimpulan || null;
        break;

      case "preliminary_review": {
        const existingBukti = Array.isArray(report.catatanReviewSme) ? report.catatanReviewSme : [];
        const filtered = existingBukti.filter(
          (b: any) =>
            !(
              b.sourceCardId === cardId &&
              (b.type === "catatan_sme" || b.type === "dokumen_preliminary_review")
            )
        );

        if (payload.catatanSme?.trim()) {
          filtered.push({
            id: randomUUID(),
            type: "catatan_sme",
            content: payload.catatanSme.trim(),
            reviewer: payload.reviewerNama || "SME / Innovation Coach",
            tanggal: payload.tanggalReview || new Date().toISOString(),
            sourceCardId: cardId,
          });
        }

        const files: Array<{ url: string; name: string; size?: number }> =
          Array.isArray(payload.dokumenFiles) ? payload.dokumenFiles : [];

        for (const f of files) {
          if (f.url) {
            filtered.push({
              id: randomUUID(),
              type: "dokumen_preliminary_review",
              file_url: f.url,
              file_name: f.name || "Dokumen Preliminary Review",
              size: f.size,
              tanggal: new Date().toISOString(),
              sourceCardId: cardId,
            });
          }
        }

        reportUpdates.catatanReviewSme = filtered;
        break;
      }

      case "keputusan_lanjut":
        // Pilihan resmi: lanjut, iterasi, hold, stop
        reportUpdates.keputusan = payload.keputusan || "lanjut";
        reportUpdates.catatanMvpPlanning = payload.catatanMvpPlanning || null;
        break;
    }

    // Update customerValidationReport
    await db
      .update(customerValidationReport)
      .set(reportUpdates)
      .where(eq(customerValidationReport.id, report.id));

    // Otomatis tandai subtask wajib ini isDone = true
    await db
      .update(kanbanSubtask)
      .set({ isDone: true })
      .where(eq(kanbanSubtask.id, subtaskId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "MANDATORY_SUBTASK_SAVE",
      entity: "customer_validation_report",
      entityId: report.id,
      details: { timId, cardId, subtaskId, mappingField },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/customer-validation`);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal menyimpan data subtask wajib.",
    };
  }
}


