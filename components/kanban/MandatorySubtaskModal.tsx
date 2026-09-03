"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/ToastProvider";
import {
  Loader2,
  Save,
  FileCheck,
  Table2,
  Plus,
  Trash2,
  UploadCloud,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  HelpCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  getMandatorySubtaskDataAction,
  saveMandatorySubtaskDataAction,
} from "@/app/actions/kanban-custom-doc";
import { TEMUAN_KUALITATIF_BAKU_ROWS } from "@/lib/data/subtask-templates";

interface MandatorySubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  timId: string;
  cardId: string;
  cardTitle: string;
  subtask: {
    id: string;
    title: string;
    subtaskType: string;
    reportFieldMapping?: Record<string, any> | string | null;
  } | null;
  onSuccess: (subtaskId: string) => void;
}

function extractMappingField(st: MandatorySubtaskModalProps["subtask"]): string {
  if (!st) return "";
  let mapping: any = st.reportFieldMapping;
  if (typeof mapping === "string") {
    try {
      mapping = JSON.parse(mapping);
    } catch {}
  }
  if (mapping && typeof mapping === "object" && mapping.field) {
    return mapping.field;
  }

  // Fallback pattern matching dari title
  const title = (st.title || "").toLowerCase();
  if (
    title.includes("kesimpulan & keputusan go/no-go") ||
    (title.includes("kesimpulan") && (title.includes("go/no-go") || title.includes("market validation") || title.includes("pmf")))
  ) {
    return "kesimpulan_keputusan_mv";
  }
  if (title.includes("rilis mvp") || title.includes("data rilis")) {
    return "mvp_release_data";
  }
  if (title.includes("pengukuran dfv") || title.includes("traction") || title.includes("metrik dfv")) {
    return "dfv_traction_measurement";
  }
  if (title.includes("preliminary review") || (title.includes("catatan review") && title.includes("sme"))) {
    return "preliminary_review_mv";
  }
  if (title.includes("prototype") || title.includes("tautan prototype")) {
    return "prototype_link";
  }
  if (title.includes("responden") || title.includes("profil responden")) {
    return "responden_profil";
  }
  if (title.includes("mekanisme") || title.includes("lokasi testing")) {
    return "mekanisme_lokasi";
  }
  if (title.includes("feedback matrix") || title.includes("matriks feedback")) {
    return "feedback_matrix";
  }
  if (
    title.includes("7 parameter") ||
    title.includes("metrik psf") ||
    title.includes("pengukuran metrik psf") ||
    title.includes("hasil pengukuran metrik psf")
  ) {
    return "psf_7param_measurement";
  }
  if (
    title.includes("value proposition") ||
    title.includes("fitur kunci")
  ) {
    return "value_proposition_features";
  }
  if (
    title.includes("temuan kualitatif") ||
    title.includes("6 pertanyaan baku")
  ) {
    return "temuan_kualitatif_6baris";
  }
  if (title.includes("validated solution") || title.includes("psf")) {
    return "validated_solution_psf";
  }
  if (title.includes("kesimpulan") && title.includes("pembelajaran")) {
    return "kesimpulan_pembelajaran";
  }
  if (title.includes("keputusan lanjut") || title.includes("keputusan fit")) {
    return "keputusan_lanjut";
  }
  return "";
}

