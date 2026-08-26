"use client";

import React, { useState } from "react";
import {
  saveMarketValidationPlanFullAction,
  generateMvBacklogAction,
  signMvPlanAction,
  revokeMvPlanSignatureAction,
  saveMarketValidationReportAction,
  signMvReportAction,
  revokeMvReportSignatureAction,
} from "@/app/actions/market-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  CheckCircle,
  Rocket,
  TrendingUp,
  Stamp,
  RotateCcw,
  Loader2,
  Briefcase,
  Building2,
  Plus,
  Trash2,
  Paperclip,
  Upload,
  ExternalLink,
  Table2,
  Layers,
  BarChart3,
  Users,
  FileCheck,
  KanbanSquare,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  FileText,
  Activity,
  History,
} from "lucide-react";
import { toast } from "@/components/ui/ToastProvider";
import { SignaturePadModal } from "@/components/ui/SignaturePad";
import { KanbanClient } from "../kanban/KanbanClient";

// ── 5 Baris Tetap Resources Needed (Bagian D) ─────────────────────────────────
const RESOURCES_NEEDED_ROWS = [
  {
    jenisResource: "people_sme",
    label: "People & SME",
    deskripsi: "Kompetensi teknis, subject matter expert, tim operasional lini depan",
  },
  {
    jenisResource: "system_technology",
    label: "System & Technology",
    deskripsi: "Infrastruktur IT, API, server, tooling pendukung sistem",
  },
  {
    jenisResource: "data_access",
    label: "Data & Access",
    deskripsi: "Akses database, izin sistem, credentials, data dummy/live",
  },
  {
    jenisResource: "budget_procurement",
    label: "Budget & Procurement",
    deskripsi: "Anggaran pilot, lisensi software, biaya operasional/promosi",
  },
  {
    jenisResource: "operational_support",
    label: "Operational Support",
    deskripsi: "Dukungan outlet/cabang percontohan, SOP sementara, sosialisasi staf",
  },
];

// ── 9 Baris Tetap Metrik DFV Market Validation (Bagian E) ─────────────────────
const MV_METRIK_ROWS = [
  {
    validasi: "Desirability",
    metrik: "Kepuasan Pengguna MVP",
    unitUkuran: "Skala 1-5 / CSAT",
    baseline: "0 / Eksisting",
    target: "≥4.0",
    threshold: "70% (≥2.8)",
    caraPengukuran: "Survey pasca-penggunaan MVP & wawancara mendalam",
    pic: "Project Owner",
    evidence: "Rekap survey CSAT & quote pengguna",
  },
  {
    validasi: "Desirability",
    metrik: "Adopsi / Penggunaan Berulang",
    unitUkuran: "% pengguna aktif berulang",
    baseline: "0%",
    target: "≥60%",
    threshold: "70% (≥42%)",
    caraPengukuran: "Tracking log aktivitas sistem / transaksi berulang",
    pic: "Tech Lead / PO",
    evidence: "Dashboard analitik pengguna & data transaksi",
  },
  {
    validasi: "Desirability",
    metrik: "Rekomendasi / Referral (NPS)",
    unitUkuran: "NPS Skor / % Rekomendasi",
    baseline: "0",
    target: "NPS ≥+30 atau ≥70% Ya",
    threshold: "70%",
    caraPengukuran: "Survey NPS / pertanyaan rekomendasi ke rekan kerja",
    pic: "Project Owner",
    evidence: "Hasil survey NPS & formulir feedback",
  },
  {
    validasi: "Feasibility",
    metrik: "Ketersediaan Sistem & Kelancaran Proses",
    unitUkuran: "% Uptime / SLA",
    baseline: "90%",
    target: "≥99% selama pilot",
    threshold: "70% (≥95%)",
    caraPengukuran: "Monitoring server, log downtime, laporan helpdesk",
    pic: "Tech Lead / DevOps",
    evidence: "Log monitoring server & incident report",
  },
  {
    validasi: "Feasibility",
    metrik: "Waktu Proses / Response Time Solusi",
    unitUkuran: "Detik / Menit per transaksi",
    baseline: "15 menit (manual)",
    target: "≤2 menit",
    threshold: "70% (≤5 menit)",
    caraPengukuran: "Pencatatan time-and-motion saat user menyelesaikan alur",
    pic: "Scrum Master / Analyst",
    evidence: "Hasil uji latency & catatan observasi waktu",
  },
  {
    validasi: "Feasibility",
    metrik: "Error / Issue Rate (Tingkat Kegagalan Transaksi)",
    unitUkuran: "% transaksi gagal",
    baseline: "10%",
    target: "≤2%",
    threshold: "70% (≤5%)",
    caraPengukuran: "Analisis error log, bug ticketing system",
    pic: "Tech Lead / QA",
    evidence: "Laporan bug Jira / daftar issue log",
  },
  {
    validasi: "Viability",
    metrik: "Realisasi Potensi Revenue / Transaksi Finansial",
    unitUkuran: "Rp / Volume transaksi",
    baseline: "Rp 0",
    target: "Sesuai target proyek pilot",
    threshold: "70% dari target",
    caraPengukuran: "Rekap pembukuan sistem / laporan keuangan transaksi pilot",
    pic: "PO / Finance Analyst",
    evidence: "Rekap transaksi & mutasi rekening percontohan",
  },
  {
    validasi: "Viability",
    metrik: "Efisiensi Biaya Operasional / Penghematan Waktu",
    unitUkuran: "% penghematan / Rp efisiensi",
    baseline: "Biaya proses manual eksisting",
    target: "≥30% efisiensi",
    threshold: "70% (≥21%)",
    caraPengukuran: "Kalkulasi perbandingan biaya operasional sebelum vs sesudah",
    pic: "PO / Finance Analyst",
    evidence: "Model perbandingan biaya (cost benefit spreadsheet)",
  },
  {
    validasi: "Viability",
    metrik: "Proyeksi ROI / Cost-Benefit Tahap Pilot",
    unitUkuran: "Rasio ROI / Nilai NPV awal",
    baseline: "0",
    target: "Positif (ROI > 100%)",
    threshold: "70%",
    caraPengukuran: "Analisis kelayakan finansial berbasis data riil pilot",
    pic: "PO / Coach",
    evidence: "Kajian finansial pasca-pilot & validasi sponsor",
  },
];

