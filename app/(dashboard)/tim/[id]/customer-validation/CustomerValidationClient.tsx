"use client";

import { useState } from "react";
import {
  saveCustomerValidationPlanFullAction,
  saveCustomerValidationReportAction,
} from "@/app/actions/customer-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Save, CheckCircle2, FileCheck, ClipboardList, Upload, X, ExternalLink,
  Paperclip, FileText, ImageIcon, Table2, BarChart3,
} from "lucide-react";
import { toast } from "@/components/ui/ToastProvider";

// ── Konstanta tetap ─────────────────────────────────────────────────────────

const DIMENSI_ROWS = [
  {
    key: "usability",
    label: "Usability",
    fokus: "Kemudahan, kejelasan, dan pengalaman interaksi dengan prototype.",
    contoh: "Bagian mana yang mudah, membingungkan, atau membutuhkan bantuan?",
  },
  {
    key: "functionality",
    label: "Functionality",
    fokus: "Kesesuaian fungsi/fitur dengan kebutuhan dan apakah alur bekerja seperti yang diharapkan.",
    contoh: "Fungsi apa yang paling membantu, tidak bekerja, atau masih kurang?",
  },
  {
    key: "solvability",
    label: "Solvability",
    fokus: "Kemampuan solusi menyelesaikan problem worth solving dan menghasilkan outcome yang dibutuhkan.",
    contoh: "Sejauh mana solusi ini menyelesaikan masalah utama Anda? Mengapa?",
  },
  {
    key: "payability",
    label: "Payability",
    fokus: "Kesediaan membayar, menggunakan, berkomitmen, atau menanggung effort/perubahan perilaku.",
    contoh: "Apakah value yang diperoleh sepadan dengan biaya, waktu, atau effort?",
  },
  {
    key: "others",
    label: "Others",
    fokus: "Masukan di luar empat dimensi utama, termasuk risiko, kebutuhan tambahan, dan ide baru.",
    contoh: "Apa yang perlu ditambah, dikurangi, diubah, atau diperhatikan?",
  },
];

