"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  saveCustomerValidationPlanFullAction,
  saveCustomerValidationReportAction,
  saveCustomerValidationReportFullAction,
  generateCvBacklogAction,
  autoFillCvPlanFromCharterAction,
  autoFillFullCvPlanAction,
  signCvPlanAction,
  revokeCvPlanSignatureAction,
  signCvReportAction,
  revokeCvReportSignatureAction,
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

const TEMUAN_KUALITATIF_ROWS = [
  {
    kategori: "Kepuasan Pengguna",
    pertanyaanKunci:
      "Bagaimana Anda menilai kecocokan prototype dengan kebutuhan/permasalahan Anda? Fitur apa yang paling/kurang sesuai?",
  },
  {
    kategori: "Ketertarikan Penggunaan Berulang",
    pertanyaanKunci:
      "Seberapa sering Anda akan menggunakan solusi ini jika tersedia? Apa yang membuat Anda mau/tidak mau menggunakan secara berkelanjutan?",
  },
  {
    kategori: "Rekomendasi kepada Orang Lain",
    pertanyaanKunci:
      "Apakah Anda akan merekomendasikan solusi ini? Kepada siapa dan mengapa?",
  },
  {
    kategori: "Kejelasan dan Kemudahan Penggunaan",
    pertanyaanKunci:
      "Bagian mana yang paling mudah, membingungkan, atau perlu disederhanakan?",
  },
  {
    kategori: "Kesediaan Membayar/Menggunakan",
    pertanyaanKunci:
      "Apakah value yang diberikan sepadan dengan biaya, waktu, atau perubahan perilaku yang dibutuhkan?",
  },
  {
    kategori: "Feedback Umum",
    pertanyaanKunci:
      "Apa yang perlu ditambah, dikurangi, diubah, atau diprioritaskan?",
  },
];