export function MandatorySubtaskModal({
  isOpen,
  onClose,
  timId,
  cardId,
  cardTitle,
  subtask,
  onSuccess,
}: MandatorySubtaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const mappingField = extractMappingField(subtask);
  const isComplex = subtask?.subtaskType === "mandatory_complex";
  const isMvField = ["mvp_release_data", "dfv_traction_measurement", "kesimpulan_keputusan_mv", "preliminary_review_mv"].includes(mappingField);

  useEffect(() => {
    if (isOpen && subtask && mappingField) {
      setLoading(true);
      getMandatorySubtaskDataAction(timId, cardId, mappingField)
        .then((res) => {
          if (res.success && res.data) {
            setFormData(res.data);
          } else {
            setFormData({});
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setFormData({});
    }
  }, [isOpen, subtask?.id, mappingField, timId, cardId]);

  if (!subtask) return null;

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveMandatorySubtaskDataAction(
        timId,
        cardId,
        subtask.id,
        mappingField,
        formData
      );

      if (res.success) {
        toast.success(
          `Subtask wajib "${subtask.title}" berhasil disimpan dan dicentang selesai!`,
          isMvField ? "Tersimpan ke Laporan MV" : "Tersimpan ke Laporan CV"
        );
        onSuccess(subtask.id);
        onClose();
      } else {
        toast.error(res.error || "Gagal menyimpan data subtask wajib.", "Gagal Simpan");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan.", "Gagal Simpan");
    } finally {
      setSaving(false);
    }
  };

  // ── DFV Traction Measurement Rows Handling (for Market Testing mandatory_complex) ──
  const dfvMeasurementRows: any[] = Array.isArray(formData.dfvMeasurementRows) ? formData.dfvMeasurementRows : [];

  const handleUpdateDfvMeasurementRow = (idx: number, key: string, val: any) => {
    const next = [...dfvMeasurementRows];
    const row = { ...next[idx], [key]: val };

    if (key === "hasilAktual") {
      const numActual = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
      const numTarget = parseFloat(String(row.target).replace(/[^0-9.-]/g, ""));
      if (!isNaN(numActual) && !isNaN(numTarget) && numTarget > 0) {
        const pct = Math.round((numActual / numTarget) * 100);
        row.persenTercapai = pct;
        const thresh = parseFloat(String(row.threshold || "70").replace(/[^0-9.-]/g, "")) || 70;
        row.status = pct >= thresh ? "lolos" : "belum";
      } else if (val === "" || val === null) {
        row.persenTercapai = null;
        row.status = "belum";
      }
    }

    if (key === "persenTercapai") {
      const pct = typeof val === "number" ? val : parseFloat(val) || 0;
      row.persenTercapai = pct;
      const thresh = parseFloat(String(row.threshold || "70").replace(/[^0-9.-]/g, "")) || 70;
      row.status = pct >= thresh ? "lolos" : "belum";
    }

    next[idx] = row;
    updateField("dfvMeasurementRows", next);
  };

  // ── Feedback Matrix Rows Handling (for CV mandatory_complex) ──
  const feedbackRows: any[] = Array.isArray(formData.feedbackRows) ? formData.feedbackRows : [];

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
    updateField("feedbackRows", [...feedbackRows, newRow]);
  };

  const handleUpdateFeedbackRow = (idx: number, key: string, val: string) => {
    const next = [...feedbackRows];
    next[idx] = { ...next[idx], [key]: val };
    updateField("feedbackRows", next);
  };

  const handleDeleteFeedbackRow = (idx: number) => {
    const next = feedbackRows.filter((_, i) => i !== idx);
    updateField("feedbackRows", next);
  };

  // ── PSF 7 Parameter Measurement Rows Handling (for CV mandatory_complex) ──
  const psfMeasurementRows: any[] = Array.isArray(formData.psfMeasurementRows) ? formData.psfMeasurementRows : [];

  const handleUpdatePsfMeasurementRow = (idx: number, key: string, val: any) => {
    const next = [...psfMeasurementRows];
    next[idx] = { ...next[idx], [key]: val };
    updateField("psfMeasurementRows", next);
  };

  // ── File Upload for Preliminary Review ──
  const handleUploadReviewFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB.", "File Terlalu Besar");
      return;
    }

    setUploadingDoc(true);
    try {
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      uploadBody.append("timId", timId);
      uploadBody.append("taskId", cardId);

      const res = await fetch("/api/tasks/upload-attachment", {
        method: "POST",
        body: uploadBody,
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Gagal mengunggah dokumen");
      }

      const existingFiles = Array.isArray(formData.dokumenFiles) ? formData.dokumenFiles : [];
      const updatedFiles = [
        ...existingFiles,
        {
          name: file.name,
          url: json.url,
          size: file.size,
        },
      ];
      updateField("dokumenFiles", updatedFiles);
      toast.success("Dokumen hasil preliminary review berhasil diunggah!", "Unggah Berhasil");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah file.", "Error");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleDeleteReviewFile = (idx: number) => {
    const existing = Array.isArray(formData.dokumenFiles) ? formData.dokumenFiles : [];
    updateField("dokumenFiles", existing.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          isComplex
            ? "w-full max-w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col"
            : "sm:max-w-xl max-h-[85vh] flex flex-col"
        }
      >
        <DialogHeader className="border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-[#0B3D2E] border border-emerald-300">
              Subtask Wajib
            </span>
            <span className="text-xs text-gray-500 font-medium truncate">
              {cardTitle}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2 pt-1">
            <FileCheck className="h-5 w-5 text-[#3E9463]" />
            <span>{subtask.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600">
            Isian ini langsung terintegrasi dan menyinkronkan data ke Laporan {isMvField ? "Market Validation" : "Customer Validation"}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#3E9463]" />
            <span>Memuat data dokumen kerja...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 py-3 space-y-4 text-xs">
            {/* 1. Prototype Link */}
            {mappingField === "prototype_link" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 flex items-center justify-between">
                    <span>URL / Tautan Prototype Solusi *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Figma, Web, App Demo, dll</span>
                  </label>
                  <Input
                    required
                    placeholder="https://www.figma.com/proto/... atau https://demo-app.com"
                    value={formData.prototypeLink || ""}
                    onChange={(e) => updateField("prototypeLink", e.target.value)}
                    className="text-xs font-mono bg-white"
                  />
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Otomatis Masuk ke Lembar Laporan
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Tautan ini akan langsung muncul di section <strong>Prototype Solusi</strong> pada Laporan Customer Validation dan menjadi rujukan saat pengujian responden.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Responden Profil */}
            {mappingField === "responden_profil" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Jumlah Responden Aktual *
                  </label>
                  <Input
                    required
                    type="number"
                    min={1}
                    max={999}
                    placeholder="Contoh: 10"
                    value={formData.jumlahRespondenAktual ?? ""}
                    onChange={(e) => updateField("jumlahRespondenAktual", e.target.value)}
                    className="text-xs bg-white w-36 font-bold"
                  />
                  <span className="text-[10px] text-gray-400">Target minimum: 5–10 orang responden</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Profil Ringkas Responden Aktual *
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Jelaskan demografi atau persona responden (misal: 6 Agen Pegadaian di Wilayah DKI Jakarta, 4 Nasabah Gadai aktif usia 25-40 tahun)..."
                    value={formData.profilRespondenAktual || ""}
                    onChange={(e) => updateField("profilRespondenAktual", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* 3. Mekanisme & Lokasi Testing */}
            {mappingField === "mekanisme_lokasi" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Mekanisme / Skenario Pengujian *
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Jelaskan alur pengujian tugas pengguna dengan prototype, panduan wawancara, dan fokus observasi..."
                    value={formData.mekanismeUserTesting || ""}
                    onChange={(e) => updateField("mekanismeUserTesting", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Tanggal &amp; Lokasi Pelaksanaan *
                  </label>
                  <Input
                    required
                    placeholder="Contoh: 12-14 Agustus 2026 di Kantor Cabang Salemba & Sesi Online Zoom"
                    value={formData.tanggalLokasiTesting || ""}
                    onChange={(e) => updateField("tanggalLokasiTesting", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* 4. Feedback Matrix per Responden (Kompleks) */}
            {mappingField === "feedback_matrix" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <Table2 className="h-4 w-4 text-[#3E9463]" />
                      <span>Matriks Feedback 5 Dimensi per Responden ({feedbackRows.length})</span>
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Catat respon verbal &amp; observasi responden untuk tiap dimensi testing. Geser tabel ke kanan jika kolom melebihi layar.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddFeedbackRow}
                    className="h-8 text-xs bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Responden</span>
                  </Button>
                </div>

                {feedbackRows.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                    <p className="text-gray-400 text-xs font-medium">Belum ada data feedback responden.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFeedbackRow}
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Baris Pertama</span>
                    </Button>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-[58vh]">
                      <table className="min-w-[1300px] w-full text-[11px] text-left border-collapse">
                        <thead className="bg-[#0B3D2E] text-white font-bold sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 border-r border-emerald-900 w-10 min-w-[40px] text-center">#</th>
                            <th className="p-2.5 border-r border-emerald-900 w-[240px] min-w-[240px]">
                              <span className="block font-bold">Profil Responden *</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Nama/Inisial &amp; Profil Segmen</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[170px] min-w-[170px]">
                              <span className="block font-bold">Usability</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Kemudahan UI / Alur</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[170px] min-w-[170px]">
                              <span className="block font-bold">Functionality</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Kesesuaian Fitur</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[170px] min-w-[170px]">
                              <span className="block font-bold">Solvability</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Penyelesaian Masalah</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[170px] min-w-[170px]">
                              <span className="block font-bold">Payability</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Kesediaan Membayar</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[160px] min-w-[160px]">
                              <span className="block font-bold">Others</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Catatan Tambahan</span>
                            </th>
                            <th className="p-2.5 border-r border-emerald-900 w-[200px] min-w-[200px]">
                              <span className="block font-bold">Priority Insight</span>
                              <span className="block text-[9.5px] font-normal text-emerald-200">Tindak Lanjut Utama</span>
                            </th>
                            <th className="p-2.5 w-12 min-w-[48px] text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {feedbackRows.map((row, idx) => (
                            <tr key={row.id || idx} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-2.5 font-bold text-gray-500 text-center border-r border-gray-100 align-top pt-3">
                                {idx + 1}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Nama / inisial & profil segmen responden..."
                                  value={row.respondenProfil || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "respondenProfil", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                  required
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Kemudahan alur dan pemahaman UI/UX..."
                                  value={row.usability || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "usability", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Kesesuaian fitur dengan kebutuhan..."
                                  value={row.functionality || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "functionality", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Tingkat penyelesaian masalah utama..."
                                  value={row.solvability || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "solvability", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Kesediaan membayar atau berlangganan..."
                                  value={row.payability || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "payability", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Catatan observasi tambahan..."
                                  value={row.others || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "others", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Tindak lanjut atau temuan kunci..."
                                  value={row.priorityInsightAction || ""}
                                  onChange={(e) => handleUpdateFeedbackRow(idx, "priorityInsightAction", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] placeholder:text-[10.5px] placeholder:text-gray-400 leading-snug w-full font-medium text-emerald-900"
                                />
                              </td>
                              <td className="p-2 text-center align-top pt-3">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFeedbackRow(idx)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-colors"
                                  title="Hapus baris responden ini"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4b. HASIL PENGUKURAN METRIK PSF (7 PARAMETER) (CV Mandatory Complex) */}
            {mappingField === "psf_7param_measurement" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <Table2 className="h-4 w-4 text-[#3E9463]" />
                      <span>Tabel Pengukuran 7 Parameter Metrik PSF (Customer Validation)</span>
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Evaluasi pencapaian aktual terhadap target yang ditetapkan di Section E CV Plan. Data tersimpan langsung ke Section D Laporan CV.
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    7 Parameter Baku
                  </span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[52vh]">
                    <table className="min-w-[1100px] w-full text-[11px] text-left border-collapse">
                      <thead className="bg-[#0B3D2E] text-white font-bold sticky top-0 z-10 text-[10.5px]">
                        <tr>
                          <th className="p-2.5 border-r border-emerald-900 w-10 text-center">#</th>
                          <th className="p-2.5 border-r border-emerald-900 w-28 text-center">Validasi</th>
                          <th className="p-2.5 border-r border-emerald-900 w-52">Metrik Baku</th>
                          <th className="p-2.5 border-r border-emerald-900 w-44">Target / Kriteria</th>
                          <th className="p-2.5 border-r border-emerald-900 w-36 bg-emerald-950">Hasil Aktual *</th>
                          <th className="p-2.5 border-r border-emerald-900 w-40">% Tercapai / Interpretasi</th>
                          <th className="p-2.5 border-r border-emerald-900 w-48">Learning Utama</th>
                          <th className="p-2.5 w-48">Enhancement Prototype</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {psfMeasurementRows.map((row, idx) => {
                          const catName = String(row.validasi || "").toLowerCase();
                          const isDesirability = catName === "desirability";
                          const isFeasibility = catName === "feasibility";
                          return (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                row.isExcluded ? "bg-gray-100/70 opacity-75" : "hover:bg-gray-50/80"
                              }`}
                            >
                              <td className="p-2.5 font-bold text-gray-500 text-center border-r border-gray-100 align-top pt-3">
                                {idx + 1}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                                    isDesirability
                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                      : isFeasibility
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-purple-100 text-purple-800 border border-purple-300"
                                  }`}
                                >
                                  {row.validasi}
                                </span>
                              </td>
                              <td className="p-2.5 border-r border-gray-100 align-top font-bold text-gray-800 text-[11px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className={row.isExcluded ? "line-through text-gray-400" : ""}>{row.metrik}</span>
                                  {row.isExcluded && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-600 self-start">
                                      Tidak digunakan tim ini (Dikecualikan Coach)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 border-r border-gray-100 align-top text-[10.5px] text-gray-600 bg-gray-50/50 leading-relaxed font-medium">
                                {row.isExcluded ? (
                                  <span className="italic text-gray-400">Tidak digunakan tim ini</span>
                                ) : (
                                  row.target || "-"
                                )}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top bg-emerald-50/20">
                                <Input
                                  required={!row.isExcluded}
                                  disabled={row.isExcluded}
                                  placeholder={row.isExcluded ? "Tidak digunakan tim ini" : "Hasil pengujian..."}
                                  value={row.isExcluded ? "Tidak digunakan tim ini" : (row.hasilAktual || "")}
                                  onChange={(e) =>
                                    handleUpdatePsfMeasurementRow(idx, "hasilAktual", e.target.value)
                                  }
                                  className={`h-8 text-[11px] font-semibold ${
                                    row.isExcluded
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : "bg-white border-emerald-300 focus:border-emerald-600"
                                  }`}
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Input
                                  disabled={row.isExcluded}
                                  placeholder={row.isExcluded ? "Dikecualikan oleh Coach" : "Contoh: 85% / Sesuai..."}
                                  value={row.isExcluded ? "Dikecualikan oleh Coach" : (row.interpretasi || "")}
                                  onChange={(e) =>
                                    handleUpdatePsfMeasurementRow(idx, "interpretasi", e.target.value)
                                  }
                                  className={`h-8 text-[11px] ${
                                    row.isExcluded ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white border-gray-300"
                                  }`}
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  disabled={row.isExcluded}
                                  placeholder={row.isExcluded ? "-" : "Learning utama..."}
                                  value={row.isExcluded ? "-" : (row.learning || "")}
                                  onChange={(e) =>
                                    handleUpdatePsfMeasurementRow(idx, "learning", e.target.value)
                                  }
                                  className={`text-[10.5px] min-h-[34px] leading-tight ${
                                    row.isExcluded ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white border-gray-300"
                                  }`}
                                />
                              </td>
                              <td className="p-2 align-top">
                                <Textarea
                                  rows={2}
                                  disabled={row.isExcluded}
                                  placeholder={row.isExcluded ? "-" : "Tindak lanjut penyempurnaan..."}
                                  value={row.isExcluded ? "-" : (row.enhancement || "")}
                                  onChange={(e) =>
                                    handleUpdatePsfMeasurementRow(idx, "enhancement", e.target.value)
                                  }
                                  className={`text-[10.5px] min-h-[34px] leading-tight ${
                                    row.isExcluded ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white border-gray-300"
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Validated Solution & PSF */}
            {mappingField === "validated_solution_psf" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Validated Solution (Solusi yang Tervalidasi) *
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Jelaskan bentuk solusi final yang terbukti menjawab problem pengguna berdasarkan bukti hasil testing..."
                    value={formData.validatedSolution || ""}
                    onChange={(e) => updateField("validatedSolution", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Status Ketercapaian Problem-Solution Fit (PSF) *
                  </label>
                  <select
                    required
                    value={formData.ketercapaianPsf || "tercapai"}
                    onChange={(e) => updateField("ketercapaianPsf", e.target.value)}
                    className="text-xs bg-white border border-gray-300 rounded-lg p-2 font-semibold text-gray-800 w-full focus:ring-1 focus:ring-[#3E9463]"
                  >
                    <option value="tercapai">✅ Tercapai (PSF Terbukti)</option>
                    <option value="tercapai_dengan_catatan">⚠️ Tercapai dengan Catatan Perbaikan</option>
                    <option value="belum_tercapai">❌ Belum Tercapai (Perlu Iterasi / Pivot)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Value Proposition & Fitur Kunci Solusi */}
            {mappingField === "value_proposition_features" && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block text-xs">
                    Value Proposition (Nilai Unik Solusi) *
                  </label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="Nilai unik atau manfaat utama yang dirasakan pelanggan dibanding solusi eksisting..."
                    value={formData.valueProposition || ""}
                    onChange={(e) => updateField("valueProposition", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-800 block text-xs">
                    Fitur Kunci Solusi (Tiga Fitur Utama yang Divalidasi) *
                  </label>
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-semibold text-gray-600">Fitur Kunci 1 *</span>
                      <Input
                        required
                        placeholder="Contoh: Otomasi kalkulator taksiran emas"
                        value={formData.fiturKunci1 || ""}
                        onChange={(e) => updateField("fiturKunci1", e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-semibold text-gray-600">Fitur Kunci 2 *</span>
                      <Input
                        required
                        placeholder="Contoh: Booking jemput berkas gadai"
                        value={formData.fiturKunci2 || ""}
                        onChange={(e) => updateField("fiturKunci2", e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-semibold text-gray-600">Fitur Kunci 3 *</span>
                      <Input
                        required
                        placeholder="Contoh: Notifikasi peringatan jatuh tempo via WA"
                        value={formData.fiturKunci3 || ""}
                        onChange={(e) => updateField("fiturKunci3", e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block text-xs">
                    Flow Solusi (Alur Interaksi Pengguna &amp; Operasional) *
                  </label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="Jelaskan langkah demi langkah bagaimana pengguna berinteraksi dengan solusi mulai dari awal hingga tuntas..."
                    value={formData.flowSolusi || ""}
                    onChange={(e) => updateField("flowSolusi", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Temuan Kualitatif (6 Pertanyaan Baku) */}
            {mappingField === "temuan_kualitatif_6baris" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Evaluasi 6 pertanyaan kunci baku resmi dari Template 2.2 untuk menggali feedback esensial responden. Kolom Kategori dan Pertanyaan Kunci bersifat baku (read-only), silakan lengkapi Temuan Utama hasil pengujian tim.
                </p>
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5 w-1/4">Kategori</th>
                        <th className="p-2.5 w-1/3">Pertanyaan Kunci (Baku)</th>
                        <th className="p-2.5">Temuan Utama (Isian Tim) *</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {(formData.temuanRows || TEMUAN_KUALITATIF_BAKU_ROWS).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-2.5 font-bold text-gray-900 align-top bg-gray-50/50">
                            {row.kategori}
                          </td>
                          <td className="p-2.5 text-gray-600 align-top text-[11px] leading-relaxed">
                            {row.pertanyaanKunci}
                          </td>
                          <td className="p-2 align-top">
                            <Textarea
                              required
                              rows={2}
                              placeholder={`Tulis temuan utama untuk ${row.kategori.toLowerCase()}...`}
                              value={row.temuanUtama || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const currentRows = [...(formData.temuanRows || TEMUAN_KUALITATIF_BAKU_ROWS)];
                                currentRows[idx] = { ...currentRows[idx], temuanUtama: val };
                                updateField("temuanRows", currentRows);
                              }}
                              className="text-xs bg-white border border-gray-200 focus:border-[#3E9463]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Kesimpulan & Pembelajaran */}
            {mappingField === "kesimpulan_pembelajaran" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Kesimpulan Utama &amp; Pembelajaran Tim *
                  </label>
                  <Textarea
                    required
                    rows={5}
                    placeholder="Rangkum kesimpulan menyeluruh, temuan tak terduga, dan pembelajaran berharga selama fase Customer Validation..."
                    value={formData.kesimpulan || ""}
                    onChange={(e) => updateField("kesimpulan", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* 7. Preliminary Review SME (CV & MV) */}
            {(mappingField === "preliminary_review" || mappingField === "preliminary_review_mv") && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Nama Reviewer / SME / Coach *
                    </label>
                    <Input
                      required
                      placeholder="Contoh: Bpk. Hendra (SME Bisnis Mikro)"
                      value={formData.reviewerNama || ""}
                      onChange={(e) => updateField("reviewerNama", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Tanggal Review *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.tanggalReview || ""}
                      onChange={(e) => updateField("tanggalReview", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Catatan Review &amp; Rekomendasi SME *
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Tuliskan poin-poin evaluasi teknis/bisnis, masukan mitigasi risiko, dan rekomendasi SME..."
                    value={formData.catatanSme || ""}
                    onChange={(e) => updateField("catatanSme", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                {/* Upload Dokumen Review */}
                <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <label className="font-bold text-gray-800 text-xs block">
                    Dokumen Berita Acara / Lembar Hasil Review
                  </label>
                  
                  {Array.isArray(formData.dokumenFiles) && formData.dokumenFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2">
                      {formData.dokumenFiles.map((doc: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200 text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <FileText className="h-3.5 w-3.5 text-[#3E9463] shrink-0" />
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-gray-800 truncate hover:text-[#0B3D2E] hover:underline block"
                            >
                              {doc.name}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteReviewFile(i)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    id="mandatory-review-file-input"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    disabled={uploadingDoc}
                    onChange={handleUploadReviewFile}
                  />
                  <label
                    htmlFor="mandatory-review-file-input"
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-[#3E9463] bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors cursor-pointer text-xs font-bold text-[#0B3D2E] ${
                      uploadingDoc ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                        <span>Mengunggah dokumen...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5 text-[#3E9463]" />
                        <span>Unggah File Dokumen Review (Maks 10MB)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* 8. Keputusan Lanjut (Resmi: lanjut, iterasi, hold, stop) */}
            {mappingField === "keputusan_lanjut" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Keputusan Kelanjutan Inovasi (Gerbang Market Validation) *
                  </label>
                  <select
                    required
                    value={formData.keputusan || "lanjut"}
                    onChange={(e) => updateField("keputusan", e.target.value)}
                    className="text-xs bg-white border-2 border-emerald-600 rounded-lg p-2 font-bold text-[#0B3D2E] w-full focus:ring-1 focus:ring-[#3E9463]"
                  >
                    <option value="lanjut">🚀 Lanjut ke Market Validation (MVP Release)</option>
                    <option value="iterasi">🔄 Iterasi Solusi / Prototype Ulang</option>
                    <option value="hold">⏸️ Hold / Tunda</option>
                    <option value="stop">🛑 Stop (Hentikan Proyek)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Catatan Justifikasi &amp; Rencana Awal MVP *
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Tuliskan justifikasi keputusan dan persiapan rilis MVP di fase Market Validation..."
                    value={formData.catatanMvpPlanning || ""}
                    onChange={(e) => updateField("catatanMvpPlanning", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-amber-700" />
                    Gerbang Kelolosan Fase Customer Validation
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Keputusan <strong>"Lanjut ke Market Validation (MVP Release)"</strong> akan membuka akses tim ke instrumen perencanaan MVP (Template 3.1 &amp; 3.2).
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 9. DATA RILIS MVP (MV Mandatory Simple) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {mappingField === "mvp_release_data" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      MVP Version yang Dilaporkan *
                    </label>
                    <Input
                      required
                      placeholder="Contoh: MVP 1.0"
                      value={formData.mvpVersionDilaporkan || ""}
                      onChange={(e) => updateField("mvpVersionDilaporkan", e.target.value)}
                      className="text-xs bg-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Periode Rilis Mulai *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.periodeRilisMulai || ""}
                      onChange={(e) => updateField("periodeRilisMulai", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Periode Rilis Selesai *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.periodeRilisSelesai || ""}
                      onChange={(e) => updateField("periodeRilisSelesai", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Lokasi / Kanal Distribusi Rilis *
                    </label>
                    <Input
                      required
                      placeholder="Contoh: Aplikasi Web Internal, 5 Outlet Pegadaian Area Jakarta"
                      value={formData.lokasiChannelRilis || ""}
                      onChange={(e) => updateField("lokasiChannelRilis", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Jumlah Early Adopters Aktual *
                    </label>
                    <Input
                      type="number"
                      min={0}
                      required
                      placeholder="Contoh: 50"
                      value={formData.jumlahEarlyAdoptersAktual ?? ""}
                      onChange={(e) => updateField("jumlahEarlyAdoptersAktual", e.target.value)}
                      className="text-xs bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Ringkasan Aktivitas Rilis &amp; Go-Live *
                  </label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="Uraikan rangkaian proses deployment, sosialisasi pengguna, dan kickoff uji coba operasional MVP..."
                    value={formData.ringkasanAktivitasRilis || ""}
                    onChange={(e) => updateField("ringkasanAktivitasRilis", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Kendala Utama yang Dihadapi
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Catat isu teknis/operasional selama rilis jika ada..."
                      value={formData.kendalaUtama || ""}
                      onChange={(e) => updateField("kendalaUtama", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Perubahan / Deviasi dari MVP Plan
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Perubahan skop fitur atau jadwal rilis dibanding rencana awal..."
                      value={formData.perubahanDariPlan || ""}
                      onChange={(e) => updateField("perubahanDariPlan", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Otomatis Tersinkronkan ke Laporan Market Validation
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Data rilis ini langsung mengisi section <strong>Pelaksanaan Rilis MVP</strong> pada Laporan Resmi Market Validation.
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 10. HASIL PENGUKURAN DFV & TRAKSI (MV Mandatory Complex - 9 Baris) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {mappingField === "dfv_traction_measurement" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <Table2 className="h-4 w-4 text-[#3E9463]" />
                      <span>Tabel Pengukuran 9 Metrik DFV &amp; Traksi Pasar</span>
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Isi kolom Hasil Aktual, Learning, dan Enhancement. Nilai % Tercapai dan Status dihitung otomatis dibanding Threshold.
                    </p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[52vh]">
                    <table className="min-w-[1250px] w-full text-[11px] text-left border-collapse">
                      <thead className="bg-[#0B3D2E] text-white font-bold sticky top-0 z-10 text-[10.5px]">
                        <tr>
                          <th className="p-2.5 border-r border-emerald-900 w-10 text-center">#</th>
                          <th className="p-2.5 border-r border-emerald-900 w-28">Kategori</th>
                          <th className="p-2.5 border-r border-emerald-900 w-56">Metrik Target</th>
                          <th className="p-2.5 border-r border-emerald-900 w-20 text-center">Baseline</th>
                          <th className="p-2.5 border-r border-emerald-900 w-24 text-center">Target</th>
                          <th className="p-2.5 border-r border-emerald-900 w-20 text-center">Threshold</th>
                          <th className="p-2.5 border-r border-emerald-900 w-28 text-center bg-emerald-950">
                            Hasil Aktual *
                          </th>
                          <th className="p-2.5 border-r border-emerald-900 w-24 text-center">
                            % Tercapai
                          </th>
                          <th className="p-2.5 border-r border-emerald-900 w-20 text-center">
                            Status
                          </th>
                          <th className="p-2.5 border-r border-emerald-900 w-44">Learning</th>
                          <th className="p-2.5 w-44">Enhancement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {dfvMeasurementRows.map((row, idx) => {
                          const catName = String(row.validasi || "").toLowerCase();
                          const isDesirability = catName === "desirability";
                          const isFeasibility = catName === "feasibility";
                          const isViability = catName === "viability";

                          return (
                            <tr key={row.id || idx} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-2.5 font-bold text-gray-500 text-center border-r border-gray-100 align-top pt-3">
                                {idx + 1}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    isDesirability
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : isFeasibility
                                      ? "bg-blue-100 text-blue-900 border border-blue-300"
                                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  }`}
                                >
                                  {isDesirability ? "Desirability" : isFeasibility ? "Feasibility" : "Viability"}
                                </span>
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top">
                                <div className="font-semibold text-gray-900 leading-snug">
                                  {row.metrik}
                                </div>
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center text-gray-500 font-mono">
                                {row.baseline || "-"}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center font-bold text-gray-800 font-mono">
                                {row.target || "-"}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center text-gray-600 font-mono">
                                {row.threshold || "70%"}
                              </td>
                              <td className="p-1.5 border-r border-gray-100 align-top bg-emerald-50/30">
                                <Input
                                  required
                                  placeholder="Contoh: 85%"
                                  value={row.hasilAktual || ""}
                                  onChange={(e) => handleUpdateDfvMeasurementRow(idx, "hasilAktual", e.target.value)}
                                  className="h-8 text-xs font-bold text-center bg-white border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                />
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center">
                                {row.persenTercapai !== null && row.persenTercapai !== undefined ? (
                                  <span className="font-extrabold text-xs text-gray-900 font-mono">
                                    {row.persenTercapai}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-mono">-</span>
                                )}
                              </td>
                              <td className="p-2 border-r border-gray-100 align-top text-center">
                                {row.status === "lolos" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span>Lolos</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                    <span>Belum</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 border-r border-gray-100 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Pembelajaran dari data pasar..."
                                  value={row.learning || ""}
                                  onChange={(e) => handleUpdateDfvMeasurementRow(idx, "learning", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] leading-snug w-full"
                                />
                              </td>
                              <td className="p-1.5 align-top">
                                <Textarea
                                  rows={2}
                                  placeholder="Tindakan penyempurnaan..."
                                  value={row.enhancement || ""}
                                  onChange={(e) => handleUpdateDfvMeasurementRow(idx, "enhancement", e.target.value)}
                                  className="text-xs p-1.5 resize-none bg-white rounded-md border border-gray-200 focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] leading-snug w-full"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rekapitulasi DFV Preview Banner */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#F0C24B]" />
                      Sinkronisasi Otomatis ke Rekapitulasi DFV (3 Baris Resmi):
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Threshold Kelolosan Kategori: ≥ 70%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {["desirability", "feasibility", "viability"].map((cat) => {
                      const catRows = dfvMeasurementRows.filter((r) => (r.validasi || "").toLowerCase() === cat);
                      const validPcts = catRows.map((c) => c.persenTercapai).filter((p): p is number => typeof p === "number" && !isNaN(p));
                      const avg = validPcts.length > 0 ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : 0;
                      const isPass = avg >= 70;

                      return (
                        <div key={cat} className="p-2 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                          <span className="font-bold capitalize text-gray-800">{cat}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-extrabold text-gray-900">{avg}%</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isPass ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {isPass ? "Lolos" : "Belum"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 11. KESIMPULAN & KEPUTUSAN GO/NO-GO (MV Mandatory Simple) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {mappingField === "kesimpulan_keputusan_mv" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Kesimpulan Product-Market Fit (PMF) *
                  </label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="Jelaskan kesimpulan akhir apakah produk telah mencapai kecocokan pasar (PMF), tingkat respon traksi pasar, dan kelayakan kelanjutan inovasi..."
                    value={formData.kesimpulanPmf || ""}
                    onChange={(e) => updateField("kesimpulanPmf", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Keputusan Go / No-Go (Gerbang Forum Manajemen Inovasi) *
                  </label>
                  <select
                    required
                    value={formData.keputusanGoNogo || "go_ke_fmi"}
                    onChange={(e) => updateField("keputusanGoNogo", e.target.value)}
                    className="text-xs bg-white border-2 border-emerald-600 rounded-lg p-2.5 font-bold text-[#0B3D2E] w-full focus:ring-1 focus:ring-[#3E9463]"
                  >
                    <option value="go_ke_fmi">🚀 Go ke Forum Manajemen Inovasi (Scale-Up Bisnis)</option>
                    <option value="iterasi_mvp">🔄 Iterasi MVP &amp; Lanjutkan Pilot Uji Coba</option>
                    <option value="hold">⏸️ Hold / Tunda</option>
                    <option value="stop">🛑 Stop (Hentikan Proyek)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Rekomendasi Iterasi
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Rencana perbaikan fitur atau model operasional..."
                      value={formData.rekomendasiIterasi || ""}
                      onChange={(e) => updateField("rekomendasiIterasi", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-800 block">
                      Rencana MVP Tahap Berikutnya
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Roadmap ekspansi atau perilisan versi berikutnya..."
                      value={formData.rencanaMvpBerikutnya || ""}
                      onChange={(e) => updateField("rencanaMvpBerikutnya", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">
                    Rekomendasi untuk Promotor &amp; Sponsor Inovasi
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Poin strategis yang perlu didukung oleh manajemen atau divisi sponsor..."
                    value={formData.rekomendasiPromotorSponsor || ""}
                    onChange={(e) => updateField("rekomendasiPromotorSponsor", e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-amber-700" />
                    Gerbang Kelolosan Fase Market Validation → FMI
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Keputusan <strong>&quot;Go ke Forum Manajemen Inovasi&quot;</strong> akan membuka akses tim ke menu Governance &amp; Sidang FMI bersama Dewan Direksi.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-gray-100 flex flex-row items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="text-xs bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold gap-1.5 px-4 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan ke Laporan {isMvField ? "MV" : "CV"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
