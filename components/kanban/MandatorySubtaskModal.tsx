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
} from "lucide-react";
import {
  getMandatorySubtaskDataAction,
  saveMandatorySubtaskDataAction,
} from "@/app/actions/kanban-custom-doc";

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
    reportFieldMapping?: Record<string, any> | null;
  } | null;
  onSuccess: (subtaskId: string) => void;
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

  const mappingField = subtask?.reportFieldMapping?.field || "";
  const isComplex = subtask?.subtaskType === "mandatory_complex";

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
          "Tersimpan ke Laporan CV"
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

  // ── Feedback Matrix Rows Handling (for mandatory_complex) ──
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
            Isian ini langsung terintegrasi dan menyinkronkan data ke Laporan Customer Validation.
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

            {/* 7. Preliminary Review SME */}
            {mappingField === "preliminary_review" && (
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
                    <span>Simpan ke Laporan CV</span>
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
