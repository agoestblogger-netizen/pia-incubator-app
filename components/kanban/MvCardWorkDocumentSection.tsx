"use client";

import React, { useState, useEffect } from "react";
import {
  syncCardCustomDocToReportAction,
  saveCardCustomDocAction,
} from "@/app/actions/kanban-custom-doc";
import {
  detectMvBakuCardType,
  type MvBakuCardType,
} from "@/lib/utils/mv-cards";
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
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Rocket,
  ShieldCheck,
  Table2,
  ArrowUpRight,
  Paperclip,
  Upload,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

// ── 9 Baris Tetap Metrik DFV Market Validation ─────────────────────────────
const MV_METRIK_ROWS = [
  {
    validasi: "Desirability",
    metrik: "Kepuasan Pengguna MVP",
    target: "≥4.0",
    threshold: 70,
  },
  {
    validasi: "Desirability",
    metrik: "Adopsi / Penggunaan Berulang",
    target: "≥60%",
    threshold: 70,
  },
  {
    validasi: "Desirability",
    metrik: "Rekomendasi / Referral (NPS)",
    target: "NPS ≥+30 atau ≥70% Ya",
    threshold: 70,
  },
  {
    validasi: "Feasibility",
    metrik: "Ketersediaan Sistem & Kelancaran Proses",
    target: "≥99% selama pilot",
    threshold: 70,
  },
  {
    validasi: "Feasibility",
    metrik: "Waktu Proses / Response Time Solusi",
    target: "≤2 menit",
    threshold: 70,
  },
  {
    validasi: "Feasibility",
    metrik: "Error / Issue Rate (Tingkat Kegagalan Transaksi)",
    target: "≤2%",
    threshold: 70,
  },
  {
    validasi: "Viability",
    metrik: "Realisasi Potensi Revenue / Transaksi Finansial",
    target: "Sesuai target proyek pilot",
    threshold: 70,
  },
  {
    validasi: "Viability",
    metrik: "Efisiensi Biaya Operasional / Penghematan Waktu",
    target: "≥30% efisiensi",
    threshold: 70,
  },
  {
    validasi: "Viability",
    metrik: "Proyeksi ROI / Cost-Benefit Tahap Pilot",
    target: "Positif (ROI > 100%)",
    threshold: 70,
  },
];

interface MvCardWorkDocumentSectionProps {
  timId: string;
  card: {
    id: string;
    judul: string;
    tahap?: string;
    customDocumentData?: any;
  };
  canEdit: boolean;
  onCustomDocChange?: (newDocData: any) => void;
}