const METRIK_HASIL_ROWS = METRIK_ROWS.map((r) => ({
  validasi: r.validasi,
  metrik: r.metrik,
  target: r.kriteria,
}));

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

  // ── Plan Signatures state ──────────────────────────────────────────────────
  const [ttdDisusun, setTtdDisusun] = useState<any>(initialData?.plan?.ttdDisusun || null);
  const [ttdDiperiksa, setTtdDiperiksa] = useState<any>(initialData?.plan?.ttdDiperiksa || null);
  const [ttdDisetujui, setTtdDisetujui] = useState<any>(initialData?.plan?.ttdDisetujui || null);

  // ── Report Signatures state ────────────────────────────────────────────────
  const [reportTtdDisusun, setReportTtdDisusun] = useState<any>(initialData?.report?.ttdDisusun || null);
  const [reportTtdDiperiksa, setReportTtdDiperiksa] = useState<any>(initialData?.report?.ttdDiperiksa || null);
  const [reportTtdDisetujui, setReportTtdDisetujui] = useState<any>(initialData?.report?.ttdDisetujui || null);

  const [signingRole, setSigningRole] = useState<'inisiator' | 'coach' | 'po' | null>(null);

  // ── Signature Pad Modal state ──────────────────────────────────────────────
  const [sigModal, setSigModal] = useState<{
    isOpen: boolean;
    roleType: 'inisiator' | 'coach' | 'po';
    roleName: string;
    userName: string;
    targetDoc: 'plan' | 'report';
  }>({
    isOpen: false,
    roleType: 'inisiator',
    roleName: 'Inisiator Inovasi',
    userName: currentUser?.nama || '',
    targetDoc: 'plan',
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
    flowSolusi: initialData?.report?.flowSolusi || "",
    prototypeSolusiLink: initialData?.report?.prototypeSolusiLink || "",
    mekanismeUserTesting: initialData?.report?.mekanismeUserTesting || "",
    tanggalLokasiTesting: initialData?.report?.tanggalLokasiTesting || "",
    jumlahRespondenAktual: initialData?.report?.jumlahRespondenAktual ?? 10,
    profilRespondenAktual: initialData?.report?.profilRespondenAktual || "",
    kesimpulan: initialData?.report?.kesimpulan || "",
    ketercapaianPsf: initialData?.report?.ketercapaianPsf || "tercapai",
    keputusan: initialData?.report?.keputusan || "lanjut",
    catatanMvpPlanning: initialData?.report?.catatanMvpPlanning || "",
  });

  // ── Tabel 1: Temuan Kualitatif state (6 baris tetap) ───────────────────────
  const initTemuan = () => {
    return TEMUAN_KUALITATIF_ROWS.map((row) => {
      const found = (initialData?.temuanKualitatif || []).find(
        (t: any) => t.kategori === row.kategori || t.pertanyaanKunci === row.pertanyaanKunci
      );
      return {
        kategori: row.kategori,
        pertanyaanKunci: row.pertanyaanKunci,
        temuanUtama: found?.temuanUtama || "",
      };
    });
  };
  const [temuanKualitatifList, setTemuanKualitatifList] = useState(initTemuan);

  // ── Tabel 2: Hasil Validasi Metrik state (7 baris tetap ditarik dari Tab 1) ───
  const initMetrikHasil = () => {
    return METRIK_ROWS.map((row) => {
      const rencana = (initialData?.metrikRencana || []).find(
        (r: any) => r.metrik === row.metrik
      );
      const found = (initialData?.metrikHasil || []).find(
        (m: any) => m.metrik === row.metrik
      );
      return {
        validasi: row.validasi,
        metrik: row.metrik,
        target: rencana?.catatan || found?.target || row.kriteria,
        hasilAktual: found?.hasilAktual || "",
        interpretasi: found?.interpretasi || "",
        learning: found?.learning || "",
        enhancement: found?.enhancement || "",
      };
    });
  };
  const [metrikHasilList, setMetrikHasilList] = useState(initMetrikHasil);

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

  const openSignModal = (roleType: 'inisiator' | 'coach' | 'po', targetDoc: 'plan' | 'report' = 'plan') => {
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
      targetDoc,
    });
  };

  const handleSaveSignature = async (dataUrl: string) => {
    const roleType = sigModal.roleType;
    const targetDoc = sigModal.targetDoc;
    setSigningRole(roleType);
    try {
      if (targetDoc === 'report') {
        const res = await signCvReportAction(timId, roleType, dataUrl);
        if (res.success && res.signatureData) {
          if (roleType === 'inisiator') setReportTtdDisusun(res.signatureData);
          if (roleType === 'coach') setReportTtdDiperiksa(res.signatureData);
          if (roleType === 'po') setReportTtdDisetujui(res.signatureData);
          toast.success("Tanda tangan digital Laporan CV berhasil dibubuhkan.", "Tanda Tangan Berhasil");
        } else {
          toast.error(res.error || "Gagal menandatangani Laporan CV.", "Gagal");
        }
      } else {
        const res = await signCvPlanAction(timId, roleType, dataUrl);
        if (res.success && res.signatureData) {
          if (roleType === 'inisiator') setTtdDisusun(res.signatureData);
          if (roleType === 'coach') setTtdDiperiksa(res.signatureData);
          if (roleType === 'po') setTtdDisetujui(res.signatureData);
          toast.success("Tanda tangan digital berhasil dibubuhkan.", "Tanda Tangan Berhasil");
        } else {
          toast.error(res.error || "Gagal menandatangani.", "Gagal");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menandatangani.", "Gagal");
    } finally {
      setSigningRole(null);
    }
  };

  const handleRevokeSign = async (roleType: 'inisiator' | 'coach' | 'po', targetDoc: 'plan' | 'report' = 'plan') => {
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
      if (targetDoc === 'report') {
        const res = await revokeCvReportSignatureAction(timId, roleType);
        if (res.success) {
          if (roleType === 'inisiator') setReportTtdDisusun(null);
          if (roleType === 'coach') setReportTtdDiperiksa(null);
          if (roleType === 'po') setReportTtdDisetujui(null);
          toast.success("Tanda tangan Laporan CV berhasil dibatalkan.", "Dibatalkan");
        } else {
          toast.error(res.error || "Gagal membatalkan tanda tangan.", "Gagal");
        }
      } else {
        const res = await revokeCvPlanSignatureAction(timId, roleType);
        if (res.success) {
          if (roleType === 'inisiator') setTtdDisusun(null);
          if (roleType === 'coach') setTtdDiperiksa(null);
          if (roleType === 'po') setTtdDisetujui(null);
          toast.success("Tanda tangan berhasil dibatalkan.", "Dibatalkan");
        } else {
          toast.error(res.error || "Gagal membatalkan tanda tangan.", "Gagal");
        }
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
    setSaving(true);
    const res = await saveCustomerValidationReportFullAction(
      timId,
      reportForm,
      temuanKualitatifList,
      metrikHasilList
    );
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
        <TabsContent value="report" className="space-y-5 mt-4" id="report-tab-content">
          {/* Trigger Otomatis: Banner "Semua backlog selesai" */}
          {initialData?.allCvBacklogDone && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 via-emerald-100/70 to-emerald-50 rounded-2xl border-2 border-[#3E9463] shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0B3D2E] text-white rounded-xl shadow-2xs">
                  <CheckCircle2 className="h-5 w-5 text-[#F0C24B]" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#0B3D2E]">
                    ✅ Semua backlog Customer Validation sudah selesai!
                  </p>
                  <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                    Lengkapi &amp; finalisasi Laporan Akhir Customer Validation sebelum lanjut ke tahap Market Validation.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("section-solusi") || document.getElementById("report-tab-content");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="border-[#3E9463] text-[#0B3D2E] hover:bg-[#3E9463] hover:text-white font-bold text-xs rounded-xl gap-1.5 shrink-0"
              >
                <span>Lihat Field yang Perlu Dilengkapi</span>
              </Button>
            </div>
          )}

          {/* Header Bar Laporan CV + Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#0B3D2E] text-[#F0C24B] border-none text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider">
                  FR-PIA-02.2
                </Badge>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Laporan Hasil Validasi Pelanggan (Customer Validation Report)
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Dokumen resmi Template 2.2 untuk membuktikan Problem-Solution Fit (PSF) dan gerbang kelanjutan inovasi.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`/api/pdf/cv-report/${timId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-[#3E9463] text-[#0B3D2E] hover:bg-[#EBF5EE] text-xs font-extrabold shadow-2xs transition-all active:scale-98"
              >
                <Download className="h-4 w-4 text-[#3E9463]" />
                <span>📄 Unduh PDF Laporan CV</span>
              </a>
            </div>
          </div>

          <form onSubmit={handleSaveReport} className="space-y-5">
            {/* ══ SECTION A: Ringkasan Solusi & Value Proposition ══ */}
            <Card id="section-solusi" className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <span>A. Ringkasan Problem dan Solusi Tervalidasi</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Definisi solusi yang terbukti menjawab problem worth solving dan value proposition bagi pelanggan.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-gray-600 bg-gray-50">
                    Template 2.2
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Validated Solution (Solusi yang Terbukti Dibutuhkan)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Jelaskan bentuk solusi yang terbukti menyelesaikan masalah utama pelanggan..."
                    value={reportForm.validatedSolution}
                    onChange={(e) => setReportForm({ ...reportForm, validatedSolution: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Value Proposition
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Nilai unik atau manfaat utama yang dirasakan pelanggan dibanding solusi eksisting..."
                    value={reportForm.valueProposition}
                    onChange={(e) => setReportForm({ ...reportForm, valueProposition: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Fitur Kunci Solusi (Tiga Fitur Utama yang Divalidasi)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 1</label>
                      <Input
                        placeholder="Contoh: Otomasi kalkulator taksiran emas"
                        value={reportForm.fiturKunci1}
                        onChange={(e) => setReportForm({ ...reportForm, fiturKunci1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 2</label>
                      <Input
                        placeholder="Contoh: Booking jemput berkas gadai"
                        value={reportForm.fiturKunci2}
                        onChange={(e) => setReportForm({ ...reportForm, fiturKunci2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 3</label>
                      <Input
                        placeholder="Contoh: Notifikasi peringatan jatuh tempo via WA"
                        value={reportForm.fiturKunci3}
                        onChange={(e) => setReportForm({ ...reportForm, fiturKunci3: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Flow Solusi (Alur Interaksi Pengguna &amp; Operasional)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Jelaskan langkah demi langkah bagaimana pengguna berinteraksi dengan solusi mulai dari awal hingga tuntas..."
                    value={reportForm.flowSolusi}
                    onChange={(e) => setReportForm({ ...reportForm, flowSolusi: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ══ SECTION B: Detail Eksekusi & Instrumen Pengujian ══ */}
            <Card className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E]">
                  B. Pelaksanaan &amp; Instrumen Pengujian Pengguna
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Rekapitulasi prototype, mekanisme testing, lokasi, dan responden aktual yang diuji.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Link Prototype Solusi (URL)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.figma.com/proto/... atau URL demo sistem"
                    value={reportForm.prototypeSolusiLink}
                    onChange={(e) => setReportForm({ ...reportForm, prototypeSolusiLink: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Mekanisme User Testing
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Metode testing (wawancara mendalam, observasi usability, daring/tatap muka)..."
                      value={reportForm.mekanismeUserTesting}
                      onChange={(e) => setReportForm({ ...reportForm, mekanismeUserTesting: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Tanggal &amp; Lokasi Testing
                    </label>
                    <Input
                      placeholder="Contoh: 10-12 Maret 2026 di Outlet Kramat Jati &amp; Daring"
                      value={reportForm.tanggalLokasiTesting}
                      onChange={(e) => setReportForm({ ...reportForm, tanggalLokasiTesting: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Jumlah Responden Aktual</label>
                    <Input
                      type="number"
                      min={0}
                      value={reportForm.jumlahRespondenAktual}
                      onChange={(e) => setReportForm({ ...reportForm, jumlahRespondenAktual: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Profil Responden Aktual</label>
                    <Input
                      placeholder="Contoh: 10 Nasabah Tabungan Emas aktif usia 25-35 thn..."
                      value={reportForm.profilRespondenAktual}
                      onChange={(e) => setReportForm({ ...reportForm, profilRespondenAktual: e.target.value })}
                    />
                  </div>
                </div>

                {/* Info Feedback Responden dari Paket 18 */}
                {initialData?.feedbackResponden && initialData.feedbackResponden.length > 0 && (
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-3">
                    <span className="text-emerald-900 font-semibold flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#3E9463] shrink-0" />
                      <span>
                        Terdapat <strong>{initialData.feedbackResponden.length} responden</strong> tersimpan di Feedback Matrix (Kartu Baku: Lakukan sesi user testing).
                      </span>
                    </span>
                    <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 text-[10px]">
                      Terintegrasi PDF
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ══ SECTION C: TABEL 1 — Temuan Kualitatif (6 Baris Tetap) ══ */}
            <Card className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-[#3E9463]" />
                      <span>C. Daftar Pertanyaan Kunci dan Temuan Kualitatif</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      6 pertanyaan baku resmi dari Template 2.2 untuk menggali feedback esensial responden.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-50">
                    6 Baris Baku
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-1/4">Kategori</th>
                        <th className="p-3 w-1/3">Pertanyaan Kunci (Baku)</th>
                        <th className="p-3">Temuan Utama (Isian Tim)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {temuanKualitatifList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-3 font-bold text-gray-900 align-top bg-gray-50/50">
                            {item.kategori}
                          </td>
                          <td className="p-3 text-gray-600 align-top text-[11px] leading-relaxed">
                            {item.pertanyaanKunci}
                          </td>
                          <td className="p-2.5 align-top">
                            <Textarea
                              rows={2}
                              placeholder={`Tulis temuan utama untuk ${item.kategori.toLowerCase()}...`}
                              value={item.temuanUtama}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTemuanKualitatifList((prev) =>
                                  prev.map((t, i) => (i === idx ? { ...t, temuanUtama: val } : t))
                                );
                              }}
                              className="text-xs bg-white border border-gray-200 focus:border-[#3E9463]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ══ SECTION D: TABEL 2 — Hasil Pengukuran Customer Validation (7 Baris Tetap) ══ */}
            <Card className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#3E9463]" />
                      <span>D. Hasil Pengukuran Customer Validation (7 Parameter)</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Evaluasi pencapaian target Desirability, Feasibility, dan Viability berdasarkan pengujian nyata.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-50">
                    7 Parameter Baku
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5 w-[100px]">Validasi</th>
                        <th className="p-2.5 w-[160px]">Metrik</th>
                        <th className="p-2.5 w-[140px]">Target</th>
                        <th className="p-2.5 w-[140px]">Hasil Aktual</th>
                        <th className="p-2.5 w-[150px]">Interpretasi</th>
                        <th className="p-2.5 w-[150px]">Learning</th>
                        <th className="p-2.5 w-[150px]">Enhancement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {metrikHasilList.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-2.5 font-bold text-gray-900 align-top bg-gray-50/50">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              m.validasi === 'Desirability'
                                ? 'bg-amber-100 text-amber-900'
                                : m.validasi === 'Feasibility'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-purple-100 text-purple-900'
                            }`}>
                              {m.validasi}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-gray-800 align-top text-[11px]">
                            {m.metrik}
                          </td>
                          <td className="p-2.5 text-gray-600 align-top text-[11px]">
                            {m.target || "-"}
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              placeholder="Hasil aktual..."
                              value={m.hasilAktual || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMetrikHasilList((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, hasilAktual: val } : row))
                                );
                              }}
                              className="text-xs h-8 bg-white border-gray-200"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              placeholder="Interpretasi..."
                              value={m.interpretasi || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMetrikHasilList((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, interpretasi: val } : row))
                                );
                              }}
                              className="text-xs h-8 bg-white border-gray-200"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              placeholder="Pembelajaran..."
                              value={m.learning || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMetrikHasilList((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, learning: val } : row))
                                );
                              }}
                              className="text-xs h-8 bg-white border-gray-200"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              placeholder="Rencana perbaikan..."
                              value={m.enhancement || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMetrikHasilList((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, enhancement: val } : row))
                                );
                              }}
                              className="text-xs h-8 bg-white border-gray-200"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ══ SECTION E: Analisis Akhir, PSF, Keputusan & Catatan MVP Planning ══ */}
            <Card className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E]">
                  E. Analisis Akhir, Ketercapaian PSF &amp; Keputusan Gerbang
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Kesimpulan status Problem-Solution Fit dan penetapan kelanjutan fase ke Market Validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Ketercapaian PSF (Problem-Solution Fit)
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-semibold"
                      value={reportForm.ketercapaianPsf}
                      onChange={(e) => setReportForm({ ...reportForm, ketercapaianPsf: e.target.value })}
                    >
                      <option value="tercapai">Tercapai (Fit)</option>
                      <option value="tercapai_dengan_catatan">Tercapai dengan Catatan</option>
                      <option value="belum_tercapai">Belum Tercapai (Perlu Iterasi)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Keputusan Lanjut (Phase Gate MV)
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-semibold"
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
                  <label className="text-xs font-bold text-gray-800 block">
                    Catatan untuk MVP Planning (Rencana Pengembangan Lanjutan)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Fitur minimum yang harus masuk MVP, fitur yang ditunda, risiko teknis/bisnis yang harus dikaji, dan dependensi pihak ketiga..."
                    value={reportForm.catatanMvpPlanning}
                    onChange={(e) => setReportForm({ ...reportForm, catatanMvpPlanning: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Kesimpulan &amp; Pembelajaran Utama
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Rangkum pembelajaran terpenting selama validasi pelanggan..."
                    value={reportForm.kesimpulan}
                    onChange={(e) => setReportForm({ ...reportForm, kesimpulan: e.target.value })}
                  />
                </div>

                {/* 📎 Dokumen Preliminary Review (Read-only list dari kartu Kanban) */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 rounded-2xl border border-[#C9E4D0] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#0B3D2E] flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-[#3E9463]" />
                      <span>Dokumen Preliminary Review (Hasil Review SME / Coach)</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium bg-emerald-100/60 text-emerald-900 px-2 py-0.5 rounded-full">
                      Dikelola via Kartu Kanban &ldquo;Preliminary Review (SME)&rdquo;
                    </span>
                  </div>

                  {Array.isArray(initialData?.report?.buktiPendukung) &&
                  initialData.report.buktiPendukung.filter((b: any) => b.type === "dokumen_preliminary_review").length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {initialData.report.buktiPendukung
                        .filter((b: any) => b.type === "dokumen_preliminary_review")
                        .map((doc: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-[#3E9463] transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <FileCheck className="h-4 w-4 text-[#3E9463] shrink-0" />
                              <div className="min-w-0">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-gray-800 hover:text-[#0B3D2E] truncate block hover:underline"
                                >
                                  {doc.file_name || "Dokumen Preliminary Review"}
                                </a>
                                {doc.tanggal && (
                                  <span className="text-[10px] text-gray-400">
                                    {formatDateIndo(doc.tanggal)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#0B3D2E] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
                              title="Buka / Unduh Dokumen"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic bg-white/70 p-2.5 rounded-xl border border-dashed border-gray-200">
                      Belum ada dokumen preliminary review yang diunggah. Unggah dokumen review melalui kartu Kanban &ldquo;Preliminary Review (SME)&rdquo; dan klik &ldquo;Simpan ke Laporan CV&rdquo;.
                    </p>
                  )}
                </div>

                {/* Bukti Pendukung / Catatan Review SME Lainnya */}
                {Array.isArray(initialData?.report?.buktiPendukung) &&
                  initialData.report.buktiPendukung.filter((b: any) => b.type !== "dokumen_preliminary_review").length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <span className="text-xs font-bold text-gray-700 block">
                        Catatan Review SME ({initialData.report.buktiPendukung.filter((b: any) => b.type !== "dokumen_preliminary_review").length} Catatan):
                      </span>
                      <div className="space-y-1.5">
                        {initialData.report.buktiPendukung
                          .filter((b: any) => b.type !== "dokumen_preliminary_review")
                          .map((b: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                                <span>Reviewer: {b.reviewer || b.smeNama || "SME / Coach"}</span>
                                <span className="text-gray-400 font-normal">{b.tanggal ? formatDateIndo(b.tanggal) : ""}</span>
                              </div>
                              <p className="text-gray-600 text-[11px] mt-1 whitespace-pre-wrap">{b.content || b.catatan || JSON.stringify(b)}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* ══ SECTION F: Blok Tanda Tangan 3 Kolom Laporan CV ══ */}
            <Card className="border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-[#3E9463]" />
                  <span>F. Lembar Pengesahan Laporan Customer Validation</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Tanda tangan digital 3 pihak untuk memvalidasi laporan akhir Customer Validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Inisiator Inovasi */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disusun Oleh
                      </span>
                      {reportTtdDisusun?.status === 'signed' ? (
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
                      {reportTtdDisusun?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{reportTtdDisusun.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisusun.jabatan || "Inisiator Inovasi"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisusun.unit || "PT Pegadaian"}</span>
                          </div>
                          {reportTtdDisusun.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={reportTtdDisusun.signatureImage}
                                alt="Tanda Tangan Inisiator"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {reportTtdDisusun.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(reportTtdDisusun.tanggal)}
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
                      {reportTtdDisusun?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'inisiator'}
                          onClick={() => handleRevokeSign('inisiator', 'report')}
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
                          onClick={() => openSignModal('inisiator', 'report')}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Inisiator</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 2. Innovation Coach */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Diperiksa Oleh
                      </span>
                      {reportTtdDiperiksa?.status === 'signed' ? (
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
                      {reportTtdDiperiksa?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{reportTtdDiperiksa.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDiperiksa.jabatan || "Innovation Coach"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDiperiksa.unit || "PT Pegadaian"}</span>
                          </div>
                          {reportTtdDiperiksa.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={reportTtdDiperiksa.signatureImage}
                                alt="Tanda Tangan Coach"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {reportTtdDiperiksa.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(reportTtdDiperiksa.tanggal)}
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
                      {reportTtdDiperiksa?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'coach'}
                          onClick={() => handleRevokeSign('coach', 'report')}
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
                          onClick={() => openSignModal('coach', 'report')}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Coach</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3. Project Owner */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disetujui Oleh
                      </span>
                      {reportTtdDisetujui?.status === 'signed' ? (
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
                      {reportTtdDisetujui?.status === 'signed' ? (
                        <>
                          <div className="font-bold text-gray-900">{reportTtdDisetujui.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisetujui.jabatan || "Project Owner"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisetujui.unit || "PT Pegadaian"}</span>
                          </div>
                          {reportTtdDisetujui.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={reportTtdDisetujui.signatureImage}
                                alt="Tanda Tangan PO"
                                className="h-10 w-auto object-contain block"
                              />
                            </div>
                          )}
                          {reportTtdDisetujui.tanggal && (
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">
                              {formatDateIndo(reportTtdDisetujui.tanggal)}
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
                      {reportTtdDisetujui?.status === 'signed' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === 'po'}
                          onClick={() => handleRevokeSign('po', 'report')}
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
                          onClick={() => openSignModal('po', 'report')}
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

            {/* Tombol Simpan Laporan */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold gap-2 h-11 px-8 rounded-xl shadow-sm text-xs cursor-pointer active:scale-98 transition-all">
                {saving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                ) : (
                  <Save className="h-4 w-4 text-[#F0C24B]" />
                )}
                <span>{saving ? "Menyimpan Laporan..." : "Simpan Validation Report"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Signature Pad Modal (Reusable for Plan & Report) */}
      <SignaturePadModal
        isOpen={sigModal.isOpen}
        onClose={() => setSigModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSignature}
        title={`Tanda Tangan Digital — ${sigModal.roleName} (${sigModal.targetDoc === 'report' ? 'Laporan CV' : 'Perencanaan CV'})`}
        roleName={sigModal.roleName}
        userName={sigModal.userName}
      />
    </div>
  );
}
