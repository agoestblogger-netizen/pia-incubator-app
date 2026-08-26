"use server";

import { db } from "@/lib/db";
import {
  kanbanCard,
  customerValidationPlan,
  customerValidationReport,
  customerTestingFeedbackResponden,
  marketValidationPlan,
  marketValidationReport,
  mvReleaseLog,
  hasilValidasiMetrik,
  dfvRekapitulasi,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { randomUUID } from "crypto";
import { detectCvBakuCardType, type CvBakuCardType } from "@/lib/utils/cv-cards";
import { detectMvBakuCardType, type MvBakuCardType } from "@/lib/utils/mv-cards";

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
        case "sme_mv":
          hasData = false;
          break;
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
          const existingBukti = Array.isArray(report.buktiPendukung) ? report.buktiPendukung : [];
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

          reportUpdates.buktiPendukung = filtered;
          syncedDetails = `Review SME & ${files.length} Dokumen ditambahkan ke Bukti Pendukung`;
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
          const existingBukti = Array.isArray(report.buktiPendukung) ? report.buktiPendukung : [];
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

          reportUpdates.buktiPendukung = filtered;
          syncedDetails = `Review SME & ${files.length} Dokumen ditambahkan ke Bukti Pendukung MV`;
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