export function MvCardWorkDocumentSection({
  timId,
  card,
  canEdit,
  onCustomDocChange,
}: MvCardWorkDocumentSectionProps) {
  const cardType: MvBakuCardType | null = detectMvBakuCardType(card.judul, card.tahap);

  // If this card is not one of the MV Baku cards with custom document, render nothing!
  if (!cardType) return null;

  const initialData = card.customDocumentData || {};
  const [docData, setDocData] = useState<Record<string, any>>(initialData);
  const [syncing, setSyncing] = useState(false);
  const [showGateConfirmModal, setShowGateConfirmModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  // ── Card 1: Release Logs (MVP Release) ───────────────────────────────────
  const releaseLogs: any[] = Array.isArray(docData.releaseLogs)
    ? docData.releaseLogs
    : [];

  const handleAddReleaseLogRow = () => {
    const newRow = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tanggal: new Date().toISOString().split("T")[0],
      aktivitas: "",
      output: "",
      dataEvidence: "",
      pic: "",
      catatan: "",
    };
    updateField("releaseLogs", [...releaseLogs, newRow]);
  };

  const handleRemoveReleaseLogRow = (index: number) => {
    updateField(
      "releaseLogs",
      releaseLogs.filter((_, i) => i !== index)
    );
  };

  const handleUpdateReleaseLogRow = (index: number, field: string, value: any) => {
    const updated = releaseLogs.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    updateField("releaseLogs", updated);
  };

  // ── Card 2: Metrik Results (Market Testing) ──────────────────────────────
  const metrikResults: any[] = Array.isArray(docData.metrikResults) && docData.metrikResults.length === 9
    ? docData.metrikResults
    : MV_METRIK_ROWS.map((row) => {
        const found = (docData.metrikResults || []).find(
          (m: any) => m.metrik === row.metrik
        );
        return {
          validasi: row.validasi,
          metrik: row.metrik,
          target: found?.target || row.target,
          hasilAktual: found?.hasilAktual || "",
          persenTercapai: found?.persenTercapai || "",
          status: found?.status || "belum",
          learning: found?.learning || "",
          enhancement: found?.enhancement || "",
        };
      });

  const handleUpdateMetrikResult = (index: number, field: string, value: any) => {
    const updated = metrikResults.map((row, i) => {
      if (i !== index) return row;
      const nextRow = { ...row, [field]: value };

      // Auto-calculate status if persenTercapai is filled
      if (field === "persenTercapai") {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          nextRow.status = num >= 70 ? "lolos" : "belum";
        }
      }
      return nextRow;
    });
    updateField("metrikResults", updated);
  };

  // ── Card 4: DFV Rekapitulasi (Analisis & Laporan MV) ──────────────────────
  const dfvRekapitulasiRows: any[] = Array.isArray(docData.dfvRekapitulasiRows) && docData.dfvRekapitulasiRows.length === 3
    ? docData.dfvRekapitulasiRows
    : [
        {
          kategoriDfv: "desirability",
          label: "Desirability (Kebutuhan & Kepuasan Pasar)",
          rataRataKetercapaian: docData.dfvDesirabilityScore || 0,
          threshold: 70,
          status: (docData.dfvDesirabilityScore || 0) >= 70 ? "lolos" : "belum",
          catatanKeputusan: "",
        },
        {
          kategoriDfv: "feasibility",
          label: "Feasibility (Kelayakan Teknis & Operasional)",
          rataRataKetercapaian: docData.dfvFeasibilityScore || 0,
          threshold: 70,
          status: (docData.dfvFeasibilityScore || 0) >= 70 ? "lolos" : "belum",
          catatanKeputusan: "",
        },
        {
          kategoriDfv: "viability",
          label: "Viability (Kelayakan Bisnis & Finansial)",
          rataRataKetercapaian: docData.dfvViabilityScore || 0,
          threshold: 70,
          status: (docData.dfvViabilityScore || 0) >= 70 ? "lolos" : "belum",
          catatanKeputusan: "",
        },
      ];

  const handleUpdateDfvRekap = (index: number, field: string, value: any) => {
    const updated = dfvRekapitulasiRows.map((row, i) => {
      if (i !== index) return row;
      const nextRow = { ...row, [field]: value };
      if (field === "rataRataKetercapaian") {
        const num = parseFloat(value) || 0;
        nextRow.status = num >= (nextRow.threshold || 70) ? "lolos" : "belum";
      }
      return nextRow;
    });
    updateField("dfvRekapitulasiRows", updated);
  };

  // ── Card 3: File Upload for Preliminary Review SME ───────────────────────
  const handleUploadReviewDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timId", timId);
      formData.append("contextType", "market_validation_sme");

      const res = await fetch("/api/cv/upload-attachment", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (json.success && json.publicUrl) {
        const currentFiles = Array.isArray(docData.dokumenFiles)
          ? docData.dokumenFiles
          : [];
        const newFile = {
          url: json.publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        };
        updateField("dokumenFiles", [...currentFiles, newFile]);
        toast.success(`Dokumen "${file.name}" berhasil diunggah!`, "Upload Berhasil");
      } else {
        toast.error(json.message || "Gagal mengunggah dokumen review.", "Upload Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat upload.", "Error");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleRemoveReviewDoc = (index: number) => {
    const currentFiles = Array.isArray(docData.dokumenFiles)
      ? docData.dokumenFiles
      : [];
    updateField(
      "dokumenFiles",
      currentFiles.filter((_, idx) => idx !== index)
    );
  };

  // ── Handle Sync to Report Action ─────────────────────────────────────────
  const executeSyncToReport = async () => {
    setSyncing(true);
    try {
      // 1. Simpan ke kartu terlebih dahulu
      await saveCardCustomDocAction(timId, card.id, docData);

      // 2. Push ke Laporan Market Validation
      const res = await syncCardCustomDocToReportAction(timId, card.id, docData);
      if (res.success) {
        toast.success(
          `Data berhasil disinkronkan ke Laporan Market Validation (${res.syncedDetails || ""})`,
          "Sinkronisasi Berhasil"
        );
      } else {
        toast.error(res.error || "Gagal menyinkronkan data ke Laporan MV.", "Gagal Sinkronisasi");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.", "Error");
    } finally {
      setSyncing(false);
      setShowGateConfirmModal(false);
    }
  };

  const handleSimpanKeLaporanClick = () => {
    if (cardType === "analisis_mv" && docData.keputusanGoNogo) {
      setShowGateConfirmModal(true);
    } else {
      executeSyncToReport();
    }
  };

  return (
    <div className="mt-4 pt-4 border-t-2 border-dashed border-[#C9E4D0] space-y-4">
      {/* Header Dokumen Kerja Baku MV */}
      <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-[#C9E4D0]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0B3D2E] text-white rounded-lg">
            <FileText className="h-4 w-4 text-[#F0C24B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0B3D2E]">
                Dokumen Kerja Khusus Market Validation
              </span>
              <span className="text-[10px] bg-[#0B3D2E] text-[#F0C24B] px-2 py-0.5 rounded-full font-extrabold uppercase">
                Template 3.1 &amp; 3.2
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Isian pada section ini tersimpan di kartu dan dapat langsung disinkronkan ke Laporan Akhir Market Validation.
            </p>
          </div>
        </div>
      </div>

      {/* ══ KARTU 1: MVP Release ══ */}
      {cardType === "mvp_release" && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Versi MVP yang Dirilis
              </label>
              <Input
                disabled={!canEdit}
                placeholder="Contoh: v1.0-pilot"
                value={docData.mvpVersion || ""}
                onChange={(e) => updateField("mvpVersion", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Lokasi / Channel Rilis
              </label>
              <Input
                disabled={!canEdit}
                placeholder="Contoh: Internal Web Pilot / 3 Cabang Kanwil VIII"
                value={docData.channelRelease || ""}
                onChange={(e) => updateField("channelRelease", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Periode Rilis — Mulai
              </label>
              <Input
                type="date"
                disabled={!canEdit}
                value={docData.periodeRilisMulai || ""}
                onChange={(e) => updateField("periodeRilisMulai", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Periode Rilis — Selesai
              </label>
              <Input
                type="date"
                disabled={!canEdit}
                value={docData.periodeRilisSelesai || ""}
                onChange={(e) => updateField("periodeRilisSelesai", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Pengguna Aktif Aktual
              </label>
              <Input
                type="number"
                disabled={!canEdit}
                placeholder="Contoh: 45"
                value={docData.jumlahEarlyAdoptersAktual || ""}
                onChange={(e) => updateField("jumlahEarlyAdoptersAktual", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1">
              Ringkasan Aktivitas Rilis &amp; Hasil Pilot
            </label>
            <Textarea
              rows={3}
              disabled={!canEdit}
              placeholder="Jelaskan jalannya peluncuran MVP ke pengguna sasaran..."
              value={docData.ringkasanAktivitasRilis || ""}
              onChange={(e) => updateField("ringkasanAktivitasRilis", e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Kendala Utama &amp; Mitigasi
              </label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                placeholder="Kendala teknis atau operasional selama peluncuran..."
                value={docData.kendalaUtama || ""}
                onChange={(e) => updateField("kendalaUtama", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Perubahan dari MVP Plan
              </label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                placeholder="Penyesuaian cakupan atau fitur dibanding rencana awal..."
                value={docData.perubahanDariPlan || ""}
                onChange={(e) => updateField("perubahanDariPlan", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Sub-table: Release Log & Evidence */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
                <Table2 className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Sub-Tabel: Release Log &amp; Evidence Harian</span>
              </label>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddReleaseLogRow}
                  className="border-[#3E9463] text-[#0B3D2E] hover:bg-[#EBF5EE] text-xs font-bold rounded-lg gap-1 h-7"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah Log Rilis</span>
                </Button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2 w-[110px]">Tanggal</th>
                    <th className="p-2 w-[160px]">Aktivitas</th>
                    <th className="p-2 w-[140px]">Output</th>
                    <th className="p-2 w-[140px]">Data / Evidence</th>
                    <th className="p-2 w-[100px]">PIC</th>
                    <th className="p-2">Catatan</th>
                    {canEdit && <th className="p-2 w-[35px] text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {releaseLogs.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-1.5 align-top">
                        <Input
                          type="date"
                          disabled={!canEdit}
                          value={row.tanggal ? row.tanggal.split("T")[0] : ""}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "tanggal", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                      <td className="p-1.5 align-top">
                        <Input
                          disabled={!canEdit}
                          placeholder="Aktivitas rilis..."
                          value={row.aktivitas}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "aktivitas", e.target.value)
                          }
                          className="text-xs h-7 bg-white font-semibold"
                        />
                      </td>
                      <td className="p-1.5 align-top">
                        <Input
                          disabled={!canEdit}
                          placeholder="Output aktivitas..."
                          value={row.output}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "output", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                      <td className="p-1.5 align-top">
                        <Input
                          disabled={!canEdit}
                          placeholder="Link / data bukti..."
                          value={row.dataEvidence}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "dataEvidence", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                      <td className="p-1.5 align-top">
                        <Input
                          disabled={!canEdit}
                          placeholder="Nama PIC..."
                          value={row.pic}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "pic", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                      <td className="p-1.5 align-top">
                        <Input
                          disabled={!canEdit}
                          placeholder="Catatan tambahan..."
                          value={row.catatan}
                          onChange={(e) =>
                            handleUpdateReleaseLogRow(idx, "catatan", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                      {canEdit && (
                        <td className="p-1.5 align-top text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveReleaseLogRow(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {releaseLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-gray-400 italic">
                        Belum ada data log rilis. Klik &quot;Tambah Log Rilis&quot; untuk menambahkan aktivitas harian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ KARTU 2: Market Testing (Ukur Metrik DFV) ══ */}
      {cardType === "market_testing" && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div>
            <label className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-[#3E9463]" />
              <span>Tabel Hasil Pengukuran DFV dan Traction (9 Parameter Baku)</span>
            </label>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Catat capaian aktual hasil pilot, persentase ketercapaian, status kelolosan (threshold 70%), pembelajaran, dan rencana peningkatan.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                <tr>
                  <th className="p-2 w-[90px]">Validasi</th>
                  <th className="p-2 w-[160px]">Metrik</th>
                  <th className="p-2 w-[110px]">Target</th>
                  <th className="p-2 w-[100px]">Hasil Aktual</th>
                  <th className="p-2 w-[85px]">% Tercapai</th>
                  <th className="p-2 w-[95px]">Status</th>
                  <th className="p-2 w-[140px]">Learning</th>
                  <th className="p-2">Enhancement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrikResults.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-2 align-top bg-gray-50/50">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                          m.validasi === "Desirability"
                            ? "bg-amber-100 text-amber-900"
                            : m.validasi === "Feasibility"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-purple-100 text-purple-900"
                        }`}
                      >
                        {m.validasi}
                      </span>
                    </td>
                    <td className="p-2 align-top font-bold text-gray-800 text-[11px]">
                      {m.metrik}
                    </td>
                    <td className="p-2 align-top text-gray-600 font-medium">
                      {m.target || "-"}
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        disabled={!canEdit}
                        placeholder="Realisasi..."
                        value={m.hasilAktual}
                        onChange={(e) =>
                          handleUpdateMetrikResult(idx, "hasilAktual", e.target.value)
                        }
                        className="text-xs h-7 bg-white font-semibold"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        type="number"
                        disabled={!canEdit}
                        placeholder="%"
                        value={m.persenTercapai}
                        onChange={(e) =>
                          handleUpdateMetrikResult(idx, "persenTercapai", e.target.value)
                        }
                        className="text-xs h-7 bg-white text-center font-bold"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <select
                        disabled={!canEdit}
                        value={m.status}
                        onChange={(e) =>
                          handleUpdateMetrikResult(idx, "status", e.target.value)
                        }
                        className={`w-full h-7 px-1 text-[11px] rounded font-bold border ${
                          m.status === "lolos"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        <option value="lolos">🟢 Lolos</option>
                        <option value="belum">🟡 Belum</option>
                      </select>
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        disabled={!canEdit}
                        placeholder="Pembelajaran..."
                        value={m.learning}
                        onChange={(e) =>
                          handleUpdateMetrikResult(idx, "learning", e.target.value)
                        }
                        className="text-xs h-7 bg-white text-[11px]"
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        disabled={!canEdit}
                        placeholder="Langkah perbaikan..."
                        value={m.enhancement}
                        onChange={(e) =>
                          handleUpdateMetrikResult(idx, "enhancement", e.target.value)
                        }
                        className="text-xs h-7 bg-white text-[11px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ KARTU 3: Preliminary Review SME ══ */}
      {cardType === "sme_mv" && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Nama Reviewer / SME / Coach
              </label>
              <Input
                disabled={!canEdit}
                placeholder="Nama SME / Innovation Coach..."
                value={docData.reviewerNama || ""}
                onChange={(e) => updateField("reviewerNama", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Tanggal Sesi Review
              </label>
              <Input
                type="date"
                disabled={!canEdit}
                value={docData.tanggalReview || ""}
                onChange={(e) => updateField("tanggalReview", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1">
              Catatan Review &amp; Rekomendasi Strategis SME
            </label>
            <Textarea
              rows={4}
              disabled={!canEdit}
              placeholder="Tuliskan evaluasi performa pasar MVP, saran penyempurnaan fitur, dan arahan sebelum FMI..."
              value={docData.catatanSme || ""}
              onChange={(e) => updateField("catatanSme", e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          {/* Upload Dokumen Hasil Review */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Dokumen Hasil Preliminary Review</span>
              </label>
              <span className="text-[10px] text-gray-400 font-medium">
                PDF, Word, Excel, Gambar (Maks 10MB)
              </span>
            </div>

            {canEdit && (
              <div className="relative">
                <input
                  type="file"
                  id="mv-sme-dokumen-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  disabled={uploadingDoc}
                  onChange={handleUploadReviewDoc}
                  className="sr-only"
                />
                <label
                  htmlFor="mv-sme-dokumen-upload"
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-[#EBF5EE] hover:border-[#3E9463] transition-colors cursor-pointer text-xs font-semibold text-[#0B3D2E] ${
                    uploadingDoc ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {uploadingDoc ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#3E9463]" />
                      <span>Mengunggah dokumen review...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-[#3E9463]" />
                      <span>Unggah Bukti Dokumen Preliminary Review</span>
                    </>
                  )}
                </label>
              </div>
            )}

            {Array.isArray(docData.dokumenFiles) && docData.dokumenFiles.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {docData.dokumenFiles.map((file: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-200 shadow-2xs"
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
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewDoc(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                Belum ada dokumen preliminary review yang dilampirkan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ KARTU 4: Analisis Hasil & Laporan MV ══ */}
      {cardType === "analisis_mv" && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1">
              Kesimpulan Product-Market Fit (PMF)
            </label>
            <Textarea
              rows={3}
              disabled={!canEdit}
              placeholder="Rangkum hasil pembuktian PMF dan kesiapan solusi untuk tahap komersialisasi..."
              value={docData.kesimpulanPmf || ""}
              onChange={(e) => updateField("kesimpulanPmf", e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
              <label className="text-xs font-bold text-amber-900">
                Keputusan Go / No-Go (Gerbang Forum Manajemen Inovasi) *
              </label>
            </div>
            <select
              disabled={!canEdit}
              value={docData.keputusanGoNogo || "go_ke_fmi"}
              onChange={(e) => updateField("keputusanGoNogo", e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white font-bold rounded-lg border border-amber-300 text-amber-900"
            >
              <option value="go_ke_fmi">🟢 GO — Lanjut ke Forum Manajemen Inovasi (FMI)</option>
              <option value="iterasi_mvp">🟡 ITERASI — Lakukan sprint perbaikan MVP</option>
              <option value="hold">⏸️ HOLD — Tunda keputusan</option>
              <option value="stop">🔴 STOP — Dihentikan</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Rekomendasi Iterasi
              </label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                placeholder="Penyempurnaan fitur atau strategi distribusi..."
                value={docData.rekomendasiIterasi || ""}
                onChange={(e) => updateField("rekomendasiIterasi", e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Rencana MVP Tahap Berikutnya
              </label>
              <Textarea
                rows={2}
                disabled={!canEdit}
                placeholder="Rencana scale-up atau rilis regional..."
                value={docData.rencanaMvpBerikutnya || ""}
                onChange={(e) => updateField("rencanaMvpBerikutnya", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1">
              Rekomendasi Promotor / Sponsor
            </label>
            <Textarea
              rows={2}
              disabled={!canEdit}
              placeholder="Catatan dukungan dari Promotor Inovasi..."
              value={docData.rekomendasiPromotorSponsor || ""}
              onChange={(e) => updateField("rekomendasiPromotorSponsor", e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Sub-tabel Rekapitulasi DFV */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <label className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
              <Table2 className="h-3.5 w-3.5 text-[#3E9463]" />
              <span>Sub-Tabel: Rekapitulasi Ketercapaian DFV (3 Aspek Baku)</span>
            </label>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2 w-[180px]">Kategori DFV</th>
                    <th className="p-2 w-[110px]">Rerata Skor (%)</th>
                    <th className="p-2 w-[90px]">Threshold</th>
                    <th className="p-2 w-[95px]">Status</th>
                    <th className="p-2">Catatan Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dfvRekapitulasiRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-2 font-bold text-gray-800">
                        {row.label || row.kategoriDfv.toUpperCase()}
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          disabled={!canEdit}
                          value={row.rataRataKetercapaian}
                          onChange={(e) =>
                            handleUpdateDfvRekap(idx, "rataRataKetercapaian", e.target.value)
                          }
                          className="text-xs h-7 bg-white text-center font-bold"
                        />
                      </td>
                      <td className="p-2 text-center text-gray-600 font-semibold">
                        {row.threshold || 70}%
                      </td>
                      <td className="p-1.5">
                        <select
                          disabled={!canEdit}
                          value={row.status}
                          onChange={(e) =>
                            handleUpdateDfvRekap(idx, "status", e.target.value)
                          }
                          className={`w-full h-7 px-1 text-[11px] rounded font-bold border ${
                            row.status === "lolos"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          <option value="lolos">🟢 Lolos</option>
                          <option value="belum">🟡 Belum</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <Input
                          disabled={!canEdit}
                          placeholder="Catatan..."
                          value={row.catatanKeputusan || ""}
                          onChange={(e) =>
                            handleUpdateDfvRekap(idx, "catatanKeputusan", e.target.value)
                          }
                          className="text-xs h-7 bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Simpan ke Laporan MV */}
      {canEdit && (
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/tim/${timId}/market-validation`}
            target="_blank"
            className="text-[11px] text-[#3E9463] hover:text-[#0B3D2E] flex items-center gap-1 font-semibold hover:underline"
          >
            <span>Buka Halaman Market Validation</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>

          <Button
            type="button"
            disabled={syncing}
            onClick={handleSimpanKeLaporanClick}
            className="bg-[#0B3D2E] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-2 h-9 px-5 rounded-xl shadow-2xs"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-[#F0C24B]" />
            )}
            <span>{syncing ? "Menyinkronkan..." : "💾 Simpan ke Laporan MV"}</span>
          </Button>
        </div>
      )}

      {/* Modal Konfirmasi Gerbang Keputusan Go/No-Go FMI */}
      <Dialog open={showGateConfirmModal} onOpenChange={setShowGateConfirmModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0B3D2E] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <span>Konfirmasi Keputusan Gerbang FMI</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 leading-relaxed mt-2">
              Anda akan menyimpan keputusan fase Market Validation:
              <br />
              <strong className="text-sm font-bold text-gray-900 block my-1">
                {docData.keputusanGoNogo === "go_ke_fmi"
                  ? "🟢 GO — Lanjut ke Forum Manajemen Inovasi (FMI)"
                  : docData.keputusanGoNogo === "iterasi_mvp"
                  ? "🟡 ITERASI — Lakukan sprint perbaikan MVP"
                  : docData.keputusanGoNogo === "hold"
                  ? "⏸️ HOLD — Tunda keputusan"
                  : "🔴 STOP — Dihentikan"}
              </strong>
              Keputusan ini akan tercatat resmi di Laporan Akhir Market Validation dan menjadi acuan sidang Forum Manajemen Inovasi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
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
              disabled={syncing}
              onClick={executeSyncToReport}
              className="bg-[#0B3D2E] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Ya, Simpan &amp; Tetapkan Keputusan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
