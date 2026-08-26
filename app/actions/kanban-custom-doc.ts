"use server";

import { db } from "@/lib/db";
import {
  kanbanCard,
  customerValidationPlan,
  customerValidationReport,
  customerTestingFeedbackResponden,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { randomUUID } from "crypto";
import { detectCvBakuCardType, type CvBakuCardType } from "@/lib/utils/cv-cards";

export { type CvBakuCardType };

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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan dokumen kerja kartu." };
  }
}

/**
 * Mengecek apakah field target di customer_validation_report sudah terisi
 * (untuk konfirmasi timpa sebelum user klik simpan ke laporan)
 */
export async function checkReportFieldHasDataAction(timId: string, cardId: string) {
  try {
    const [card] = await db
      .select({ id: kanbanCard.id, judul: kanbanCard.judul })
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!card) return { hasData: false, currentPreview: null, cardType: null };

    const cardType = detectCvBakuCardType(card.judul);
    if (!cardType) return { hasData: false, currentPreview: null, cardType: null };

    const [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) return { hasData: false, currentPreview: null, cardType };

    const [report] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, plan.id))
      .limit(1);

    if (!report) return { hasData: false, currentPreview: null, cardType };

    let hasData = false;
    let currentPreview = "";

    switch (cardType) {
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
        // SME appends to bukti_pendukung, so no overwrite warning strictly needed, but inform
        hasData = false;
        break;
      case "keputusan":
        if (report.keputusan && report.keputusan.trim().length > 0) {
          hasData = true;
          currentPreview = report.keputusan;
        }
        break;
    }

    return { hasData, currentPreview, cardType };
  } catch {
    return { hasData: false, currentPreview: null, cardType: null };
  }
}

/**
 * Sinkronisasi data dokumen kerja kartu ke Laporan Akhir Customer Validation
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

    const allowed =
      (await hasPermission(user, "cust_val.edit", timId)) ||
      (await hasPermission(user, "kanban.edit", timId));
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit Laporan Customer Validation tim ini.",
      };
    }

    // 1. Ambil data kartu
    const [card] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!card) {
      return { success: false, error: "Kartu task tidak ditemukan." };
    }

    const cardType = detectCvBakuCardType(card.judul);
    if (!cardType) {
      return {
        success: false,
        error: "Kartu ini bukan salah satu dari 6 Kartu Template Baku Customer Validation.",
      };
    }

    // 2. Simpan juga custom_document_data ke kartu kanban
    await db
      .update(kanbanCard)
      .set({
        customDocumentData: customDocData,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCard.id, cardId));

    // 3. Pastikan customerValidationPlan & customerValidationReport ada
    let [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (!plan) {
      const [newPlan] = await db
        .insert(customerValidationPlan)
        .values({
          timInovatorId: timId,
        })
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
        .values({
          planId: plan.id,
        })
        .returning();
      report = newReport;
    }

    // 4. Update data spesifik per jenis kartu
    const reportUpdates: any = {
      updatedAt: new Date(),
    };
    let syncedDetails = "";

    switch (cardType) {
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

        // Update / Replace tabel anak customer_testing_feedback_responden
        const feedbackRows: any[] = Array.isArray(customDocData.feedbackRows)
          ? customDocData.feedbackRows
          : [];

        // Hapus baris lama dari kartu ini (atau seluruh baris report jika belum ada sourceCardId)
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
        // APPEND sebagai entri baru ke bukti_pendukung (jsonb[]) Report
        const existingBukti = Array.isArray(report.buktiPendukung) ? report.buktiPendukung : [];

        // Filter out older entries from this card
        const filtered = existingBukti.filter(
          (b: any) =>
            !(
              b.sourceCardId === cardId &&
              (b.type === "catatan_sme" || b.type === "dokumen_preliminary_review")
            )
        );

        // 1. Catatan SME (jika ada)
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

        // 2. Dokumen Hasil Preliminary Review (jika ada file di-upload)
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

    // 5. Update Report DB
    await db
      .update(customerValidationReport)
      .set(reportUpdates)
      .where(eq(customerValidationReport.id, report.id));

    // 6. Audit logging
    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CUST_VAL_CARD_CUSTOM_DOC_SYNC",
      entity: "customer_validation_report",
      entityId: report.id,
      details: {
        timId,
        cardId,
        cardTitle: card.judul,
        cardType,
        syncedDetails,
      },
    });

    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/market-validation`);

    return {
      success: true,
      cardType,
      syncedDetails,
      reportId: report.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal menyinkronkan dokumen kerja ke Laporan Customer Validation.",
    };
  }
}