const METRIK_ROWS = [
  {
    validasi: "Desirability",
    metrik: "Kepuasan Pengguna",
    unit: "Skala 1-5",
    kriteria: 'Rata-rata ≥4 atau target lain yang disepakati',
    cara: "Survey pasca-testing dan alasan verbal di balik skor",
  },
  {
    validasi: "Desirability",
    metrik: "Ketertarikan Penggunaan Berulang",
    unit: "Sering sekali/Sering/Kadang/Jarang/Tidak pernah",
    kriteria: 'Mayoritas minimal "Sering" atau target lain yang disepakati',
    cara: "Survey/wawancara",
  },
  {
    validasi: "Desirability",
    metrik: "Rekomendasi kepada Orang Lain",
    unit: "Ya pasti/Mungkin/Tidak yakin/Mungkin tidak/Pasti tidak",
    kriteria: 'Mayoritas minimal "Mungkin"',
    cara: "Survey/wawancara",
  },
  {
    validasi: "Desirability",
    metrik: "Kejelasan dan Kemudahan Penggunaan",
    unit: "Skala 1-5 atau Mudah sekali s.d. Sangat sulit",
    kriteria: 'Rata-rata ≥4 atau mayoritas "Mudah"',
    cara: "Observasi dan survey",
  },
  {
    validasi: "Desirability",
    metrik: "Kesediaan Membayar / Menggunakan",
    unit: "Skala kesediaan",
    kriteria: "Mayoritas bersedia membayar/menggunakan sesuai konteks inovasi",
    cara: "Survey harga/value atau komitmen penggunaan",
  },
  {
    validasi: "Feasibility On Paper",
    metrik: "Kelayakan teknis/operasional awal",
    unit: "Skala 1-5 / catatan SME",
    kriteria: "Tidak ada blocker kritis sebelum MVP",
    cara: "Review awal IT/Operasional/SME",
  },
  {
    validasi: "Viability On Paper",
    metrik: "Potensi dampak bisnis/ekonomi awal",
    unit: "Estimasi Rp/%/skala 1-5",
    kriteria: "Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP",
    cara: "Estimasi dampak, cost-benefit awal, input Renstra/Finance",
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function fileIcon(url: string) {
  if (/\.(pdf)$/i.test(url)) return <FileText className="h-4 w-4 text-red-500" />;
  if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  return <Paperclip className="h-4 w-4 text-gray-400" />;
}

function fileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop()?.split("_").slice(1).join("_") || url);
  } catch {
    return url.split("/").pop() || url;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CustomerValidationClient({
  timId,
  initialData,
}: {
  timId: string;
  initialData: any;
}) {
  // ── Plan state ─────────────────────────────────────────────────────────────
  const [planForm, setPlanForm] = useState({
    projectMission: initialData?.plan?.projectMission || "",
    customerDanContext: initialData?.plan?.customerDanContext || "",
    problemHypothesis: initialData?.plan?.problemHypothesis || "",
    hmw: initialData?.plan?.hmw || "",
    solutionHypothesis: initialData?.plan?.solutionHypothesis || "",
    prototypeType: initialData?.plan?.prototypeType || "Figma / Clickable Prototype",
    fiturAlurDiuji: initialData?.plan?.fiturAlurDiuji || "",
    skenarioUserTesting: initialData?.plan?.skenarioUserTesting || "",
    instrumenValidasi: initialData?.plan?.instrumenValidasi || "",
    targetEarlyAdopters: initialData?.plan?.targetEarlyAdopters || "",
    kriteriaSeleksi: initialData?.plan?.kriteriaSeleksi || "",
    jumlahTargetResponden: initialData?.plan?.jumlahTargetResponden || 10,
    lokasiChannelTesting: initialData?.plan?.lokasiChannelTesting || "",
    metodeRekrutmen: initialData?.plan?.metodeRekrutmen || "",
    etikaPersetujuanData: initialData?.plan?.etikaPersetujuanData || "",
    dataDukung: (initialData?.plan?.dataDukung as string[]) || [],
  });

  // ── Dimensi feedback state ─────────────────────────────────────────────────
  const initDimensi = () => {
    const map: Record<string, string> = {};
    DIMENSI_ROWS.forEach((d) => { map[d.key] = ""; });
    (initialData?.dimensiFeedback || []).forEach((row: any) => {
      map[row.dimensi] = row.evidenceYangDikumpulkan || "";
    });
    return map;
  };
  const [dimensiEvidence, setDimensiEvidence] = useState<Record<string, string>>(initDimensi);

  // ── Metrik catatan state ───────────────────────────────────────────────────
  const initMetrik = () => {
    const map: Record<string, string> = {};
    METRIK_ROWS.forEach((r) => { map[r.metrik] = ""; });
    (initialData?.metrikRencana || []).forEach((row: any) => {
      map[row.metrik] = row.catatan || "";
    });
    return map;
  };
  const [metrikCatatan, setMetrikCatatan] = useState<Record<string, string>>(initMetrik);

  // ── Report state ──────────────────────────────────────────────────────────
  const [reportForm, setReportForm] = useState({
    validatedSolution: initialData?.report?.validatedSolution || "",
    valueProposition: initialData?.report?.valueProposition || "",
    fiturKunci1: initialData?.report?.fiturKunci1 || "",
    fiturKunci2: initialData?.report?.fiturKunci2 || "",
    fiturKunci3: initialData?.report?.fiturKunci3 || "",
    jumlahRespondenAktual: initialData?.report?.jumlahRespondenAktual || 10,
    profilRespondenAktual: initialData?.report?.profilRespondenAktual || "",
    kesimpulan: initialData?.report?.kesimpulan || "",
    ketercapaianPsf: initialData?.report?.ketercapaianPsf || "tercapai",
    keputusan: initialData?.report?.keputusan || "lanjut",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { dataDukung, ...planValues } = planForm;
    const res = await saveCustomerValidationPlanFullAction(
      timId,
      { ...planValues, dataDukung: dataDukung as any },
      dimensiEvidence,
      metrikCatatan,
    );
    if (res.success) {
      toast.success("Customer Validation Plan berhasil disimpan!", "Plan Tersimpan");
    } else {
      toast.error((res as any).error || "Gagal menyimpan.", "Gagal Menyimpan");
    }
    setSaving(false);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.plan?.id) {
      toast.error("Harap simpan Customer Validation Plan terlebih dahulu.", "Validasi Diperlukan");
      return;
    }
    setSaving(true);
    const res = await saveCustomerValidationReportAction(initialData.plan.id, timId, reportForm);
    if (res.success) {
      toast.success("Customer Validation Report berhasil disimpan!", "Laporan Tersimpan");
    } else {
      toast.error((res as any).error || "Gagal menyimpan.", "Gagal Menyimpan");
    }
    setSaving(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contextType", "customer_validation");
      formData.append("timId", timId);
      const res = await fetch("/api/cv/upload-attachment", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.publicUrl) {
        setPlanForm((prev) => ({ ...prev, dataDukung: [...prev.dataDukung, json.publicUrl] }));
        toast.success(`File "${file.name}" berhasil diunggah.`, "Upload Berhasil");
      } else {
        toast.error(json.message || "Gagal upload file.", "Upload Gagal");
      }
    } catch {
      toast.error("Terjadi kesalahan saat upload.", "Upload Gagal");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (url: string) => {
    setPlanForm((prev) => ({ ...prev, dataDukung: prev.dataDukung.filter((u) => u !== url) }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plan" className="flex items-center gap-2 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>1. Validation Plan</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2 text-xs">
            <FileCheck className="h-3.5 w-3.5" />
            <span>2. Validation Report (Hasil)</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: PLAN ═══════════════════════════════════════════════════ */}
        <TabsContent value="plan" className="space-y-5 mt-4">
          <form onSubmit={handleSavePlan} className="space-y-5">

            {/* ── BAGIAN 1: Konteks & Hipotesis ────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  A. Konteks Inovasi & Hipotesis
                </CardTitle>
                <CardDescription className="text-xs">
                  Rumusan problem-solution fit yang akan divalidasi kepada pelanggan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Project Mission
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Rumusan aspiratif, kuantitatif, dan time-bound dari proyek inovasi ini..."
                    value={planForm.projectMission}
                    onChange={(e) => setPlanForm({ ...planForm, projectMission: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Customer &amp; Context
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Customer prioritas dan area bantuan (job-to-be-done) yang diuji..."
                    value={planForm.customerDanContext}
                    onChange={(e) => setPlanForm({ ...planForm, customerDanContext: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Problem Hypothesis
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Asumsi masalah yang akan divalidasi, termasuk bukti awal yang mendukung hipotesis ini..."
                    value={planForm.problemHypothesis}
                    onChange={(e) => setPlanForm({ ...planForm, problemHypothesis: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    How Might We (HMW)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Pertanyaan peluang yang menghubungkan customer, problem, dan outcome yang diinginkan..."
                    value={planForm.hmw}
                    onChange={(e) => setPlanForm({ ...planForm, hmw: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Solution Hypothesis
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Asumsi solusi/prototype yang akan diuji kepada customer, termasuk manfaat utamanya..."
                    value={planForm.solutionHypothesis}
                    onChange={(e) => setPlanForm({ ...planForm, solutionHypothesis: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── BAGIAN 2: Instrumen Testing ───────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  B. Instrumen &amp; Skenario Pengujian
                </CardTitle>
                <CardDescription className="text-xs">
                  Prototype, skenario tugas, dan alat ukur yang digunakan saat user testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Tipe Prototype yang Diuji
                    </label>
                    <Input
                      value={planForm.prototypeType}
                      onChange={(e) => setPlanForm({ ...planForm, prototypeType: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Target Jumlah Responden
                    </label>
                    <Input
                      type="number"
                      value={planForm.jumlahTargetResponden}
                      onChange={(e) => setPlanForm({ ...planForm, jumlahTargetResponden: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Fitur / Alur yang Diuji
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Alur verifikasi identitas, kalkulasi otomatis, dll..."
                    value={planForm.fiturAlurDiuji}
                    onChange={(e) => setPlanForm({ ...planForm, fiturAlurDiuji: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Skenario User Testing
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Instruksi tugas yang diberikan kepada responden saat mencoba prototype..."
                    value={planForm.skenarioUserTesting}
                    onChange={(e) => setPlanForm({ ...planForm, skenarioUserTesting: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Instrumen Validasi
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Daftar pertanyaan, survey, form observasi, panduan wawancara yang digunakan..."
                    value={planForm.instrumenValidasi}
                    onChange={(e) => setPlanForm({ ...planForm, instrumenValidasi: e.target.value })}
                  />
                </div>

                {/* Data Dukung (File Upload) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Data Dukung &amp; Lampiran
                  </label>

                  {planForm.dataDukung.length > 0 && (
                    <div className="space-y-1.5">
                      {planForm.dataDukung.map((url) => (
                        <div
                          key={url}
                          className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs group"
                        >
                          {fileIcon(url)}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 truncate text-blue-700 hover:underline font-medium"
                          >
                            {fileName(url)}
                          </a>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(url)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50"
                            title="Hapus lampiran"
                          >
                            <X className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors">
                    {uploading ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full inline-block" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{uploading ? "Mengunggah..." : "Unggah File (PDF, Word, Excel, Gambar, maks 10MB)"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                      disabled={uploading}
                      onChange={handleUploadFile}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400">
                    File disimpan ke kolom <code>data_dukung</code> (jsonb[]) di database.
                    Hapus data lokal saja — file di storage tidak dihapus otomatis.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── BAGIAN 3: Early Adopters & Rekrutmen ─────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  C. Early Adopters &amp; Rekrutmen
                </CardTitle>
                <CardDescription className="text-xs">
                  Siapa yang diuji, di mana, dan bagaimana cara mendapatkan mereka
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kriteria Seleksi (Early Adopters)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Kriteria inklusi/eksklusi responden — siapa yang masuk dan siapa yang tidak..."
                    value={planForm.kriteriaSeleksi}
                    onChange={(e) => setPlanForm({ ...planForm, kriteriaSeleksi: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Kriteria Early Adopters (Profil)
                    </label>
                    <Input
                      placeholder="Penaksir dengan masa kerja > 2 tahun"
                      value={planForm.targetEarlyAdopters}
                      onChange={(e) => setPlanForm({ ...planForm, targetEarlyAdopters: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Lokasi / Channel Testing
                    </label>
                    <Input
                      placeholder="Cabang Kramat Jati & Rawamangun"
                      value={planForm.lokasiChannelTesting}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiChannelTesting: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Metode Rekrutmen
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Cara mendapatkan responden dan pihak yang bertanggung jawab merekrut..."
                    value={planForm.metodeRekrutmen}
                    onChange={(e) => setPlanForm({ ...planForm, metodeRekrutmen: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Etika dan Persetujuan Data
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Persetujuan penggunaan data, kerahasiaan, dokumentasi, dan perlindungan responden..."
                    value={planForm.etikaPersetujuanData}
                    onChange={(e) => setPlanForm({ ...planForm, etikaPersetujuanData: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── TABEL: Dimensi Customer Testing Feedback ──────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-[#0F5132]" />
                  <div>
                    <CardTitle className="text-base font-bold">
                      D. Dimensi Customer Testing Feedback
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      5 dimensi baku Juklak — isi kolom &quot;Evidence yang Dikumpulkan&quot; setelah testing
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-bold text-gray-700 w-28">Dimensi</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[200px]">Fokus Validasi</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[200px]">Contoh Pertanyaan / Observasi</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[220px]">Evidence yang Dikumpulkan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {DIMENSI_ROWS.map((d) => (
                        <tr key={d.key} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 align-top">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold uppercase tracking-wide"
                            >
                              {d.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top text-gray-600 leading-relaxed">{d.fokus}</td>
                          <td className="px-4 py-3 align-top text-gray-600 leading-relaxed italic">{d.contoh}</td>
                          <td className="px-4 py-3 align-top">
                            <Textarea
                              rows={3}
                              placeholder="Tulis temuan/catatan/kutipan responden..."
                              className="text-xs resize-none min-h-[72px]"
                              value={dimensiEvidence[d.key] || ""}
                              onChange={(e) =>
                                setDimensiEvidence((prev) => ({ ...prev, [d.key]: e.target.value }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── TABEL: Metrik dan Kriteria Kesuksesan ─────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#0F5132]" />
                  <div>
                    <CardTitle className="text-base font-bold">
                      E. Metrik dan Kriteria Kesuksesan Customer Validation
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      7 metrik baku Juklak — isi kolom &quot;Catatan&quot; sesuai kondisi tim
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-bold text-gray-700 w-28">Validasi</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[160px]">Metrik</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[140px]">Unit Ukur</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[180px]">Kriteria Kesuksesan</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[160px]">Cara Pengukuran</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 min-w-[180px]">Catatan Tim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {METRIK_ROWS.map((r) => (
                        <tr key={r.metrik} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 align-top">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wide ${
                                r.validasi === "Desirability"
                                  ? "border-violet-300 text-violet-700 bg-violet-50"
                                  : r.validasi === "Feasibility On Paper"
                                  ? "border-amber-300 text-amber-700 bg-amber-50"
                                  : "border-emerald-300 text-emerald-700 bg-emerald-50"
                              }`}
                            >
                              {r.validasi}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top font-semibold text-gray-800">{r.metrik}</td>
                          <td className="px-4 py-3 align-top text-gray-600">{r.unit}</td>
                          <td className="px-4 py-3 align-top text-gray-600">{r.kriteria}</td>
                          <td className="px-4 py-3 align-top text-gray-600">{r.cara}</td>
                          <td className="px-4 py-3 align-top">
                            <Textarea
                              rows={2}
                              placeholder="Catatan & hasil aktual tim..."
                              className="text-xs resize-none min-h-[56px]"
                              value={metrikCatatan[r.metrik] || ""}
                              onChange={(e) =>
                                setMetrikCatatan((prev) => ({ ...prev, [r.metrik]: e.target.value }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2 h-10 px-6 rounded-xl">
                {saving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? "Menyimpan..." : "Simpan Validation Plan"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ═══ TAB 2: REPORT ════════════════════════════════════════════════ */}
        <TabsContent value="report" className="space-y-4 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Laporan Hasil Validasi Pelanggan (Report)
                </CardTitle>
                <CardDescription className="text-xs">
                  Ringkasan temuan pengujian, PSF, dan keputusan kelanjutan ke tahap Market Validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Validated Solution (Solusi yang Terbukti Dibutuhkan)
                  </label>
                  <Textarea
                    rows={2}
                    value={reportForm.validatedSolution}
                    onChange={(e) => setReportForm({ ...reportForm, validatedSolution: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 1</label>
                    <Input
                      value={reportForm.fiturKunci1}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 2</label>
                    <Input
                      value={reportForm.fiturKunci2}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci2: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 3</label>
                    <Input
                      value={reportForm.fiturKunci3}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci3: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Ketercapaian PSF (Problem-Solution Fit)
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                      value={reportForm.ketercapaianPsf}
                      onChange={(e) => setReportForm({ ...reportForm, ketercapaianPsf: e.target.value })}
                    >
                      <option value="tercapai">Tercapai (Fit)</option>
                      <option value="tercapai_dengan_catatan">Tercapai dengan Catatan</option>
                      <option value="belum_tercapai">Belum Tercapai (Perlu Iterasi)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Keputusan Lanjut
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                      value={reportForm.keputusan}
                      onChange={(e) => setReportForm({ ...reportForm, keputusan: e.target.value })}
                    >
                      <option value="lanjut">Lanjut ke Market Validation (MVP Release)</option>
                      <option value="iterasi">Iterasi Solusi / Prototype Ulang</option>
                      <option value="hold">Hold / Tunda</option>
                      <option value="stop">Stop (Hentikan Proyek)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kesimpulan &amp; Pembelajaran Utama
                  </label>
                  <Textarea
                    rows={3}
                    value={reportForm.kesimpulan}
                    onChange={(e) => setReportForm({ ...reportForm, kesimpulan: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2 h-10 px-6 rounded-xl">
                {saving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? "Menyimpan..." : "Simpan Validation Report"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
