"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  saveCustomerValidationPlanFullAction,
  saveCustomerValidationReportAction,
  generateCvBacklogAction,
  autoFillCvPlanFromCharterAction,
  autoFillFullCvPlanAction,
  signCvPlanAction,
  revokeCvPlanSignatureAction,
} from "@/app/actions/customer-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Save, CheckCircle2, FileCheck, ClipboardList, Upload, X, ExternalLink,
  Paperclip, FileText, ImageIcon, Table2, BarChart3, Sparkles, KanbanSquare, RefreshCw, Wand2,
  Download, Stamp, CheckCircle, RotateCcw, AlertCircle, Building2, Briefcase, UserCheck
} from "lucide-react";
import { toast } from "@/components/ui/ToastProvider";
import { KanbanClient } from "../kanban/KanbanClient";

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

function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

import { SignaturePadModal } from "@/components/ui/SignaturePad";

// ── Main Component ────────────────────────────────────────────────────────────

export function CustomerValidationClient({
  timId,
  timInfo,
  roleAssignments = [],
  initialData,
  initialColumns = [],
  initialCards = [],
  initialSprints = [],
  anggotaTim = [],
  canEditCv = true,
  canEditKanban = true,
  currentUser,
  phaseGateStatus,
}: {
  timId: string;
  timInfo?: {
    namaProyekInovasi?: string;
    klasifikasiInovasi?: string;
  };
  roleAssignments?: Array<{
    roleCode: string;
    userName: string;
    userEmail: string;
  }>;
  initialData: any;
  initialColumns?: any[];
  initialCards?: any[];
  initialSprints?: any[];
  anggotaTim?: any[];
  canEditCv?: boolean;
  canEditKanban?: boolean;
  currentUser?: any;
  phaseGateStatus?: any;
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

  // ── Names from Charter ────────────────────────────────────────────────────
  const inisiatorCharterName =
    roleAssignments?.find((a) => a.roleCode === "inisiator")?.userName ||
    anggotaTim?.find((a) => a.role === "inisiator" || a.jabatan?.toLowerCase().includes("inisiator"))?.nama ||
    null;

  const coachCharterName =
    roleAssignments?.find((a) => a.roleCode === "coach")?.userName ||
    anggotaTim?.find((a) => a.role === "coach" || a.jabatan?.toLowerCase().includes("coach"))?.nama ||
    null;

  const poCharterName =
    roleAssignments?.find((a) => a.roleCode === "project_owner")?.userName ||
    anggotaTim?.find((a) => a.role === "project_owner" || a.jabatan?.toLowerCase().includes("owner") || a.jabatan?.toLowerCase().includes("po"))?.nama ||
    null;

  // ── Tab state ─────────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabParam === "report") return "report";
    if (tabParam === "backlog") return "backlog";
    return "plan";
  });

  useEffect(() => {
    if (tabParam === "report" || tabParam === "backlog" || tabParam === "plan") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // ── Signatures state ───────────────────────────────────────────────────────
  const [ttdDisusun, setTtdDisusun] = useState<any>(initialData?.plan?.ttdDisusun || null);
  const [ttdDiperiksa, setTtdDiperiksa] = useState<any>(initialData?.plan?.ttdDiperiksa || null);
  const [ttdDisetujui, setTtdDisetujui] = useState<any>(initialData?.plan?.ttdDisetujui || null);
  const [signingRole, setSigningRole] = useState<'inisiator' | 'coach' | 'po' | null>(null);

  // ── Signature Pad Modal state ──────────────────────────────────────────────
  const [sigModal, setSigModal] = useState<{
    isOpen: boolean;
    roleType: 'inisiator' | 'coach' | 'po';
    roleName: string;
    userName: string;
  }>({
    isOpen: false,
    roleType: 'inisiator',
    roleName: 'Inisiator Inovasi',
    userName: currentUser?.nama || '',
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
    prototypeSolusiLink: initialData?.report?.prototypeSolusiLink || "",
    mekanismeUserTesting: initialData?.report?.mekanismeUserTesting || "",
    tanggalLokasiTesting: initialData?.report?.tanggalLokasiTesting || "",
    jumlahRespondenAktual: initialData?.report?.jumlahRespondenAktual ?? 10,
    profilRespondenAktual: initialData?.report?.profilRespondenAktual || "",
    kesimpulan: initialData?.report?.kesimpulan || "",
    ketercapaianPsf: initialData?.report?.ketercapaianPsf || "tercapai",
    keputusan: initialData?.report?.keputusan || "lanjut",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingBacklog, setGeneratingBacklog] = useState(false);
  const [autoFillingFromCharter, setAutoFillingFromCharter] = useState(false);

  // ── Auto-fill Trigger on First Mount ───────────────────────────────────────
  const hasTriggeredMountAutoFill = useRef(false);

  useEffect(() => {
    if (hasTriggeredMountAutoFill.current) return;
    hasTriggeredMountAutoFill.current = true;

    // Syarat auto-fill otomatis:
    // SEMUA field Section A, B, C masih kosong total
    const isSectionAEmpty =
      !planForm.projectMission &&
      !planForm.customerDanContext &&
      !planForm.problemHypothesis &&
      !planForm.hmw &&
      !planForm.solutionHypothesis;

    const isSectionBEmpty =
      !planForm.fiturAlurDiuji &&
      !planForm.skenarioUserTesting &&
      !planForm.instrumenValidasi;

    const isSectionCEmpty =
      !planForm.targetEarlyAdopters &&
      !planForm.kriteriaSeleksi &&
      !planForm.lokasiChannelTesting &&
      !planForm.metodeRekrutmen &&
      !planForm.etikaPersetujuanData;

    // Only run if genuinely empty and not already saved
    if (isSectionAEmpty && isSectionBEmpty && isSectionCEmpty && !initialData?.plan?.id) {
      setAutoFillingFromCharter(true);
      autoFillFullCvPlanAction(timId)
        .then((res) => {
          if (res.success && res.data) {
            setPlanForm((prev) => ({
              ...prev,
              ...res.data,
            }));
            toast.info(
              "Form Perencanaan CV otomatis diisi dari Innovation Charter & AI. Silakan tinjau dan simpan.",
              "Auto-Fill Awal Berhasil"
            );
          }
        })
        .catch(() => {})
        .finally(() => {
          setAutoFillingFromCharter(false);
        });
    }
  }, [timId, initialData?.plan?.id]);

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

  const handleAutoFillFull = async () => {
    const sectionFields = [
      planForm.projectMission,
      planForm.customerDanContext,
      planForm.problemHypothesis,
      planForm.hmw,
      planForm.solutionHypothesis,
      planForm.fiturAlurDiuji,
      planForm.skenarioUserTesting,
      planForm.targetEarlyAdopters,
    ];
    const hasExistingData = sectionFields.some((v) => v && v.trim().length > 0);

    if (hasExistingData) {
      const confirmed = window.confirm(
        "Beberapa field Perencanaan CV sudah terisi.\n\nLanjutkan auto-fill dari Innovation Charter & AI akan MENIMPA isian yang ada.\n\nLanjutkan?"
      );
      if (!confirmed) return;
    }

    setAutoFillingFromCharter(true);
    try {
      const res = await autoFillFullCvPlanAction(timId);
      if (res.success && res.data) {
        setPlanForm((prev) => ({
          ...prev,
          ...res.data,
        }));
        toast.success(
          "Form Perencanaan CV berhasil diisi otomatis dari Innovation Charter & AI. Tinjau dan simpan jika sudah sesuai.",
          "Auto-Fill Berhasil"
        );
      } else {
        toast.error(res.error || "Gagal mengambil data draf otomatis.", "Auto-Fill Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat auto-fill.", "Gagal");
    } finally {
      setAutoFillingFromCharter(false);
    }
  };

  const openSignModal = (roleType: 'inisiator' | 'coach' | 'po') => {
    const roleName =
      roleType === 'inisiator'
        ? 'Inisiator Inovasi'
        : roleType === 'coach'
        ? 'Innovation Coach'
        : 'Project Owner';
    const assignedName =
      roleType === 'inisiator'
        ? inisiatorCharterName
        : roleType === 'coach'
        ? coachCharterName
        : poCharterName;

    setSigModal({
      isOpen: true,
      roleType,
      roleName,
      userName: currentUser?.nama || assignedName || roleName,
    });
  };

  const handleSaveSignature = async (dataUrl: string) => {
    const roleType = sigModal.roleType;
    setSigningRole(roleType);
    try {
      const res = await signCvPlanAction(timId, roleType, dataUrl);
      if (res.success && res.signatureData) {
        if (roleType === 'inisiator') setTtdDisusun(res.signatureData);
        if (roleType === 'coach') setTtdDiperiksa(res.signatureData);
        if (roleType === 'po') setTtdDisetujui(res.signatureData);
        toast.success("Tanda tangan digital berhasil dibubuhkan.", "Tanda Tangan Berhasil");
      } else {
        toast.error(res.error || "Gagal menandatangani.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menandatangani.", "Gagal");
    } finally {
      setSigningRole(null);
    }
  };

  const handleRevokeSign = async (roleType: 'inisiator' | 'coach' | 'po') => {
    const roleLabel =
      roleType === 'inisiator'
        ? 'Inisiator'
        : roleType === 'coach'
        ? 'Innovation Coach'
        : 'Project Owner';

    const confirmed = window.confirm(`Batalkan tanda tangan sebagai ${roleLabel}?`);
    if (!confirmed) return;

    setSigningRole(roleType);
    try {
      const res = await revokeCvPlanSignatureAction(timId, roleType);
      if (res.success) {
        if (roleType === 'inisiator') setTtdDisusun(null);
        if (roleType === 'coach') setTtdDiperiksa(null);
        if (roleType === 'po') setTtdDisetujui(null);
        toast.success("Tanda tangan berhasil dibatalkan.", "Dibatalkan");
      } else {
        toast.error(res.error || "Gagal membatalkan tanda tangan.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan tanda tangan.", "Gagal");
    } finally {
      setSigningRole(null);
    }
  };

  const handleGenerateBacklog = async () => {
    if (!initialData?.plan?.id) {
      toast.error("Harap simpan Form Perencanaan CV terlebih dahulu sebelum generate rekomendasi backlog.", "Rencana Belum Disimpan");
      return;
    }
    setGeneratingBacklog(true);
    try {
      const res = await generateCvBacklogAction(timId);
      if (res.success) {
        toast.success(res.message || `Berhasil menghasilkan ${res.count} rekomendasi backlog!`, "AI Backlog Terbuat");
      } else {
        toast.error(res.error || "Gagal menghasilkan backlog.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghubungi AI.", "Gagal");
    } finally {
      setGeneratingBacklog(false);
    }
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 shadow-2xs">
          <TabsTrigger value="plan" className="flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl">
            <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
            <span>1. Validation Plan</span>
          </TabsTrigger>
          <TabsTrigger value="backlog" className="flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl">
            <KanbanSquare className="h-3.5 w-3.5 text-purple-600" />
            <span>2. Backlog &amp; Sprint</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl">
            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>3. Validation Report</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: PLAN ═══════════════════════════════════════════════════ */}
        <TabsContent value="plan" className="space-y-5 mt-4">
          <form onSubmit={handleSavePlan} className="space-y-5">

            {/* ── HEADER READ-ONLY INFO & DOWNLOAD PDF ───────────────────── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-white to-purple-50/60 border border-emerald-200/90 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Template Juklak 2.1 — Perencanaan Customer Validation
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                    {timInfo?.namaProyekInovasi || "Proyek Inovasi"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-500">Klasifikasi Inovasi:</span>
                    <Badge variant="outline" className="font-bold text-[10px] bg-white border-emerald-300 text-emerald-800">
                      {timInfo?.klasifikasiInovasi || "BREAKTHROUGH"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/pdf/cv-planning/${timId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>📄 Unduh PDF Perencanaan CV</span>
                  </a>
                </div>
              </div>
            </div>

            {/* ── BAGIAN 1: Konteks & Hipotesis ────────────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">
                      A. Konteks Inovasi &amp; Hipotesis
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Rumusan problem-solution fit yang akan divalidasi kepada pelanggan
                    </CardDescription>
                  </div>
                  {canEditCv && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillFull}
                      disabled={autoFillingFromCharter}
                      className="h-8 text-[11px] font-semibold gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50 hover:text-purple-900 rounded-xl shadow-2xs shrink-0 cursor-pointer"
                    >
                      {autoFillingFromCharter ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span>{autoFillingFromCharter ? "Mengisi otomatis..." : "✨ Isi Ulang Otomatis (Charter + AI)"}</span>
                    </Button>
                  )}
                </div>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Tipe Prototype yang Diuji
                  </label>
                  <Input
                    placeholder="Figma / Clickable Prototype, Wireframe, dll..."
                    value={planForm.prototypeType}
                    onChange={(e) => setPlanForm({ ...planForm, prototypeType: e.target.value })}
                  />
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
                    1. Target Early Adopters
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Profil early adopters awal berskala kecil yang relevan dengan customer prioritas..."
                    value={planForm.targetEarlyAdopters}
                    onChange={(e) => setPlanForm({ ...planForm, targetEarlyAdopters: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    2. Kriteria Seleksi
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Kriteria inklusi/eksklusi responden; contoh: segmen, lokasi, perilaku..."
                    value={planForm.kriteriaSeleksi}
                    onChange={(e) => setPlanForm({ ...planForm, kriteriaSeleksi: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      3. Target Jumlah Responden
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={planForm.jumlahTargetResponden}
                      onChange={(e) => setPlanForm({ ...planForm, jumlahTargetResponden: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      4. Lokasi / Channel Testing
                    </label>
                    <Input
                      placeholder="Cabang Kramat Jati & Rawamangun / Online Meet..."
                      value={planForm.lokasiChannelTesting}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiChannelTesting: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    5. Metode Rekrutmen
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
                    6. Etika dan Persetujuan Data
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

            {/* ── ACTION BUTTONS: Generate Backlog & Simpan Plan ────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {initialData?.plan?.id ? (
                  <Button
                    type="button"
                    onClick={handleGenerateBacklog}
                    disabled={generatingBacklog || saving}
                    className="bg-purple-700 hover:bg-purple-800 text-white gap-2 h-10 px-5 rounded-xl shadow-xs cursor-pointer"
                  >
                    {generatingBacklog ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    )}
                    <span>{generatingBacklog ? "Menghasilkan Backlog AI..." : "✨ Generate Rekomendasi Backlog"}</span>
                  </Button>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Simpan rencana validasi minimal 1x untuk membuka tombol Generate Rekomendasi Backlog.</span>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2 h-10 px-6 rounded-xl shadow-xs">
                {saving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? "Menyimpan..." : "Simpan Validation Plan"}</span>
              </Button>
            </div>

            {/* ── BLOK TANDA TANGAN FORMAL (3 PIHAK) ────────────────────────── */}
            <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-emerald-50/50 via-white to-purple-50/30 border-b border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                      <Stamp className="h-4.5 w-4.5 text-[#0F5132]" />
                      Persetujuan &amp; Tanda Tangan Formal Perencanaan CV
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Dokumentasi persetujuan dari Inisiator Inovasi, Innovation Coach, dan Project Owner (independen).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kartu 1: Inisiator */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all space-y-3 ${
                      ttdDisusun?.status === 'signed'
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-dashed border-gray-200 bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Disusun Oleh
                      </span>
                      {ttdDisusun?.status === 'signed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          <span>Ditandatangani</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 italic">
                          Belum Ditandatangani
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      {ttdDisusun?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{ttdDisusun.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisusun.jabatan || "Inisiator Inovasi"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisusun.unit || "PT Pegadaian"}</span>
                          </div>
                          {ttdDisusun.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={ttdDisusun.signatureImage}
                                alt="Tanda Tangan Inisiator"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {ttdDisusun.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(ttdDisusun.tanggal)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-gray-700">
                            {inisiatorCharterName || "( Inisiator Inovasi )"}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>Inisiator Inovasi</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>PT Pegadaian</span>
                          </div>
                          <div className="text-[10px] text-gray-400 italic mt-1">
                            {inisiatorCharterName ? "Nama terdaftar di Innovation Charter" : "Belum ditentukan di Charter"}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDisusun?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'inisiator'}
                          onClick={() => handleRevokeSign('inisiator')}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === 'inisiator'}
                          onClick={() => openSignModal('inisiator')}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Inisiator</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Kartu 2: Innovation Coach */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all space-y-3 ${
                      ttdDiperiksa?.status === 'signed'
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-dashed border-gray-200 bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Diperiksa Oleh
                      </span>
                      {ttdDiperiksa?.status === 'signed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          <span>Ditandatangani</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 italic">
                          Belum Ditandatangani
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      {ttdDiperiksa?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{ttdDiperiksa.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{ttdDiperiksa.jabatan || "Innovation Coach"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{ttdDiperiksa.unit || "PT Pegadaian"}</span>
                          </div>
                          {ttdDiperiksa.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={ttdDiperiksa.signatureImage}
                                alt="Tanda Tangan Coach"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {ttdDiperiksa.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(ttdDiperiksa.tanggal)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-gray-700">
                            {coachCharterName || "( Innovation Coach )"}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>Innovation Coach</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>PT Pegadaian</span>
                          </div>
                          <div className="text-[10px] text-gray-400 italic mt-1">
                            {coachCharterName ? "Nama terdaftar di Innovation Charter" : "Belum ditentukan di Charter"}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDiperiksa?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'coach'}
                          onClick={() => handleRevokeSign('coach')}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === 'coach'}
                          onClick={() => openSignModal('coach')}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Coach</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Kartu 3: Project Owner */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all space-y-3 ${
                      ttdDisetujui?.status === 'signed'
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-dashed border-gray-200 bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Disetujui Oleh
                      </span>
                      {ttdDisetujui?.status === 'signed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          <span>Ditandatangani</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 italic">
                          Belum Ditandatangani
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      {ttdDisetujui?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{ttdDisetujui.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisetujui.jabatan || "Project Owner"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisetujui.unit || "PT Pegadaian"}</span>
                          </div>
                          {ttdDisetujui.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={ttdDisetujui.signatureImage}
                                alt="Tanda Tangan PO"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {ttdDisetujui.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(ttdDisetujui.tanggal)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-gray-700">
                            {poCharterName || "( Project Owner )"}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>Project Owner</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>PT Pegadaian</span>
                          </div>
                          <div className="text-[10px] text-gray-400 italic mt-1">
                            {poCharterName ? "Nama terdaftar di Innovation Charter" : "Belum ditentukan di Charter"}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDisetujui?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'po'}
                          onClick={() => handleRevokeSign('po')}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === 'po'}
                          onClick={() => openSignModal('po')}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg PO</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ═══ TAB 2: BACKLOG & SPRINT ═══════════════════════════════════════ */}
        <TabsContent value="backlog" className="space-y-6 mt-4">
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-xs text-purple-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <strong>Workspace Backlog &amp; Sprint: Customer Validation</strong> &mdash; Kelola sprint planning, penugasan story point, dan eksekusi kartu validasi pelanggan.
              </div>
            </div>
            {initialData?.plan?.id && (
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateBacklog}
                disabled={generatingBacklog}
                className="bg-purple-700 hover:bg-purple-800 text-white gap-1.5 h-8 text-xs rounded-lg shadow-xs"
              >
                {generatingBacklog ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-amber-300" />
                )}
                <span>{generatingBacklog ? "Menghasilkan..." : "Generate Ulang Backlog"}</span>
              </Button>
            )}
          </div>

          <KanbanClient
            timId={timId}
            initialColumns={initialColumns}
            initialCards={initialCards}
            initialSprints={initialSprints}
            anggotaTim={anggotaTim}
            canEdit={canEditKanban}
            currentUser={currentUser}
            phaseGateStatus={phaseGateStatus}
            tahapScope="customer_validation"
          />
        </TabsContent>

        {/* ═══ TAB 3: REPORT ════════════════════════════════════════════════ */}
        <TabsContent value="report" className="space-y-4 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Laporan Hasil Validasi Pelanggan (Validation Report)
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Link Prototype Solusi (URL)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.figma.com/proto/... atau URL demo"
                    value={reportForm.prototypeSolusiLink}
                    onChange={(e) => setReportForm({ ...reportForm, prototypeSolusiLink: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Mekanisme User Testing
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Metode testing (wawancara, observasi, daring/tatap muka)..."
                      value={reportForm.mekanismeUserTesting}
                      onChange={(e) => setReportForm({ ...reportForm, mekanismeUserTesting: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Tanggal &amp; Lokasi Testing
                    </label>
                    <Input
                      placeholder="Contoh: 10-12 Maret 2026 di Outlet Kramat Jati"
                      value={reportForm.tanggalLokasiTesting}
                      onChange={(e) => setReportForm({ ...reportForm, tanggalLokasiTesting: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Jumlah Responden Aktual</label>
                    <Input
                      type="number"
                      min={0}
                      value={reportForm.jumlahRespondenAktual}
                      onChange={(e) => setReportForm({ ...reportForm, jumlahRespondenAktual: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Profil Responden Aktual</label>
                    <Input
                      placeholder="Contoh: 5 Nasabah Tabungan Emas usia 25-35 thn..."
                      value={reportForm.profilRespondenAktual}
                      onChange={(e) => setReportForm({ ...reportForm, profilRespondenAktual: e.target.value })}
                    />
                  </div>
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

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={sigModal.isOpen}
        onClose={() => setSigModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSignature}
        title={`Tanda Tangan Digital — ${sigModal.roleName}`}
        roleName={sigModal.roleName}
        userName={sigModal.userName}
      />
    </div>
  );
}
