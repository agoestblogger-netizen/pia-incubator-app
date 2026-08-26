"use client";

import React, { useState, useEffect } from "react";
import {
  syncCardCustomDocToReportAction,
  saveCardCustomDocAction,
} from "@/app/actions/kanban-custom-doc";
import {
  detectCvBakuCardType,
  type CvBakuCardType,
} from "@/lib/utils/cv-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Save,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  UserCheck,
  Table2,
  ArrowUpRight,
  Paperclip,
  Upload,
  X,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

interface CvCardWorkDocumentSectionProps {
  timId: string;
  card: {
    id: string;
    judul: string;
    customDocumentData?: any;
  };
  canEdit: boolean;
  onCustomDocChange?: (newDocData: any) => void;
}

export function CvCardWorkDocumentSection({
  timId,
  card,
  canEdit,
  onCustomDocChange,
}: CvCardWorkDocumentSectionProps) {
  const cardType: CvBakuCardType | null = detectCvBakuCardType(card.judul);

  // If this card is not one of the 6 Baku CV cards, render nothing!
  if (!cardType) return null;

  const initialData = card.customDocumentData || {};
  const [docData, setDocData] = useState<Record<string, any>>(initialData);
  const [syncing, setSyncing] = useState(false);
  const [showGateConfirmModal, setShowGateConfirmModal] = useState(false);

  // Sync internal state if card prop changes
  useEffect(() => {
    setDocData(card.customDocumentData || {});
  }, [card.id, card.customDocumentData]);

  const updateField = (key: string, value: any) => {
    const next = { ...docData, [key]: value };
    setDocData(next);
    if (onCustomDocChange) {
      onCustomDocChange(next);
    }
  };

  // Feedback Matrix Rows for Card 3 ("Lakukan sesi user testing")
  const feedbackRows: any[] = Array.isArray(docData.feedbackRows)
    ? docData.feedbackRows
    : [];

  const handleAddFeedbackRow = () => {
    const newRow = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      respondenProfil: "",
      usability: "",
      functionality: "",
      solvability: "",
      payability: "",
      others: "",
      priorityInsightAction: "",
    };
    const updated = [...feedbackRows, newRow];
    updateField("feedbackRows", updated);
  };

  const handleUpdateFeedbackRow = (index: number, field: string, val: string) => {
    const updated = [...feedbackRows];
    updated[index] = { ...updated[index], [field]: val };
    updateField("feedbackRows", updated);
  };

  const handleRemoveFeedbackRow = (index: number) => {
    const updated = feedbackRows.filter((_, i) => i !== index);
    updateField("feedbackRows", updated);
  };

  // Upload Dokumen Preliminary Review (SME)
  const [uploadingSmeFile, setUploadingSmeFile] = useState(false);

  const handleUploadSmeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSmeFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timId", timId);
      formData.append("contextType", "customer_validation");

      const res = await fetch("/api/cv/upload-attachment", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.success && json.publicUrl) {
        const newFile = {
          url: json.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        };
        const currentFiles = Array.isArray(docData.dokumenFiles) ? docData.dokumenFiles : [];
        updateField("dokumenFiles", [...currentFiles, newFile]);
        toast.success(`File "${file.name}" berhasil diunggah!`, "Upload Berhasil");
      } else {
        toast.error(json.message || "Gagal mengunggah dokumen.", "Upload Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat upload.", "Error");
    } finally {
      setUploadingSmeFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveSmeFile = (indexToRemove: number) => {
    const currentFiles = Array.isArray(docData.dokumenFiles) ? docData.dokumenFiles : [];
    updateField(
      "dokumenFiles",
      currentFiles.filter((_, idx) => idx !== indexToRemove)
    );
  };

  // Execute Sync to Customer Validation Report
  const executeSyncToReport = async () => {
    setSyncing(true);
    try {
      const res = await syncCardCustomDocToReportAction(timId, card.id, docData);
      if (res.success) {
        toast.success(
          `Tersimpan ke Laporan Akhir Customer Validation (${res.syncedDetails || "Sukses"})`,
          "Dokumen Disinkronkan"
        );
      } else {
        toast.error(res.error || "Gagal menyinkronkan ke Laporan CV.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyinkronkan dokumen.", "Error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSimpanKeLaporanClick = () => {
    if (cardType === "keputusan") {
      setShowGateConfirmModal(true);
      return;
    }
    executeSyncToReport();
  };

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-[#EBF5EE] via-[#F4FAF6] to-white rounded-2xl border-2 border-[#3E9463]/70 shadow-xs">
      {/* Header Dokumen Kerja */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9E4D0] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#3E9463] text-white shadow-2xs">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-[#0B3D2E] uppercase tracking-wider">
                📋 Dokumen Kerja Khusus
              </h4>
              <span className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-100/90 px-2 py-0.2 rounded-full border border-[#C9E4D0]">
                Template Baku CV
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Isi instrumen kerja spesifik kartu ini &amp; alirkan langsung ke Laporan Akhir Customer Validation
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={syncing || !canEdit}
          onClick={handleSimpanKeLaporanClick}
          className="bg-[#0B3D2E] hover:bg-[#3E9463] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs gap-1.5 cursor-pointer active:scale-98 transition-all"
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 text-[#F0C24B]" />
          )}
          <span>{syncing ? "Menyimpan..." : "💾 Simpan ke Laporan CV"}</span>
        </Button>
      </div>

      {/* Info & Direct Link to Validation Report */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 bg-emerald-50/80 rounded-xl border border-[#C9E4D0] text-xs">
        <span className="text-emerald-900 font-semibold flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#3E9463] shrink-0" />
          <span>Isian dokumen kerja ini otomatis dialirkan ke Laporan Customer Validation saat diklik simpan.</span>
        </span>
        <Link
          href={`/tim/${timId}/customer-validation?tab=report`}
          target="_blank"
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0B3D2E] hover:text-[#3E9463] underline shrink-0"
        >
          <span>Lihat Tab Validation Report</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 1: SIAPKAN PROTOTYPE UNTUK TESTING */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "prototype" && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Link Prototype Solusi (URL)</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>prototype_solusi_link</code> di Report
              </span>
            </label>
            <Input
              type="url"
              value={docData.prototypeLink || ""}
              disabled={!canEdit}
              placeholder="https://www.figma.com/proto/... atau URL demo clickable prototype"
              onChange={(e) => updateField("prototypeLink", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] font-medium"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Masukkan tautan prototipe interaktif (Figma, Canva, Web Demo, atau Video Demo) yang siap diuji ke responden.
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 2: REKRUT EARLY ADOPTERS / RESPONDEN */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "responden" && (
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Jumlah Responden Aktual</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>jumlah_responden_aktual</code>
              </span>
            </label>
            <Input
              type="number"
              min={0}
              value={docData.jumlahRespondenAktual ?? ""}
              disabled={!canEdit}
              placeholder="Contoh: 10"
              onChange={(e) => updateField("jumlahRespondenAktual", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] font-bold w-full sm:w-48"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Profil Responden Aktual</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>profil_responden_aktual</code>
              </span>
            </label>
            <Textarea
              rows={3}
              value={docData.profilRespondenAktual || ""}
              disabled={!canEdit}
              placeholder="Contoh: 5 Nasabah Tabungan Emas aktif usia 25-35 thn, 5 Agen Pegadaian wilayah Jakarta Selatan..."
              onChange={(e) => updateField("profilRespondenAktual", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 3: LAKUKAN SESI USER TESTING */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "testing" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                Mekanisme User Testing
              </label>
              <Textarea
                rows={2}
                value={docData.mekanismeUserTesting || ""}
                disabled={!canEdit}
                placeholder="Metode testing: wawancara tatap muka / online via Zoom, skenario tugas prototype..."
                onChange={(e) => updateField("mekanismeUserTesting", e.target.value)}
                className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                Tanggal &amp; Lokasi Testing
              </label>
              <Input
                value={docData.tanggalLokasiTesting || ""}
                disabled={!canEdit}
                placeholder="Contoh: 10-12 Maret 2026 di Outlet Kramat Jati &amp; Online"
                onChange={(e) => updateField("tanggalLokasiTesting", e.target.value)}
                className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] font-medium"
              />
            </div>
          </div>

          {/* Feedback Matrix Per Responden (Tabel Dinamis) */}
          <div className="space-y-2 pt-2 border-t border-[#C9E4D0]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Table2 className="h-4 w-4 text-[#3E9463]" />
                <span className="text-xs font-extrabold text-[#0B3D2E]">
                  Feedback Matrix per Responden ({feedbackRows.length} baris)
                </span>
              </div>

              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddFeedbackRow}
                  className="h-7 text-[11px] font-bold border-[#3E9463] text-[#0B3D2E] hover:bg-emerald-50 gap-1 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3 w-3 text-[#3E9463]" />
                  <span>+ Tambah Responden</span>
                </Button>
              )}
            </div>

            {feedbackRows.length === 0 ? (
              <div className="p-4 bg-white/80 rounded-xl border border-dashed border-[#C9E4D0] text-center text-xs text-gray-500">
                Belum ada baris feedback responden. Klik <strong>"+ Tambah Responden"</strong> untuk mencatat hasil wawancara testing per orang.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {feedbackRows.map((row, idx) => (
                  <div
                    key={row.id || idx}
                    className="p-3 bg-white rounded-xl border border-[#C9E4D0] shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-[#0B3D2E] text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <Input
                          value={row.respondenProfil || ""}
                          disabled={!canEdit}
                          placeholder={`Nama / Profil Responden #${idx + 1} (cth: Ibu Ani - Nasabah Mikro)`}
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "respondenProfil", e.target.value)
                          }
                          className="h-7 text-xs font-bold border-[#C9E4D0] w-64 sm:w-80"
                        />
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeedbackRow(idx)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus baris responden ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 4 Dimensi PSF + Others + Priority Insight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                          Usability:
                        </label>
                        <Input
                          value={row.usability || ""}
                          disabled={!canEdit}
                          placeholder="Kemudahan navigasi..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "usability", e.target.value)
                          }
                          className="h-7 text-[11px] border-[#C9E4D0]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                          Functionality:
                        </label>
                        <Input
                          value={row.functionality || ""}
                          disabled={!canEdit}
                          placeholder="Fungsi & alur fitur..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "functionality", e.target.value)
                          }
                          className="h-7 text-[11px] border-[#C9E4D0]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                          Solvability:
                        </label>
                        <Input
                          value={row.solvability || ""}
                          disabled={!canEdit}
                          placeholder="Menyelesaikan problem?..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "solvability", e.target.value)
                          }
                          className="h-7 text-[11px] border-[#C9E4D0]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                          Payability / Willingness:
                        </label>
                        <Input
                          value={row.payability || ""}
                          disabled={!canEdit}
                          placeholder="Kesediaan bayar/pakai..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "payability", e.target.value)
                          }
                          className="h-7 text-[11px] border-[#C9E4D0]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                          Others (Ide / Masukan Baru):
                        </label>
                        <Input
                          value={row.others || ""}
                          disabled={!canEdit}
                          placeholder="Masukan di luar 4 dimensi..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "others", e.target.value)
                          }
                          className="h-7 text-[11px] border-[#C9E4D0]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                          Priority Insight / Tindak Lanjut:
                        </label>
                        <Input
                          value={row.priorityInsightAction || ""}
                          disabled={!canEdit}
                          placeholder="Highlight tindak lanjut utama..."
                          onChange={(e) =>
                            handleUpdateFeedbackRow(idx, "priorityInsightAction", e.target.value)
                          }
                          className="h-7 text-[11px] border-emerald-300 bg-emerald-50/40 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 4: ANALISIS HASIL & ISI LAPORAN CUSTOMER VALIDATION */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "analisis" && (
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Validated Solution (Solusi Tervalidasi)</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>validated_solution</code>
              </span>
            </label>
            <Textarea
              rows={3}
              value={docData.validatedSolution || ""}
              disabled={!canEdit}
              placeholder="Deskripsi solusi yang tervalidasi setelah mengolah masukan dari seluruh responden..."
              onChange={(e) => updateField("validatedSolution", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Ketercapaian Problem-Solution Fit (PSF)</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>ketercapaian_psf</code>
              </span>
            </label>
            <select
              value={docData.ketercapaianPsf || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("ketercapaianPsf", e.target.value)}
              className="w-full sm:w-72 h-8 rounded-lg border border-[#C9E4D0] text-xs px-2.5 bg-white font-bold text-gray-900"
            >
              <option value="">-- Pilih Status Ketercapaian PSF --</option>
              <option value="tercapai">Tercapai (Problem-Solution Fit Valid)</option>
              <option value="tercapai_dengan_catatan">Tercapai dengan Catatan (Perlu Penyesuaian Minor)</option>
              <option value="belum_tercapai">Belum Tercapai (Perlu Iterasi Mayor / Evaluasi Ulang)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Kesimpulan &amp; Pembelajaran Utama</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>kesimpulan</code>
              </span>
            </label>
            <Textarea
              rows={3}
              value={docData.kesimpulan || ""}
              disabled={!canEdit}
              placeholder="Rangkuman kesimpulan hasil pengujian, temuan mengejutkan, dan pembelajaran kunci tim..."
              onChange={(e) => updateField("kesimpulan", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 5: PRELIMINARY REVIEW (SME) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "sme" && (
        <div className="space-y-3.5 pt-1">
          <div className="p-2.5 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
            <UserCheck className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Catatan review ini akan <strong>ditambahkan (append)</strong> sebagai entri bukti pendukung ke Laporan Customer Validation tanpa menimpa bukti pendukung lain.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
              Nama SME / Coach / Reviewer:
            </label>
            <Input
              value={docData.reviewerNama || ""}
              disabled={!canEdit}
              placeholder="Contoh: Bpk. Bambang — Subject Matter Expert Divisi Digital"
              onChange={(e) => updateField("reviewerNama", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
              Catatan Review &amp; Rekomendasi SME:
            </label>
            <Textarea
              rows={4}
              value={docData.catatanSme || ""}
              disabled={!canEdit}
              placeholder="Catatan evaluasi teknis, kesiapan solusi, risiko kepatuhan/operasional, serta saran perbaikan dari SME/Coach..."
              onChange={(e) => updateField("catatanSme", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] leading-relaxed font-normal"
            />
          </div>

          {/* Dokumen Hasil Preliminary Review (Upload File) */}
          <div className="space-y-2 pt-2 border-t border-[#C9E4D0]/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Dokumen Hasil Preliminary Review:</span>
              </label>
              <span className="text-[10px] text-gray-500 font-medium">
                PDF, Word, Excel, Gambar (Maks 10MB)
              </span>
            </div>

            {/* Upload Area */}
            {canEdit && (
              <div className="relative">
                <input
                  type="file"
                  id="sme-file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  disabled={uploadingSmeFile}
                  onChange={handleUploadSmeFile}
                  className="sr-only"
                />
                <label
                  htmlFor="sme-file-upload"
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#C9E4D0] bg-white/70 hover:bg-[#EBF5EE] transition-colors cursor-pointer text-xs font-semibold text-[#0B3D2E] ${
                    uploadingSmeFile ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {uploadingSmeFile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#3E9463]" />
                      <span>Mengunggah dokumen review...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-[#3E9463]" />
                      <span>Unggah Dokumen Preliminary Review</span>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* List Dokumen Terupload */}
            {Array.isArray(docData.dokumenFiles) && docData.dokumenFiles.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {docData.dokumenFiles.map((file: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-[#3E9463]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileCheck className="h-4 w-4 text-[#3E9463] shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-gray-800 hover:text-[#0B3D2E] truncate block hover:underline"
                        >
                          {file.name}
                        </a>
                        {file.size && (
                          <span className="text-[10px] text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-500 hover:text-[#0B3D2E] rounded-md hover:bg-gray-100 transition-colors"
                        title="Buka Dokumen"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSmeFile(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Hapus File"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                Belum ada file dokumen review yang diunggah.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KARTU 6: TENTUKAN KEPUTUSAN FIT / TIDAK FIT */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {cardType === "keputusan" && (
        <div className="space-y-3.5 pt-1">
          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Penetapan Gerbang Fase (Phase Gate Decision)</p>
              <p className="text-[11px] text-amber-900 mt-0.5">
                Memilih <strong>"Lanjut ke Market Validation (Fit)"</strong> dan menyimpannya ke Laporan akan membuka akses pengerjaan tahap Market Validation bagi tim ini.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Keputusan Kelanjutan Fase:</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                → Mengisi field <code>keputusan</code> di Report
              </span>
            </label>
            <select
              value={docData.keputusan || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("keputusan", e.target.value)}
              className="w-full h-9 rounded-lg border-2 border-[#3E9463] text-xs px-2.5 bg-white font-extrabold text-[#0B3D2E]"
            >
              <option value="">-- Tetapkan Keputusan Fase CV --</option>
              <option value="lanjut">✓ Lanjut ke Market Validation (Fit / Siap Pilot)</option>
              <option value="iterasi">↺ Iterasi Solusi (Uji Coba Lanjutan di CV)</option>
              <option value="hold">⏸ Hold (Tunda Sementara)</option>
              <option value="stop">🛑 Stop (Hentikan Proyek Inovasi)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
              Catatan Pertimbangan Keputusan:
            </label>
            <Textarea
              rows={3}
              value={docData.catatanKeputusan || ""}
              disabled={!canEdit}
              placeholder="Alasan strategis dan justifikasi penetapan keputusan kelanjutan ini..."
              onChange={(e) => updateField("catatanKeputusan", e.target.value)}
              className="text-xs bg-white border-[#C9E4D0] focus:border-[#3E9463] leading-relaxed font-normal"
            />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL KONFIRMASI KHUSUS UNTUK KARTU KEPUTUSAN GATE */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Dialog open={showGateConfirmModal} onOpenChange={setShowGateConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Konfirmasi Penetapan Keputusan Fase</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1 leading-relaxed">
              Ini akan menentukan status kelanjutan gerbang Customer Validation dan secara langsung mempengaruhi keterbukaan tahap Market Validation.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5 my-2">
            <div className="font-bold text-amber-950">
              Keputusan yang akan disimpan:
            </div>
            <div className="text-sm font-extrabold text-[#0B3D2E]">
              {docData.keputusan === "lanjut" && "✓ Lanjut ke Market Validation (Fit)"}
              {docData.keputusan === "iterasi" && "↺ Iterasi Solusi (Belum Fit)"}
              {docData.keputusan === "hold" && "⏸ Hold (Tunda Sementara)"}
              {docData.keputusan === "stop" && "🛑 Stop (Hentikan Proyek)"}
              {!docData.keputusan && "(Belum dipilih)"}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGateConfirmModal(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={syncing || !docData.keputusan}
              onClick={() => {
                setShowGateConfirmModal(false);
                executeSyncToReport();
              }}
              className="bg-[#0B3D2E] hover:bg-[#3E9463] text-white text-xs font-bold"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ya, Simpan ke Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