function formatDateIndo(dateStr?: string | Date | null) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function formatDateForInput(dateVal?: any) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function MarketValidationClient({
  timId,
  timInfo,
  roleAssignments,
  initialData,
  initialColumns = [],
  initialCards = [],
  initialSprints = [],
  anggotaTim = [],
  canEdit = true,
  canApprove = false,
  canEditKanban = true,
  currentUser,
  phaseGateStatus,
}: {
  timId: string;
  timInfo?: {
    namaProyekInovasi?: string | null;
    klasifikasiInovasi?: string | null;
  };
  roleAssignments?: any[];
  initialData: any;
  initialColumns?: any[];
  initialCards?: any[];
  initialSprints?: any[];
  anggotaTim?: any[];
  canEdit?: boolean;
  canApprove?: boolean;
  canEditKanban?: boolean;
  currentUser?: any;
  phaseGateStatus?: any;
}) {
  // Auto-fill dari CV Report jika ada
  const defaultHasilCv =
    initialData?.plan?.hasilCustomerValidationRingkasan ||
    (initialData?.cvReport
      ? [
          initialData.cvReport.validatedSolution
            ? `Validated Solution:\n${initialData.cvReport.validatedSolution}`
            : "",
          initialData.cvReport.kesimpulan
            ? `Kesimpulan CV:\n${initialData.cvReport.kesimpulan}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : "");

  // ── Plan Form State ────────────────────────────────────────────────────────
  const [planForm, setPlanForm] = useState({
    hasilCustomerValidationRingkasan: defaultHasilCv,
    mvpVersion: initialData?.plan?.mvpVersion || "v1.0-pilot",
    channelRelease: initialData?.plan?.channelRelease || "Internal Web Pilot",
    periodeReleaseMulai: formatDateForInput(initialData?.plan?.periodeReleaseMulai),
    periodeReleaseSelesai: formatDateForInput(initialData?.plan?.periodeReleaseSelesai),
    deskripsiMvp: initialData?.plan?.deskripsiMvp || "",
    deskripsiProsesMvp: initialData?.plan?.deskripsiProsesMvp || "",
    fiturMvpDirilis: initialData?.plan?.fiturMvpDirilis || "",
    targetEarlyAdopters: initialData?.plan?.targetEarlyAdopters || "50 Pengguna Aktif",
    lokasiPilot: initialData?.plan?.lokasiPilot || "3 Kantor Cabang Percontohan",
    jumlahTargetPengguna: initialData?.plan?.jumlahTargetPengguna || 50,
    daftarEarlyAdopters: initialData?.plan?.daftarEarlyAdopters || "",
    batasanScopeMvp: initialData?.plan?.batasanScopeMvp || "",
    dataDukungMvp: Array.isArray(initialData?.plan?.dataDukungMvp)
      ? initialData.plan.dataDukungMvp
      : [],
  });

  // ── Bagian C: Mapping Fitur State (Dinamis) ──────────────────────────────────
  const [mappingFiturList, setMappingFiturList] = useState<
    Array<{
      id?: string;
      solusiTervalidasi: string;
      fiturSolusi: string;
      benefit: string;
      fiturMvpStatus: "dirilis" | "ditunda";
      acceptanceCriteriaEvidence: string;
    }>
  >(() => {
    if (initialData?.fiturMapping && initialData.fiturMapping.length > 0) {
      return initialData.fiturMapping.map((f: any) => ({
        id: f.id,
        solusiTervalidasi: f.solusiTervalidasi || "",
        fiturSolusi: f.fiturSolusi || "",
        benefit: f.benefit || "",
        fiturMvpStatus: f.fiturMvpStatus || "dirilis",
        acceptanceCriteriaEvidence: f.acceptanceCriteriaEvidence || "",
      }));
    }
    return [
      {
        solusiTervalidasi: "",
        fiturSolusi: "",
        benefit: "",
        fiturMvpStatus: "dirilis",
        acceptanceCriteriaEvidence: "",
      },
    ];
  });

  const handleAddFiturRow = () => {
    setMappingFiturList((prev) => [
      ...prev,
      {
        solusiTervalidasi: "",
        fiturSolusi: "",
        benefit: "",
        fiturMvpStatus: "dirilis",
        acceptanceCriteriaEvidence: "",
      },
    ]);
  };

  const handleRemoveFiturRow = (idx: number) => {
    setMappingFiturList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFiturRow = (idx: number, field: string, val: string) => {
    setMappingFiturList((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // ── Bagian D: Resources Needed State (5 Baris Tetap) ────────────────────────
  const [resourcesList, setResourcesList] = useState<
    Array<{
      jenisResource: string;
      label: string;
      deskripsi: string;
      kebutuhanSpesifik: string;
      ownerSumber: string;
      statusKetersediaan: string;
      gapTindakLanjut: string;
    }>
  >(() => {
    return RESOURCES_NEEDED_ROWS.map((row) => {
      const found = (initialData?.resources || []).find(
        (r: any) => r.jenisResource === row.jenisResource
      );
      return {
        jenisResource: row.jenisResource,
        label: row.label,
        deskripsi: row.deskripsi,
        kebutuhanSpesifik: found?.kebutuhanSpesifik || "",
        ownerSumber: found?.ownerSumber || "",
        statusKetersediaan: found?.statusKetersediaan || "Belum",
        gapTindakLanjut: found?.gapTindakLanjut || "",
      };
    });
  });

  const handleUpdateResource = (idx: number, field: string, val: string) => {
    setResourcesList((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // ── Bagian E: Metrik DFV State (9 Baris Tetap) ──────────────────────────────
  const [metrikList, setMetrikList] = useState<
    Array<{
      validasi: string;
      metrik: string;
      unitUkuran: string;
      baseline: string;
      target: string;
      threshold: string;
      caraPengukuran: string;
      pic: string;
      evidence: string;
    }>
  >(() => {
    return MV_METRIK_ROWS.map((row) => {
      const found = (initialData?.metrikRencana || []).find(
        (m: any) => m.metrik === row.metrik
      );
      return {
        validasi: row.validasi,
        metrik: row.metrik,
        unitUkuran: found?.unitUkuran || row.unitUkuran,
        baseline: found?.baseline || row.baseline,
        target: found?.target || row.target,
        threshold: found?.threshold || row.threshold,
        caraPengukuran: found?.caraPengukuran || row.caraPengukuran,
        pic: found?.pic || row.pic,
        evidence: found?.evidence || row.evidence,
      };
    });
  });

  const handleUpdateMetrik = (idx: number, field: string, val: string) => {
    setMetrikList((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // ── File Upload State for Data Dukung MVP ───────────────────────────────────
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleUploadDataDukung = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timId", timId);
      formData.append("contextType", "market_validation");

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
        setPlanForm((prev) => ({
          ...prev,
          dataDukungMvp: [...prev.dataDukungMvp, newFile],
        }));
        toast.success(`Dokumen "${file.name}" berhasil diunggah!`, "Upload Berhasil");
      } else {
        toast.error(json.message || "Gagal mengunggah dokumen.", "Upload Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat upload.", "Error");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleRemoveDataDukung = (indexToRemove: number) => {
    setPlanForm((prev) => ({
      ...prev,
      dataDukungMvp: prev.dataDukungMvp.filter((_: any, idx: number) => idx !== indexToRemove),
    }));
  };

  // ── Signature State for MVP Plan ───────────────────────────────────────────
  const [ttdDisusun, setTtdDisusun] = useState<any | null>(
    initialData?.plan?.ttdDisusun || null
  );
  const [ttdDiperiksa, setTtdDiperiksa] = useState<any | null>(
    initialData?.plan?.ttdDiperiksa || null
  );
  const [ttdDisetujui, setTtdDisetujui] = useState<any | null>(
    initialData?.plan?.ttdDisetujui || null
  );

  const [sigModal, setSigModal] = useState<{
    isOpen: boolean;
    roleType: "po" | "coach" | "promotor";
    roleName: string;
    userName?: string;
  }>({
    isOpen: false,
    roleType: "po",
    roleName: "Project Owner",
  });

  const [signingRole, setSigningRole] = useState<string | null>(null);

  const teamMembers = initialData?.teamMembers || anggotaTim || [];
  const poCharterName =
    teamMembers.find(
      (m: any) =>
        m.jabatan?.toLowerCase().includes("owner") ||
        m.jabatan?.toLowerCase().includes("po")
    )?.nama || "";
  const coachCharterName =
    teamMembers.find((m: any) => m.jabatan?.toLowerCase().includes("coach"))?.nama || "";
  const promotorCharterName =
    teamMembers.find((m: any) => m.jabatan?.toLowerCase().includes("promotor"))?.nama || "";

  const openSignModal = (roleType: "po" | "coach" | "promotor") => {
    const roleName =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";
    const userName =
      roleType === "po"
        ? poCharterName || currentUser?.nama
        : roleType === "coach"
        ? coachCharterName || currentUser?.nama
        : promotorCharterName || currentUser?.nama;

    setSigModal({
      isOpen: true,
      roleType,
      roleName,
      userName,
    });
  };

  const handleSaveSignature = async (dataUrl: string) => {
    setSigningRole(sigModal.roleType);
    try {
      const res = await signMvPlanAction(timId, sigModal.roleType, dataUrl);
      if (res.success && res.signatureData) {
        if (sigModal.roleType === "po") setTtdDisusun(res.signatureData);
        else if (sigModal.roleType === "coach") setTtdDiperiksa(res.signatureData);
        else setTtdDisetujui(res.signatureData);

        toast.success(
          `Tanda tangan sebagai ${sigModal.roleName} berhasil dibubuhkan!`,
          "Tanda Tangan Tersimpan"
        );
        setSigModal((prev) => ({ ...prev, isOpen: false }));
      } else {
        toast.error(res.error || "Gagal menyimpan tanda tangan.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan tanda tangan.", "Error");
    } finally {
      setSigningRole(null);
    }
  };

  const handleRevokeSign = async (roleType: "po" | "coach" | "promotor") => {
    const roleName =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";
    if (!confirm(`Batalkan tanda tangan ${roleName}?`)) return;

    setSigningRole(roleType);
    try {
      const res = await revokeMvPlanSignatureAction(timId, roleType);
      if (res.success) {
        if (roleType === "po") setTtdDisusun(null);
        else if (roleType === "coach") setTtdDiperiksa(null);
        else setTtdDisetujui(null);

        toast.info(`Tanda tangan ${roleName} telah dibatalkan.`, "Tanda Tangan Dibatalkan");
      } else {
        toast.error(res.error || "Gagal membatalkan tanda tangan.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat membatalkan tanda tangan.", "Error");
    } finally {
      setSigningRole(null);
    }
  };

  // ── Save Full Plan ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);

    const payloadPlan = {
      hasilCustomerValidationRingkasan: planForm.hasilCustomerValidationRingkasan,
      mvpVersion: planForm.mvpVersion,
      channelRelease: planForm.channelRelease,
      periodeReleaseMulai: planForm.periodeReleaseMulai
        ? new Date(planForm.periodeReleaseMulai)
        : null,
      periodeReleaseSelesai: planForm.periodeReleaseSelesai
        ? new Date(planForm.periodeReleaseSelesai)
        : null,
      deskripsiMvp: planForm.deskripsiMvp,
      deskripsiProsesMvp: planForm.deskripsiProsesMvp,
      fiturMvpDirilis: planForm.fiturMvpDirilis,
      targetEarlyAdopters: planForm.targetEarlyAdopters,
      lokasiPilot: planForm.lokasiPilot,
      jumlahTargetPengguna: Number(planForm.jumlahTargetPengguna) || 0,
      daftarEarlyAdopters: planForm.daftarEarlyAdopters,
      batasanScopeMvp: planForm.batasanScopeMvp,
      dataDukungMvp: planForm.dataDukungMvp,
    };

    const res = await saveMarketValidationPlanFullAction(
      timId,
      payloadPlan,
      mappingFiturList,
      resourcesList,
      metrikList
    );

    if (res.success) {
      toast.success("MVP Release Plan berhasil disimpan lengkap!", "Plan Tersimpan");
    } else {
      toast.error(res.error || "Gagal menyimpan MVP Plan.", "Gagal Menyimpan");
    }
    setSaving(false);
  };

  // ── Generate AI Backlog Action ──────────────────────────────────────────────
  const [generatingBacklog, setGeneratingBacklog] = useState(false);

  const handleGenerateBacklog = async () => {
    setGeneratingBacklog(true);
    try {
      const res = await generateMvBacklogAction(timId);
      if (res.success) {
        toast.success(
          res.message || `Berhasil menghasilkan rekomendasi backlog Market Validation!`,
          "Rekomendasi Terbuat"
        );
      } else {
        toast.error(res.error || "Gagal menghasilkan backlog.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.", "Error");
    } finally {
      setGeneratingBacklog(false);
    }
  };

  // ── Report Tab (Tab 3) State & Signatures ───────────────────────────────────
  const [reportForm, setReportForm] = useState({
    mvpVersionDilaporkan: initialData?.report?.mvpVersionDilaporkan || "v1.0-pilot",
    jumlahEarlyAdoptersAktual: initialData?.report?.jumlahEarlyAdoptersAktual || 45,
    ringkasanAktivitasRilis: initialData?.report?.ringkasanAktivitasRilis || "",
    kendalaUtama: initialData?.report?.kendalaUtama || "",
    kesimpulanPmf: initialData?.report?.kesimpulanPmf || "",
    keputusanGoNogo: initialData?.report?.keputusanGoNogo || "go_ke_fmi",
    rekomendasiIterasi: initialData?.report?.rekomendasiIterasi || "",
    rencanaMvpBerikutnya: initialData?.report?.rencanaMvpBerikutnya || "",
    rekomendasiPromotorSponsor: initialData?.report?.rekomendasiPromotorSponsor || "",
  });

  const [reportTtdDisusun, setReportTtdDisusun] = useState<any | null>(
    initialData?.report?.ttdDisusun || null
  );
  const [reportTtdDiperiksa, setReportTtdDiperiksa] = useState<any | null>(
    initialData?.report?.ttdDiperiksa || null
  );
  const [reportTtdDisetujui, setReportTtdDisetujui] = useState<any | null>(
    initialData?.report?.ttdDisetujui || null
  );

  const [reportSigModal, setReportSigModal] = useState<{
    isOpen: boolean;
    roleType: "po" | "coach" | "promotor";
    roleName: string;
    userName?: string;
  }>({
    isOpen: false,
    roleType: "po",
    roleName: "Project Owner",
  });

  const [reportSigningRole, setReportSigningRole] = useState<string | null>(null);

  const openReportSignModal = (roleType: "po" | "coach" | "promotor") => {
    const roleName =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";
    const userName =
      roleType === "po"
        ? poCharterName || currentUser?.nama
        : roleType === "coach"
        ? coachCharterName || currentUser?.nama
        : promotorCharterName || currentUser?.nama;

    setReportSigModal({
      isOpen: true,
      roleType,
      roleName,
      userName,
    });
  };

  const handleSaveReportSignature = async (dataUrl: string) => {
    setReportSigningRole(reportSigModal.roleType);
    try {
      const res = await signMvReportAction(timId, reportSigModal.roleType, dataUrl);
      if (res.success && res.signatureData) {
        if (reportSigModal.roleType === "po") setReportTtdDisusun(res.signatureData);
        else if (reportSigModal.roleType === "coach") setReportTtdDiperiksa(res.signatureData);
        else setReportTtdDisetujui(res.signatureData);

        toast.success(
          `Tanda tangan Laporan MV sebagai ${reportSigModal.roleName} berhasil dibubuhkan!`,
          "Tanda Tangan Tersimpan"
        );
        setReportSigModal((prev) => ({ ...prev, isOpen: false }));
      } else {
        toast.error(res.error || "Gagal menandatangani Laporan MV.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan tanda tangan.", "Error");
    } finally {
      setReportSigningRole(null);
    }
  };

  const handleRevokeReportSignature = async (roleType: "po" | "coach" | "promotor") => {
    const roleName =
      roleType === "po"
        ? "Project Owner"
        : roleType === "coach"
        ? "Innovation Coach"
        : "Promotor Inovasi";
    if (!confirm(`Batalkan tanda tangan ${roleName} pada Laporan MV?`)) return;

    setReportSigningRole(roleType);
    try {
      const res = await revokeMvReportSignatureAction(timId, roleType);
      if (res.success) {
        if (roleType === "po") setReportTtdDisusun(null);
        else if (roleType === "coach") setReportTtdDiperiksa(null);
        else setReportTtdDisetujui(null);

        toast.info(`Tanda tangan ${roleName} telah dibatalkan.`, "Tanda Tangan Dibatalkan");
      } else {
        toast.error(res.error || "Gagal membatalkan tanda tangan.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.", "Error");
    } finally {
      setReportSigningRole(null);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!initialData?.plan?.id) {
      toast.error(
        "Harap simpan Market Validation Plan terlebih dahulu sebelum mengisi laporan.",
        "Validasi Diperlukan"
      );
      return;
    }
    setSaving(true);
    const res = await saveMarketValidationReportAction(
      initialData.plan.id,
      timId,
      reportForm
    );
    if (res.success) {
      toast.success("Laporan Market Validation (PMF Report) berhasil disimpan!", "Laporan Tersimpan");
    } else {
      toast.error(res.error || "Gagal menyimpan report.", "Gagal Menyimpan");
    }
    setSaving(false);
  };

  // Data helpers for Tab 3 read-only sections
  const releaseLogs = initialData?.releaseLogs || [];
  const hasilMetrik = initialData?.hasilMetrik || [];
  const dfvRekapitulasi = initialData?.dfv || [];
  const sprintReviews = initialData?.sprintReviews || [];
  const allTeamCards = initialData?.allTeamCards || [];

  return (
    <div className="space-y-5">
      {/* ══ BAGIAN A: Header Read-Only (Template 3.1 & 3.2) ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#0B3D2E] text-[#F0C24B] border-none text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider">
              FR-PIA-03.1 / 03.2
            </Badge>
            <h2 className="text-base font-extrabold text-gray-900">
              {timInfo?.namaProyekInovasi || initialData?.tim?.namaProyekInovasi || "Market Validation Planning"}
            </h2>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
            <span>
              Klasifikasi Inovasi:{" "}
              <strong className="text-gray-800">
                {timInfo?.klasifikasiInovasi || initialData?.tim?.klasifikasiInovasi || "Incremental Innovation"}
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Tahap: <strong className="text-[#0B3D2E]">Market Validation (MVP Release &amp; PMF)</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/pdf/mv-report/${timId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#0B3D2E]" />
            <span>📄 Unduh PDF Laporan MV</span>
          </a>

          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingBacklog}
              onClick={handleGenerateBacklog}
              className="border-[#0B3D2E] text-[#0B3D2E] hover:bg-emerald-50 text-xs font-bold rounded-xl gap-2 h-9 px-4 shadow-2xs"
            >
              {generatingBacklog ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#F0C24B]" />
              )}
              <span>{generatingBacklog ? "Menghasilkan..." : "✨ Generate Rekomendasi Backlog"}</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl bg-emerald-50/70 p-1 rounded-xl border border-[#C9E4D0]">
          <TabsTrigger
            value="plan"
            className="flex items-center gap-2 text-xs font-bold data-[state=active]:bg-[#0B3D2E] data-[state=active]:text-white rounded-lg transition-all"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>1. MVP Release Plan</span>
          </TabsTrigger>
          <TabsTrigger
            value="backlog"
            className="flex items-center gap-2 text-xs font-bold data-[state=active]:bg-[#0B3D2E] data-[state=active]:text-white rounded-lg transition-all"
          >
            <KanbanSquare className="h-3.5 w-3.5" />
            <span>2. Backlog &amp; Sprint</span>
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="flex items-center gap-2 text-xs font-bold data-[state=active]:bg-[#0B3D2E] data-[state=active]:text-white rounded-lg transition-all"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>3. PMF &amp; Go/No-Go Report</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MVP RELEASE PLAN (TEMPLATE 3.1) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="plan" className="space-y-5 mt-4">
          <form onSubmit={handleSavePlan} className="space-y-5">
            {/* ══ BAGIAN B: Field Ringkasan MVP ══ */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#3E9463]" />
                      <span>B. Ringkasan Rencana Rilis MVP Pilot</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Definisi lingkup MVP, channel, periode release, dan profil target early adopters.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-gray-600 bg-gray-50">
                    Template 3.1
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* 1. Hasil Customer Validation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 block">
                      Hasil Customer Validation (Ringkasan Pembelajaran CV)
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Auto-fill dari CV Report (dapat diedit)
                    </span>
                  </div>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    placeholder="Ringkasan hasil pengujian solusi di tahap Customer Validation..."
                    value={planForm.hasilCustomerValidationRingkasan}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        hasilCustomerValidationRingkasan: e.target.value,
                      })
                    }
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* 2. Versi MVP & Channel Release */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">Versi MVP</label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Contoh: v1.0-pilot"
                      value={planForm.mvpVersion}
                      onChange={(e) => setPlanForm({ ...planForm, mvpVersion: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">Channel / Media Release</label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Contoh: Internal Web App / Outlet Pilot / Mobile APK Staging"
                      value={planForm.channelRelease}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, channelRelease: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* 3. Periode Release (Mulai & Selesai) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Periode Release — Mulai
                    </label>
                    <Input
                      type="date"
                      disabled={!canEdit}
                      value={planForm.periodeReleaseMulai}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, periodeReleaseMulai: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Periode Release — Selesai
                    </label>
                    <Input
                      type="date"
                      disabled={!canEdit}
                      value={planForm.periodeReleaseSelesai}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, periodeReleaseSelesai: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* 4. Deskripsi MVP & Deskripsi Proses MVP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">Deskripsi Ringkas MVP</label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Gambaran umum bentuk MVP yang dirilis dan nilai tambah langsung bagi pengguna..."
                    value={planForm.deskripsiMvp}
                    onChange={(e) => setPlanForm({ ...planForm, deskripsiMvp: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Deskripsi Proses MVP (Alur Operasional &amp; Interaksi Pengguna)
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    placeholder="Jelaskan alur proses bagaimana MVP dijalankan di lapangan, mulai dari onboarding user s.d. transaksi..."
                    value={planForm.deskripsiProsesMvp}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, deskripsiProsesMvp: e.target.value })
                    }
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* 5. Fitur MVP yang Dirilis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 block">
                    Fitur MVP yang Dirilis (Ringkasan Fungsional)
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Daftar modul/fitur fungsional utama yang siap diuji..."
                    value={planForm.fiturMvpDirilis}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, fiturMvpDirilis: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>

                {/* 6. Target Early Adopters, Lokasi Pilot, Jumlah Target Pengguna */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Target Early Adopters</label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Contoh: Nasabah Gadai Prioritas..."
                      value={planForm.targetEarlyAdopters}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, targetEarlyAdopters: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Lokasi Pilot</label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Contoh: 3 Cabang Kanwil VIII..."
                      value={planForm.lokasiPilot}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiPilot: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      Jumlah Target Pengguna
                    </label>
                    <Input
                      disabled={!canEdit}
                      type="number"
                      min={1}
                      value={planForm.jumlahTargetPengguna}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          jumlahTargetPengguna: Number(e.target.value),
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* 7. Daftar Early Adopters & Batasan Scope MVP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Daftar / Profil Spesifik Early Adopters
                    </label>
                    <Textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Kriteria segmen, nama outlet/unit percontohan, atau daftar calon pengguna awal..."
                      value={planForm.daftarEarlyAdopters}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, daftarEarlyAdopters: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 block">
                      Batasan Scope MVP (Out of Scope)
                    </label>
                    <Textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Fitur atau skenario yang sengaja tidak dimasukkan pada rilis pilot ini..."
                      value={planForm.batasanScopeMvp}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, batasanScopeMvp: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* 8. Data Dukung MVP (File Upload) */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                      <span>Data Dukung MVP (Lampiran Rencana)</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      PDF, Word, Excel, Gambar (Maks 10MB)
                    </span>
                  </div>

                  {canEdit && (
                    <div className="relative">
                      <input
                        type="file"
                        id="mvp-data-dukung-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                        disabled={uploadingDoc}
                        onChange={handleUploadDataDukung}
                        className="sr-only"
                      />
                      <label
                        htmlFor="mvp-data-dukung-upload"
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-[#EBF5EE] hover:border-[#3E9463] transition-colors cursor-pointer text-xs font-semibold text-[#0B3D2E] ${
                          uploadingDoc ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {uploadingDoc ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-[#3E9463]" />
                            <span>Mengunggah dokumen lampiran...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-[#3E9463]" />
                            <span>Unggah Dokumen Data Dukung MVP</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}

                  {Array.isArray(planForm.dataDukungMvp) && planForm.dataDukungMvp.length > 0 ? (
                    <div className="space-y-1.5 mt-2">
                      {planForm.dataDukungMvp.map((file: any, idx: number) => (
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
                                onClick={() => handleRemoveDataDukung(idx)}
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
                      Belum ada file data dukung yang dilampirkan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ══ BAGIAN C: Tabel Dinamis Mapping Solusi & Fitur MVP ══ */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-[#3E9463]" />
                      <span>C. Mapping Solusi, Fitur, Benefit, dan Fitur MVP</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Pemetaan detail antara solusi yang tervalidasi di CV dengan fitur MVP yang dirilis atau ditunda.
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFiturRow}
                      className="border-[#3E9463] text-[#0B3D2E] hover:bg-[#EBF5EE] text-xs font-bold rounded-xl gap-1.5 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Baris Fitur</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-[180px]">Solusi Tervalidasi</th>
                        <th className="p-3 w-[180px]">Fitur Solusi *</th>
                        <th className="p-3 w-[200px]">Benefit (Cust / Business)</th>
                        <th className="p-3 w-[140px]">Fitur MVP</th>
                        <th className="p-3">Acceptance Criteria / Evidence</th>
                        {canEdit && <th className="p-3 w-[40px] text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {mappingFiturList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              placeholder="Solusi terkait..."
                              value={row.solusiTervalidasi}
                              onChange={(e) =>
                                handleUpdateFiturRow(idx, "solusiTervalidasi", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              placeholder="Nama fitur solusi..."
                              value={row.fiturSolusi}
                              onChange={(e) =>
                                handleUpdateFiturRow(idx, "fiturSolusi", e.target.value)
                              }
                              className="text-xs h-8 bg-white font-semibold"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              placeholder="Benefit bagi user/bisnis..."
                              value={row.benefit}
                              onChange={(e) =>
                                handleUpdateFiturRow(idx, "benefit", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <select
                              disabled={!canEdit}
                              value={row.fiturMvpStatus}
                              onChange={(e) =>
                                handleUpdateFiturRow(
                                  idx,
                                  "fiturMvpStatus",
                                  e.target.value as any
                                )
                              }
                              className={`w-full h-8 px-2 text-xs rounded-lg font-bold border ${
                                row.fiturMvpStatus === "dirilis"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              <option value="dirilis">🟢 Dirilis</option>
                              <option value="ditunda">🟡 Ditunda</option>
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              placeholder="Kriteria penerimaan / bukti..."
                              value={row.acceptanceCriteriaEvidence}
                              onChange={(e) =>
                                handleUpdateFiturRow(
                                  idx,
                                  "acceptanceCriteriaEvidence",
                                  e.target.value
                                )
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          {canEdit && (
                            <td className="p-2 align-top text-center">
                              <button
                                type="button"
                                disabled={mappingFiturList.length === 1}
                                onClick={() => handleRemoveFiturRow(idx)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Hapus Baris"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ══ BAGIAN D: Tabel Resources Needed (5 Baris Tetap) ══ */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#3E9463]" />
                      <span>D. Resources Needed (5 Kebutuhan Sumber Daya)</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      5 kategori sumber daya baku sesuai Template 3.1 untuk mendukung kesiapan eksekusi MVP.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-50">
                    5 Kategori Baku
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-[180px]">Jenis Resource (Baku)</th>
                        <th className="p-3 w-[220px]">Kebutuhan Spesifik</th>
                        <th className="p-3 w-[160px]">Owner / Sumber</th>
                        <th className="p-3 w-[130px]">Status Ketersediaan</th>
                        <th className="p-3">Gap dan Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resourcesList.map((res, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-3 align-top bg-gray-50/50">
                            <span className="font-bold text-gray-900 block">{res.label}</span>
                            <span className="text-[10px] text-gray-500 block mt-0.5 leading-tight">
                              {res.deskripsi}
                            </span>
                          </td>
                          <td className="p-2 align-top">
                            <Textarea
                              disabled={!canEdit}
                              rows={2}
                              placeholder={`Spesifikasi kebutuhan ${res.label.toLowerCase()}...`}
                              value={res.kebutuhanSpesifik}
                              onChange={(e) =>
                                handleUpdateResource(idx, "kebutuhanSpesifik", e.target.value)
                              }
                              className="text-xs bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              placeholder="Divisi / PIC sumber..."
                              value={res.ownerSumber}
                              onChange={(e) =>
                                handleUpdateResource(idx, "ownerSumber", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <select
                              disabled={!canEdit}
                              value={res.statusKetersediaan}
                              onChange={(e) =>
                                handleUpdateResource(idx, "statusKetersediaan", e.target.value)
                              }
                              className={`w-full h-8 px-2 text-xs rounded-lg font-bold border ${
                                res.statusKetersediaan === "Tersedia"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : res.statusKetersediaan === "Parsial"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : "bg-red-50 text-red-800 border-red-300"
                              }`}
                            >
                              <option value="Tersedia">🟢 Tersedia</option>
                              <option value="Parsial">🟡 Parsial</option>
                              <option value="Belum">🔴 Belum</option>
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <Textarea
                              disabled={!canEdit}
                              rows={2}
                              placeholder="Mitigasi kendala atau langkah pemenuhan..."
                              value={res.gapTindakLanjut}
                              onChange={(e) =>
                                handleUpdateResource(idx, "gapTindakLanjut", e.target.value)
                              }
                              className="text-xs bg-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ══ BAGIAN E: Tabel Metrik DFV (9 Baris Tetap) ══ */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#3E9463]" />
                      <span>E. Metrik, Threshold, dan Cara Pengukuran DFV (9 Parameter)</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Target terukur Desirability, Feasibility, dan Viability untuk validasi Product-Market Fit.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-50">
                    9 Parameter Baku
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5 w-[100px]">Validasi</th>
                        <th className="p-2.5 w-[180px]">Metrik (Baku)</th>
                        <th className="p-2.5 w-[130px]">Unit Ukuran</th>
                        <th className="p-2.5 w-[110px]">Baseline</th>
                        <th className="p-2.5 w-[120px]">Target</th>
                        <th className="p-2.5 w-[110px]">Threshold</th>
                        <th className="p-2.5 w-[160px]">Cara Pengukuran</th>
                        <th className="p-2.5 w-[120px]">PIC</th>
                        <th className="p-2.5 w-[140px]">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {metrikList.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-2.5 align-top bg-gray-50/50">
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
                          <td className="p-2.5 align-top font-bold text-gray-800 text-[11px]">
                            {m.metrik}
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.unitUkuran}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "unitUkuran", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.baseline}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "baseline", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.target}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "target", e.target.value)
                              }
                              className="text-xs h-8 bg-white font-semibold"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.threshold}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "threshold", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.caraPengukuran}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "caraPengukuran", e.target.value)
                              }
                              className="text-xs h-8 bg-white text-[11px]"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.pic}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "pic", e.target.value)
                              }
                              className="text-xs h-8 bg-white"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              disabled={!canEdit}
                              value={m.evidence}
                              onChange={(e) =>
                                handleUpdateMetrik(idx, "evidence", e.target.value)
                              }
                              className="text-xs h-8 bg-white text-[11px]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ══ BAGIAN F: Lembar Pengesahan 3 Pihak (PO, Coach, Promotor) ══ */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-[#3E9463]" />
                  <span>F. Lembar Pengesahan MVP Release Plan</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Tanda tangan digital 3 pihak: Disusun oleh Project Owner, diperiksa oleh Coach, dan disetujui oleh Promotor Inovasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Project Owner */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disusun Oleh
                      </span>
                      {ttdDisusun?.status === "signed" ? (
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
                      {ttdDisusun?.status === "signed" ? (
                        <>
                          <div className="font-bold text-gray-900">{ttdDisusun.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisusun.jabatan || "Project Owner"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisusun.unit || "PT Pegadaian"}</span>
                          </div>
                          {ttdDisusun.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={ttdDisusun.signatureImage}
                                alt="Tanda Tangan PO"
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
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDisusun?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === "po"}
                          onClick={() => handleRevokeSign("po")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === "po"}
                          onClick={() => openSignModal("po")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg PO</span>
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
                      {ttdDiperiksa?.status === "signed" ? (
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
                      {ttdDiperiksa?.status === "signed" ? (
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
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDiperiksa?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === "coach"}
                          onClick={() => handleRevokeSign("coach")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === "coach"}
                          onClick={() => openSignModal("coach")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Coach</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3. Promotor Inovasi */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disetujui Oleh
                      </span>
                      {ttdDisetujui?.status === "signed" ? (
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
                      {ttdDisetujui?.status === "signed" ? (
                        <>
                          <div className="font-bold text-gray-900">{ttdDisetujui.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisetujui.jabatan || "Promotor Inovasi"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{ttdDisetujui.unit || "PT Pegadaian"}</span>
                          </div>
                          {ttdDisetujui.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={ttdDisetujui.signatureImage}
                                alt="Tanda Tangan Promotor"
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
                            {promotorCharterName || "( Promotor Inovasi )"}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>Promotor Inovasi</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>PT Pegadaian</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {ttdDisetujui?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={signingRole === "promotor"}
                          onClick={() => handleRevokeSign("promotor")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={signingRole === "promotor"}
                          onClick={() => openSignModal("promotor")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Promotor</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tombol Simpan MVP Plan */}
            {canEdit && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold gap-2 h-11 px-8 rounded-xl shadow-sm text-xs cursor-pointer active:scale-98 transition-all"
                >
                  {saving ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : (
                    <Save className="h-4 w-4 text-[#F0C24B]" />
                  )}
                  <span>{saving ? "Menyimpan Plan..." : "Simpan MVP Release Plan"}</span>
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: BACKLOG & SPRINT (KANBAN EMBEDDED) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="backlog" className="space-y-4 mt-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <KanbanSquare className="h-5 w-5 text-[#0B3D2E]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">
                  Kanban Board &amp; Sprint Execution (Market Validation)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Eksekusi 7 kartu baku dan rekomendasi backlog Market Validation pada rangkaian sprint tim.
                </p>
              </div>
            </div>

            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={generatingBacklog}
                onClick={handleGenerateBacklog}
                className="border-[#3E9463] text-[#0B3D2E] hover:bg-[#EBF5EE] text-xs font-bold rounded-xl gap-2 h-8"
              >
                {generatingBacklog ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-[#3E9463]" />
                )}
                <span>{generatingBacklog ? "Menghasilkan..." : "Generate Ulang Rekomendasi Backlog"}</span>
              </Button>
            )}
          </div>

          <KanbanClient
            timId={timId}
            initialColumns={initialColumns}
            initialCards={initialCards}
            initialSprints={initialSprints}
            anggotaTim={teamMembers}
            canEdit={canEditKanban}
            currentUser={currentUser}
            phaseGateStatus={phaseGateStatus}
            tahapScope="market_validation"
          />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PMF & GO/NO-GO REPORT (TEMPLATE 3.2 LENGKAP) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="report" className="space-y-5 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-5">
            {/* ── 1. Ringkasan Rilis & Operasional MVP (Read-Only dari Kartu MVP Release) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-[#3E9463]" />
                      <span>1. Ringkasan Rilis &amp; Operasional MVP Pilot</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Data hasil peluncuran MVP di lapangan (tersinkronisasi dari kartu Kanban "MVP Release").
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-[#0B3D2E] bg-emerald-50">
                    Template 3.2
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50/70 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Versi MVP</span>
                    <span className="text-xs font-extrabold text-gray-900">
                      {initialData?.report?.mvpVersionDilaporkan || initialData?.plan?.mvpVersion || "v1.0-pilot"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Periode Rilis</span>
                    <span className="text-xs font-extrabold text-gray-900">
                      {formatDateIndo(initialData?.report?.periodeRilisMulai || initialData?.plan?.periodeReleaseMulai)} s.d.{" "}
                      {formatDateIndo(initialData?.report?.periodeRilisSelesai || initialData?.plan?.periodeReleaseSelesai)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Lokasi / Channel Rilis</span>
                    <span className="text-xs font-extrabold text-gray-900">
                      {initialData?.report?.lokasiChannelRilis || initialData?.plan?.channelRelease || "-"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Pengguna Aktif Aktual (Adopters)
                    </label>
                    <Input
                      disabled={!canEdit}
                      type="number"
                      value={reportForm.jumlahEarlyAdoptersAktual}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          jumlahEarlyAdoptersAktual: Number(e.target.value),
                        })
                      }
                      className="text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Keputusan Go / No-Go (Gerbang FMI)
                    </label>
                    <select
                      disabled={!canEdit}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-300 rounded-lg font-bold"
                      value={reportForm.keputusanGoNogo}
                      onChange={(e) =>
                        setReportForm({ ...reportForm, keputusanGoNogo: e.target.value })
                      }
                    >
                      <option value="go_ke_fmi">🟢 GO — Lanjut ke Sidang Forum Manajemen Inovasi (FMI)</option>
                      <option value="iterasi_mvp">🟡 ITERASI — Lakukan sprint perbaikan MVP</option>
                      <option value="hold">⏸️ HOLD — Tunda keputusan</option>
                      <option value="stop">🔴 STOP — Dihentikan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Ringkasan Aktivitas Rilis &amp; Hasil Pilot
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={3}
                    placeholder="Deskripsi jalannya pilot di lapangan, respons user, angka adopsi..."
                    value={reportForm.ringkasanAktivitasRilis}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, ringkasanAktivitasRilis: e.target.value })
                    }
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kendala Utama &amp; Mitigasi
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Kendala teknis, operasional, atau adopsi selama pilot dan langkah perbaikannya..."
                    value={reportForm.kendalaUtama}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, kendalaUtama: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── 2. Log Aktivitas Rilis & Evidence (Read-Only dari mvReleaseLog) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#3E9463]" />
                  <span>2. Log Aktivitas Rilis &amp; Evidence (Release Log)</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Riwayat tanggal, output, dan evidence kegiatan peluncuran MVP.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {releaseLogs.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[110px]">Tanggal</th>
                          <th className="p-2.5 w-[200px]">Aktivitas</th>
                          <th className="p-2.5 w-[160px]">Output</th>
                          <th className="p-2.5 w-[160px]">Data / Evidence</th>
                          <th className="p-2.5 w-[100px]">PIC</th>
                          <th className="p-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {releaseLogs.map((log: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/70">
                            <td className="p-2.5 font-mono text-[11px]">{formatDateIndo(log.tanggal)}</td>
                            <td className="p-2.5 font-bold text-gray-900">{log.aktivitas}</td>
                            <td className="p-2.5 text-gray-700">{log.output || "-"}</td>
                            <td className="p-2.5 text-gray-700">{log.dataEvidence || "-"}</td>
                            <td className="p-2.5 text-gray-700">{log.pic || "-"}</td>
                            <td className="p-2.5 text-gray-500">{log.catatan || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Belum ada release log yang disimpan dari kartu Kanban "MVP Release".
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 3. Sprint Review — Outcome (Read-Only dari sprintReview) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#3E9463]" />
                  <span>3. Sprint Review — Outcome</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Demonstrasi luaran, feedback reviewer, dan value yang dihasilkan pada sprint Market Validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {sprintReviews.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[100px]">Sprint / Tgl</th>
                          <th className="p-2.5 w-[180px]">Demo / Deliverable</th>
                          <th className="p-2.5 w-[180px]">Feedback Reviewer</th>
                          <th className="p-2.5 w-[160px]">Value Dihasilkan</th>
                          <th className="p-2.5 w-[140px]">Learning</th>
                          <th className="p-2.5">Questions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {sprintReviews.map((sr: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/70">
                            <td className="p-2.5">
                              <span className="font-bold text-[#0B3D2E] block">Sprint {sr.sprintNumber}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {formatDateIndo(sr.tanggalReview)}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-800">{sr.demo || sr.demoOutput || "-"}</td>
                            <td className="p-2.5 text-gray-800">{sr.feedback || sr.ringkasanPencapaian || "-"}</td>
                            <td className="p-2.5 text-gray-800 font-semibold">{sr.value || "-"}</td>
                            <td className="p-2.5 text-gray-600">{sr.pembelajaran || "-"}</td>
                            <td className="p-2.5 text-gray-600">{sr.questions || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Belum ada data Sprint Review. Lengkapi review saat menyelesaikan sprint di Tab Backlog &amp; Sprint.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 4. Sprint Review — Backlog (Read-Only dari allTeamCards) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <KanbanSquare className="h-4 w-4 text-[#3E9463]" />
                  <span>4. Sprint Review — Backlog</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Daftar backlog kartu kerja yang diverifikasi dan diselesaikan pada iterasi Market Validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {allTeamCards.filter((c: any) => c.tahap === "market_validation" && c.sprintNumber).length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[80px]">Sprint</th>
                          <th className="p-2.5 w-[250px]">Backlog yang Diverifikasi</th>
                          <th className="p-2.5 w-[110px]">Status</th>
                          <th className="p-2.5 w-[200px]">Acceptance Criteria / Hasil</th>
                          <th className="p-2.5">Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {allTeamCards
                          .filter((c: any) => c.tahap === "market_validation" && c.sprintNumber)
                          .map((card: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50/70">
                              <td className="p-2.5 font-bold text-[#0B3D2E]">Sprint {card.sprintNumber}</td>
                              <td className="p-2.5 font-bold text-gray-900">{card.judul}</td>
                              <td className="p-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    card.statusKolom === "Done"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {card.statusKolom}
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-600">{card.acceptanceCriteria || "-"}</td>
                              <td className="p-2.5 text-gray-500">{card.ownerAnggotaId || "Team"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Belum ada backlog yang dialokasikan pada sprint Market Validation.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 5. Sprint Retrospective (Read-Only dari sprintReview) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#3E9463]" />
                  <span>5. Sprint Retrospective</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pembelajaran tim secara kualitatif: Hal yang dilanjutkan (Continue), dihentikan (Stop), dan dimulai (Start).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {sprintReviews.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[80px]">Sprint</th>
                          <th className="p-2.5 w-[220px]">Continue (Pertahankan)</th>
                          <th className="p-2.5 w-[200px]">Stop (Hentikan)</th>
                          <th className="p-2.5 w-[200px]">Start (Mulai Baru)</th>
                          <th className="p-2.5">Owner / Target Next Sprint</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {sprintReviews.map((sr: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/70">
                            <td className="p-2.5 font-bold text-[#0B3D2E]">Sprint {sr.sprintNumber}</td>
                            <td className="p-2.5 text-emerald-800">{sr.continueItems || "-"}</td>
                            <td className="p-2.5 text-red-800">{sr.stopItems || "-"}</td>
                            <td className="p-2.5 text-amber-800">{sr.startItems || "-"}</td>
                            <td className="p-2.5 text-gray-700 font-semibold">{sr.ownerTargetSprint || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Belum ada data Retrospective sprint.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 6. Hasil Pengukuran DFV dan Traction (9 Baris Tetap dari hasilMetrik) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#3E9463]" />
                  <span>6. Hasil Pengukuran DFV dan Traction (9 Parameter Baku)</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Capaian aktual metrik Desirability, Feasibility, dan Viability hasil uji coba pasar.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {hasilMetrik.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[110px]">Validasi</th>
                          <th className="p-2.5 w-[180px]">Metrik</th>
                          <th className="p-2.5 w-[110px]">Target</th>
                          <th className="p-2.5 w-[110px]">Hasil Aktual</th>
                          <th className="p-2.5 w-[90px] text-center">% Capai</th>
                          <th className="p-2.5 w-[90px] text-center">Status</th>
                          <th className="p-2.5">Learning / Enhancement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {hasilMetrik.map((m: any, idx: number) => {
                          const isLolos = m.status === "lolos" || (m.persenTercapai && m.persenTercapai >= 70);
                          return (
                            <tr key={idx} className="hover:bg-gray-50/70">
                              <td className="p-2.5 font-bold text-gray-700">{m.validasi}</td>
                              <td className="p-2.5 font-semibold text-gray-900">{m.metrik}</td>
                              <td className="p-2.5 text-gray-600">{m.target || "-"}</td>
                              <td className="p-2.5 font-bold text-gray-900">{m.hasilAktual || "-"}</td>
                              <td className="p-2.5 text-center font-bold">
                                {m.persenTercapai !== null ? `${m.persenTercapai}%` : "-"}
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={
                                    isLolos
                                      ? "bg-emerald-100 text-emerald-800 border-none text-[10px]"
                                      : "bg-amber-100 text-amber-800 border-none text-[10px]"
                                  }
                                >
                                  {isLolos ? "Lolos" : "Belum"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-gray-600 text-[11px]">{m.learning || m.enhancement || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Hasil pengukuran DFV belum diisi dari kartu Kanban "Market Testing (ukur metrik DFV)".
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 7. Rekapitulasi Ketercapaian DFV (3 Baris Tetap dari dfv) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-[#3E9463]" />
                  <span>7. Rekapitulasi Ketercapaian DFV</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Rata-rata persentase capaian per dimensi validasi terhadap threshold standar (70%).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {dfvRekapitulasi.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#EBF5EE] text-[#0B3D2E] font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5 w-[160px]">Kategori DFV</th>
                          <th className="p-2.5 w-[130px] text-center">Rata-Rata Capai</th>
                          <th className="p-2.5 w-[110px] text-center">Threshold</th>
                          <th className="p-2.5 w-[120px] text-center">Status Kelolosan</th>
                          <th className="p-2.5">Catatan Keputusan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {dfvRekapitulasi.map((r: any, idx: number) => {
                          const isLolos = r.status === "lolos" || r.rataRataKetercapaian >= (r.threshold || 70);
                          return (
                            <tr key={idx} className="hover:bg-gray-50/70">
                              <td className="p-2.5 font-bold text-gray-900">{r.kategoriDfv}</td>
                              <td className="p-2.5 text-center font-extrabold text-gray-900">
                                {r.rataRataKetercapaian}%
                              </td>
                              <td className="p-2.5 text-center text-gray-500">{r.threshold || 70}%</td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={
                                    isLolos
                                      ? "bg-emerald-100 text-emerald-800 border-none text-[10px]"
                                      : "bg-amber-100 text-amber-800 border-none text-[10px]"
                                  }
                                >
                                  {isLolos ? "Lolos" : "Belum Lolos"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-gray-600">{r.catatanKeputusan || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                    Rekapitulasi DFV belum diisi dari kartu Kanban "Analisis hasil &amp; isi Laporan MV".
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 8. Evaluasi PMF & Rencana Tindak Lanjut ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#3E9463]" />
                  <span>8. Evaluasi Product-Market Fit &amp; Rekomendasi Sidang FMI</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Kesimpulan kualitatif kesesuaian produk terhadap kebutuhan pasar dan masukan promotor inovasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kesimpulan Product-Market Fit (PMF)
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Apakah solusi terbukti diinginkan pasar dan layak diskalakan..."
                    value={reportForm.kesimpulanPmf}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, kesimpulanPmf: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Rekomendasi Iterasi
                    </label>
                    <Textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Hal-hal yang perlu disempurnakan pada fitur atau proses..."
                      value={reportForm.rekomendasiIterasi}
                      onChange={(e) =>
                        setReportForm({ ...reportForm, rekomendasiIterasi: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Rencana MVP Tahap Berikutnya
                    </label>
                    <Textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Rencana perluasan skala rilis atau scaling operasional..."
                      value={reportForm.rencanaMvpBerikutnya}
                      onChange={(e) =>
                        setReportForm({ ...reportForm, rencanaMvpBerikutnya: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Rekomendasi Promotor / Sponsor Inovasi
                  </label>
                  <Textarea
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Catatan dukungan dari promotor inovasi untuk sidang FMI..."
                    value={reportForm.rekomendasiPromotorSponsor}
                    onChange={(e) =>
                      setReportForm({
                        ...reportForm,
                        rekomendasiPromotorSponsor: e.target.value,
                      })
                    }
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── 9. Dokumen & Bukti Preliminary Review SME (Read-Only) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-[#3E9463]" />
                      <span>9. Dokumen &amp; Catatan Preliminary Review SME</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Daftar dokumen review dan masukan dari Innovation Coach / SME sebelum sidang FMI.
                    </CardDescription>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    Dikelola via Kartu Kanban &ldquo;Preliminary Review (SME)&rdquo;
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Dokumen Files Uploaded */}
                {Array.isArray(initialData?.report?.buktiPendukung) &&
                initialData.report.buktiPendukung.filter((b: any) => b.type === "dokumen_preliminary_review").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <p className="text-[11px] text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                    Belum ada dokumen preliminary review yang diunggah. Unggah dokumen review melalui kartu Kanban &ldquo;Preliminary Review (SME)&rdquo; dan klik &ldquo;Simpan ke Laporan MV&rdquo;.
                  </p>
                )}

                {/* Catatan Review SME Lainnya */}
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
                                <span>Reviewer: {b.reviewer || "SME / Coach"}</span>
                                <span className="text-gray-400 font-normal">{b.tanggal ? formatDateIndo(b.tanggal) : ""}</span>
                              </div>
                              <p className="text-gray-600 text-[11px] mt-1 whitespace-pre-wrap">{b.content || b.catatan || ""}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* ── 10. Lembar Pengesahan Laporan MV (3 Pihak: PO, Coach, Promotor) ── */}
            <Card className="rounded-2xl border-gray-200/80 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-[#3E9463]" />
                  <span>10. Lembar Pengesahan Laporan Market Validation</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pengesahan formal hasil pasar untuk prasyarat maju ke sidang Forum Manajemen Inovasi (FMI).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Project Owner */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disusun Oleh (PO)
                      </span>
                      {reportTtdDisusun?.status === "signed" ? (
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
                      {reportTtdDisusun?.status === "signed" ? (
                        <>
                          <div className="font-bold text-gray-900">{reportTtdDisusun.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisusun.jabatan || "Project Owner"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisusun.unit || "PT Pegadaian"}</span>
                          </div>
                          {reportTtdDisusun.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={reportTtdDisusun.signatureImage}
                                alt="Tanda Tangan PO"
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
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {reportTtdDisusun?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={reportSigningRole === "po"}
                          onClick={() => handleRevokeReportSignature("po")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={reportSigningRole === "po"}
                          onClick={() => openReportSignModal("po")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg PO</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 2. Innovation Coach */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Diperiksa Oleh (Coach)
                      </span>
                      {reportTtdDiperiksa?.status === "signed" ? (
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
                      {reportTtdDiperiksa?.status === "signed" ? (
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
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {reportTtdDiperiksa?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={reportSigningRole === "coach"}
                          onClick={() => handleRevokeReportSignature("coach")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Tanda Tangan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={reportSigningRole === "coach"}
                          onClick={() => openReportSignModal("coach")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Tandatangani sbg Coach</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3. Promotor Inovasi */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Disetujui Oleh (Promotor)
                      </span>
                      {reportTtdDisetujui?.status === "approved" || reportTtdDisetujui?.status === "signed" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          <span>Disetujui</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 italic">
                          Belum Disetujui
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      {reportTtdDisetujui?.status === "approved" || reportTtdDisetujui?.status === "signed" ? (
                        <>
                          <div className="font-bold text-gray-900">{reportTtdDisetujui.nama}</div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisetujui.jabatan || "Promotor Inovasi"}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>{reportTtdDisetujui.unit || "PT Pegadaian"}</span>
                          </div>
                          {reportTtdDisetujui.signatureImage && (
                            <div className="bg-white p-1 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[130px] my-2">
                              <img
                                src={reportTtdDisetujui.signatureImage}
                                alt="Tanda Tangan Promotor"
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
                            {promotorCharterName || "( Promotor Inovasi )"}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>Promotor Inovasi</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span>PT Pegadaian</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/60">
                      {reportTtdDisetujui?.status === "approved" || reportTtdDisetujui?.status === "signed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={reportSigningRole === "promotor"}
                          onClick={() => handleRevokeReportSignature("promotor")}
                          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Batalkan Persetujuan</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={reportSigningRole === "promotor"}
                          onClick={() => openReportSignModal("promotor")}
                          className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8 rounded-lg shadow-2xs"
                        >
                          <Stamp className="h-3.5 w-3.5 mr-1" />
                          <span>Setujui sbg Promotor</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            {canEdit && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold gap-2 h-11 px-8 rounded-xl shadow-sm text-xs cursor-pointer active:scale-98 transition-all"
                >
                  {saving ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : (
                    <Save className="h-4 w-4 text-[#F0C24B]" />
                  )}
                  <span>{saving ? "Menyimpan..." : "Simpan Laporan Market Validation"}</span>
                </Button>
              </div>
            )}
          </form>
        </TabsContent>
      </Tabs>

      {/* Signature Pad Modal for MVP Plan */}
      <SignaturePadModal
        isOpen={sigModal.isOpen}
        onClose={() => setSigModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveSignature}
        title={`Tanda Tangan Digital MVP Plan — ${sigModal.roleName}`}
        roleName={sigModal.roleName}
        userName={sigModal.userName}
      />

      {/* Signature Pad Modal for MVP Report */}
      <SignaturePadModal
        isOpen={reportSigModal.isOpen}
        onClose={() => setReportSigModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveReportSignature}
        title={`Tanda Tangan Digital Laporan MV — ${reportSigModal.roleName}`}
        roleName={reportSigModal.roleName}
        userName={reportSigModal.userName}
      />
    </div>
  );
}
