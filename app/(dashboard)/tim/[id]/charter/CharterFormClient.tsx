"use client";

import { useState } from "react";
import Link from "next/link";
import {
  saveCharterAction,
  approveCharterAction,
  revokeCharterApprovalAction,
  signCharterAsPoAction,
  revokeCharterPoSignAction,
  signCharterAsCoachAction,
  revokeCharterCoachSignAction,
  RoleAssignmentItem,
} from "@/app/actions/charter";
import {
  saveCharterSprintsAction,
  updateSprintCountAction,
} from "@/app/actions/sprint";
import { toast } from "@/components/ui/ToastProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserSelectCombobox, SelectedUser } from "@/components/user/UserSelectCombobox";
import {
  Save,
  CheckCircle,
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  Plus,
  UserCheck,
  Building2,
  Briefcase,
  ShieldCheck,
  Lock,
  Stamp,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  Settings2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Target,
  KanbanSquare,
  Download,
  FileText,
} from "lucide-react";
import { SignaturePadModal } from "@/components/ui/SignaturePad";
import { formatDateIndo } from "@/lib/utils";
import { RoleProposalHintTooltip } from "./RoleProposalHintTooltip";
import { SectionInfo } from "@/components/ui/SectionInfo";

interface RoleConfig {
  roleCode: RoleAssignmentItem['roleCode'];
  title: string;
  badge: string;
  badgeColor: string;
  accountability: string;
  isMulti: boolean;
}

const ROLES_CONFIG: RoleConfig[] = [
  {
    roleCode: 'sponsor',
    title: 'Sponsor',
    badge: 'Mandat & Budget',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    accountability: 'Memberikan mandat strategis, persetujuan alokasi anggaran, dan proteksi politis inisiatif.',
    isMulti: false,
  },
  {
    roleCode: 'promotor',
    title: 'Promotor',
    badge: 'Decision Maker & Approver',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accountability: 'Memeriksa & menyetujui Innovation Charter, mengawal keselarasan bisnis unit, dan evaluasi hasil inkubasi.',
    isMulti: false,
  },
  {
    roleCode: 'project_owner',
    title: 'Project Owner',
    badge: 'Leader & Eksekutor',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accountability: 'Memimpin eksekusi harian tim, mengelola Kanban board, dan menyusun pengajuan anggaran/LPJ.',
    isMulti: false,
  },
  {
    roleCode: 'inisiator',
    title: 'Inisiator',
    badge: 'Konseptor Solusi',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    accountability: 'Penggagas ide awal proposal PIA dan menjaga kemurnian visi solusi nilai tambah inovasi.',
    isMulti: true,
  },
  {
    roleCode: 'co_creator',
    title: 'Co-creator',
    badge: 'Core Team',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    accountability: 'Anggota inti tim dalam pengembangan prototipe, customer testing, dan iterasi sprint.',
    isMulti: true,
  },
  {
    roleCode: 'coach',
    title: 'Innovation Coach',
    badge: 'Metodologi & Fasilitator',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accountability: 'Membimbing penerapan metodologi design thinking/lean startup dan memfasilitasi sprint review berkala.',
    isMulti: false,
  },
  {
    roleCode: 'sme',
    title: 'Collaborator / SME',
    badge: 'Domain Expert',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    accountability: 'Memberikan keahlian domain spesifik (IT Architecture, Legal/Compliance, Finance, Risk, Operasional).',
    isMulti: true,
  },
];

export function CharterFormClient({
  timId,
  initialData,
  initialRolesData,
  initialSprints = [],
  autoFilledFields = [],
  usulanPromotorHint = null,
  usulanPoHint = null,
  canEdit = true,
  canApprove = false,
  canSignPo = false,
  canSignCoach = false,
  canEditRoles = false,
  canManageSprintCount = false,
  currentUser,
}: {
  timId: string;
  initialData: any;
  initialRolesData?: any;
  initialSprints?: any[];
  autoFilledFields?: string[];
  usulanPromotorHint?: string | null;
  usulanPoHint?: string | null;
  canEdit?: boolean;
  canApprove?: boolean;
  canSignPo?: boolean;
  canSignCoach?: boolean;
  canEditRoles?: boolean;
  canManageSprintCount?: boolean;
  currentUser?: any;
}) {
  const [formData, setFormData] = useState({
    projectMission: initialData?.projectMission || "",
    customerEarlyAdopters: initialData?.customerEarlyAdopters || "",
    contextAreaBantuan: initialData?.contextAreaBantuan || "",
    problemWorthSolving: initialData?.problemWorthSolving || "",
    hmw: initialData?.hmw || "",
    opportunityStatement: initialData?.opportunityStatement || "",
    businessOpportunity: initialData?.businessOpportunity || "",
    solusiAwal: initialData?.solusiAwal || "",
    desirabilityHypothesis: initialData?.desirabilityHypothesis || "",
    feasibilityHypothesis: initialData?.feasibilityHypothesis || "",
    viabilityHypothesis: initialData?.viabilityHypothesis || "",
    linkProposal: initialData?.linkProposal || "",
    ritmeKerja: initialData?.ritmeKerja || "",
    pacingMonitoring: initialData?.pacingMonitoring || "",
    kebutuhanDukungan: initialData?.kebutuhanDukungan || "",
    risikoAwal: initialData?.risikoAwal || "",
  });

  const [ttdDisusun, setTtdDisusun] = useState<any | null>(initialData?.ttdDisusun || null);
  const [ttdDiperiksa, setTtdDiperiksa] = useState<any | null>(initialData?.ttdDiperiksa || null);
  const [ttdDisetujui, setTtdDisetujui] = useState<any | null>(initialData?.ttdDisetujui || null);

  // Initialize role assignments from database
  const assignmentsList = initialRolesData?.assignments || [];
  const anggotaList = initialRolesData?.anggotaTim || [];

  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentItem[]>(() => {
    const items: RoleAssignmentItem[] = [];

    for (const config of ROLES_CONFIG) {
      const matched = assignmentsList.filter((a: any) => a.roleCode === config.roleCode);

      if (matched.length > 0) {
        matched.forEach((assign: any, idx: number) => {
          const anggota = anggotaList.find((ang: any) => ang.userId === assign.userId);
          items.push({
            id: `init-${config.roleCode}-${idx}-${assign.userId}`,
            roleCode: config.roleCode,
            userId: assign.userId,
            userName: assign.userName || "",
            userEmail: assign.userEmail || "",
            jabatan: anggota?.jabatan || "",
            unitKerja: anggota?.unitKerja || "",
          });
        });
      } else {
        items.push({
          id: `empty-${config.roleCode}-${Math.random().toString(36).substring(2, 7)}`,
          roleCode: config.roleCode,
          userId: null,
          userName: "",
          userEmail: "",
          jabatan: "",
          unitKerja: "",
        });
      }
    }

    return items;
  });

  const [sprints, setSprints] = useState<any[]>(() => {
    if (initialSprints && initialSprints.length > 0) {
      return initialSprints.map((s) => ({
        ...s,
        tanggalMulaiRencana: s.tanggalMulaiRencana
          ? new Date(s.tanggalMulaiRencana).toISOString().split("T")[0]
          : "",
        tanggalSelesaiRencana: s.tanggalSelesaiRencana
          ? new Date(s.tanggalSelesaiRencana).toISOString().split("T")[0]
          : "",
      }));
    }
    return [
      { nomorSprint: 1, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Problem Validation & Setup" },
      { nomorSprint: 2, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Solution Exploration & Prototyping" },
      { nomorSprint: 3, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Customer Validation & Testing" },
      { nomorSprint: 4, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "MVP Development & Pilot Prep" },
      { nomorSprint: 5, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Market Validation & Pilot Execution" },
      { nomorSprint: 6, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Pitch & FMI Preparation" },
    ];
  });

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [targetSprintCount, setTargetSprintCount] = useState(sprints.length);
  const [sprintAlasan, setSprintAlasan] = useState("");
  const [savingSprintCount, setSavingSprintCount] = useState(false);

  // Collapsible Sections State (All 4 collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    roles: false,
    problem: false,
    solution: false,
    governance: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-created Accounts Dialog State
  const [newlyCreatedAccounts, setNewlyCreatedAccounts] = useState<
    Array<{ nama: string; email: string; roleName: string }> | null
  >(null);

  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigPoModalOpen, setSigPoModalOpen] = useState(false);
  const [sigCoachModalOpen, setSigCoachModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = Boolean(
    currentUser?.globalRoles?.some((r: string) => ["super_admin", "admin_ic", "admin"].includes(r))
  );
  const isCoach = Boolean(
    currentUser?.timRoles?.some((tr: any) => tr.timId === timId && tr.roleCode === "coach") ||
    currentUser?.globalRoles?.includes("coach")
  );
  const isRolesEditable = Boolean(canEdit && canEditRoles && (isAdmin || isCoach));

  const isReadOnly = !canEdit;
  const isRolesReadOnly = Boolean(isReadOnly || !isRolesEditable);

  const handleChange = (field: string, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSprintChange = (nomorSprint: number, field: string, value: string) => {
    if (isReadOnly) return;
    setSprints((prev) =>
      prev.map((s) => (s.nomorSprint === nomorSprint ? { ...s, [field]: value } : s))
    );
  };

  const handleApplySprintCountChange = async () => {
    if (!sprintAlasan.trim()) {
      toast.error("Alasan perubahan jumlah sprint wajib diisi.", "Validasi Diperlukan");
      return;
    }
    setSavingSprintCount(true);
    const res = await updateSprintCountAction(timId, targetSprintCount, sprintAlasan.trim());
    if (res.success) {
      setIsSprintModalOpen(false);
      setSprintAlasan("");
      toast.success(`Jumlah sprint berhasil diubah menjadi ${targetSprintCount} sprint!`, "Konfigurasi Sprint");
      if (targetSprintCount > sprints.length) {
        const added = [];
        for (let i = sprints.length + 1; i <= targetSprintCount; i++) {
          added.push({
            nomorSprint: i,
            tanggalMulaiRencana: "",
            tanggalSelesaiRencana: "",
            tujuan: `Sprint ${i}`,
          });
        }
        setSprints([...sprints, ...added]);
      } else {
        setSprints(sprints.slice(0, targetSprintCount));
      }
    } else {
      toast.error(res.error || "Gagal mengubah jumlah sprint.", "Gagal Mengubah Sprint");
    }
    setSavingSprintCount(false);
  };

  const handleAddPerson = (roleCode: RoleAssignmentItem['roleCode']) => {
    if (isRolesReadOnly) return;
    const newItem: RoleAssignmentItem = {
      id: `new-${roleCode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      roleCode,
      userId: null,
      userName: "",
      userEmail: "",
      jabatan: "",
      unitKerja: "",
    };
    setRoleAssignments((prev) => [...prev, newItem]);
  };

  const handleRemovePerson = (id?: string) => {
    if (isRolesReadOnly || !id) return;
    setRoleAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePersonUserChange = (id: string, user: SelectedUser | null) => {
    if (isRolesReadOnly) return;
    setRoleAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            userId: user ? user.id : null,
            userName: user ? user.nama : "",
            userEmail: user ? user.email : "",
          };
        }
        return item;
      })
    );
  };

  const handlePersonDetailChange = (
    id: string,
    field: 'jabatan' | 'unitKerja',
    value: string
  ) => {
    if (isRolesReadOnly) return;
    setRoleAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setStatusMsg(null);

    const [resCharter, resSprints] = await Promise.all([
      saveCharterAction(timId, formData, isRolesEditable ? roleAssignments : undefined),
      saveCharterSprintsAction(
        timId,
        sprints.map((s) => ({
          nomorSprint: s.nomorSprint,
          tanggalMulaiRencana: s.tanggalMulaiRencana || null,
          tanggalSelesaiRencana: s.tanggalSelesaiRencana || null,
          tujuan: s.tujuan || null,
        }))
      ),
    ]);

    if (resCharter.success && resSprints.success) {
      if (resCharter.createdAccounts && resCharter.createdAccounts.length > 0) {
        setNewlyCreatedAccounts(resCharter.createdAccounts);
      }

      if (resCharter.updatedRolesData?.assignments) {
        const newItems: RoleAssignmentItem[] = [];
        for (const config of ROLES_CONFIG) {
          const matched = resCharter.updatedRolesData.assignments.filter(
            (a: any) => a.roleCode === config.roleCode
          );
          if (matched.length > 0) {
            matched.forEach((assign: any, idx: number) => {
              const anggota = resCharter.updatedRolesData?.anggotaTim?.find(
                (ang: any) => ang.userId === assign.userId
              );
              newItems.push({
                id: `updated-${config.roleCode}-${idx}-${assign.userId}`,
                roleCode: config.roleCode,
                userId: assign.userId,
                userName: assign.userName || "",
                userEmail: assign.userEmail || "",
                jabatan: anggota?.jabatan || "",
                unitKerja: anggota?.unitKerja || "",
              });
            });
          } else {
            // ALWAYS ensure every role has at least 1 input row available
            newItems.push({
              id: `empty-${config.roleCode}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              roleCode: config.roleCode,
              userId: null,
              userName: "",
              userEmail: "",
              jabatan: "",
              unitKerja: "",
            });
          }
        }
        setRoleAssignments(newItems);
      }

      const successNotice = isRolesEditable
        ? "Innovation Charter & Penugasan Tim berhasil disimpan!"
        : "Innovation Charter berhasil disimpan!";
      toast.success(successNotice, "Penyimpanan Berhasil");
      setStatusMsg({
        type: "success",
        text: successNotice,
      });
    } else {
      const errMsg = resCharter.error || resSprints.error || "Gagal menyimpan Charter.";
      toast.error(errMsg, "Gagal Menyimpan");
      setStatusMsg({
        type: "error",
        text: errMsg,
      });
    }
    setSaving(false);
  };

  const handleSaveSignature = async (dataUrl: string) => {
    setApproving(true);
    setStatusMsg(null);

    const res = await approveCharterAction(timId, dataUrl);
    if (res.success && res.ttdDisetujui) {
      setTtdDisetujui(res.ttdDisetujui);
      setSigModalOpen(false);
      toast.success("Innovation Charter berhasil disetujui & ditandatangani secara formal oleh Promotor!", "Persetujuan Berhasil");
      setStatusMsg({
        type: "success",
        text: "Innovation Charter berhasil disetujui secara formal oleh Promotor!",
      });
    } else {
      const errMsg = res.error || "Gagal menyetujui Innovation Charter.";
      toast.error(errMsg, "Gagal Menyetujui");
      setStatusMsg({ type: "error", text: errMsg });
    }
    setApproving(false);
  };

  const handleRevokeApproval = async () => {
    if (!confirm("Batalkan persetujuan formal Innovation Charter ini?")) return;
    setApproving(true);
    setStatusMsg(null);

    const res = await revokeCharterApprovalAction(timId);
    if (res.success) {
      setTtdDisetujui(null);
      toast.info("Persetujuan formal Innovation Charter telah dibatalkan untuk revisi tim.", "Persetujuan Dibatalkan");
      setStatusMsg({
        type: "success",
        text: "Persetujuan formal Innovation Charter telah dibatalkan untuk revisi tim.",
      });
    } else {
      const errMsg = res.error || "Gagal membatalkan persetujuan.";
      toast.error(errMsg, "Gagal Membatalkan");
      setStatusMsg({ type: "error", text: errMsg });
    }
    setApproving(false);
  };

  // ── PO Sign / Revoke ──────────────────────────────────────────────────────
  const handleSavePoSignature = async (dataUrl: string) => {
    setApproving(true);
    const res = await signCharterAsPoAction(timId, dataUrl);
    if (res.success && res.ttdDisusun) {
      setTtdDisusun(res.ttdDisusun);
      setSigPoModalOpen(false);
      toast.success("Innovation Charter berhasil ditandatangani oleh Project Owner!", "Tanda Tangan PO Tersimpan");
    } else {
      toast.error(res.error || "Gagal menandatangani Charter sebagai PO.", "Gagal");
    }
    setApproving(false);
  };

  const handleRevokePoSign = async () => {
    if (!confirm("Batalkan tanda tangan Project Owner dari Innovation Charter ini?")) return;
    setApproving(true);
    const res = await revokeCharterPoSignAction(timId);
    if (res.success) {
      setTtdDisusun(null);
      toast.info("Tanda tangan Project Owner telah dibatalkan.", "Tanda Tangan Dibatalkan");
    } else {
      toast.error(res.error || "Gagal membatalkan tanda tangan PO.", "Gagal");
    }
    setApproving(false);
  };

  // ── Coach Sign / Revoke ───────────────────────────────────────────────────
  const handleSaveCoachSignature = async (dataUrl: string) => {
    setApproving(true);
    const res = await signCharterAsCoachAction(timId, dataUrl);
    if (res.success && res.ttdDiperiksa) {
      setTtdDiperiksa(res.ttdDiperiksa);
      setSigCoachModalOpen(false);
      toast.success("Innovation Charter berhasil ditandatangani oleh Innovation Coach!", "Tanda Tangan Coach Tersimpan");
    } else {
      toast.error(res.error || "Gagal menandatangani Charter sebagai Coach.", "Gagal");
    }
    setApproving(false);
  };

  const handleRevokeCoachSign = async () => {
    if (!confirm("Batalkan tanda tangan Innovation Coach dari Innovation Charter ini?")) return;
    setApproving(true);
    const res = await revokeCharterCoachSignAction(timId);
    if (res.success) {
      setTtdDiperiksa(null);
      toast.info("Tanda tangan Innovation Coach telah dibatalkan.", "Tanda Tangan Dibatalkan");
    } else {
      toast.error(res.error || "Gagal membatalkan tanda tangan Coach.", "Gagal");
    }
    setApproving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Action Header: Title, Status, and Export PDF Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-white to-purple-50/20 rounded-2xl border border-emerald-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#0F5132] bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
              Template 1 Juklak
            </span>
            <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-1.5">
              <span>Innovation Setup &amp; Stakeholder Alignment</span>
              <SectionInfo
                title="Template 1: Innovation Setup and Stakeholder Alignment"
                text="Memastikan tim inovator memiliki role, mandat, milestone, backlog, serta dukungan stakeholder yang jelas sebelum Customer Validation dan Market Validation."
              />
            </h1>
          </div>
          <p className="text-xs text-gray-500">
            Penetapan mandat inisiatif, struktur peran tim, milestone sprint 12 minggu, dan otorisasi formal Promotor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/pdf/charter/${timId}`}
            target="_blank"
            rel="noopener noreferrer"
            download={`Innovation-Charter-${timId}.pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition-all cursor-pointer hover:shadow-xs"
            title="Unduh dokumen resmi Template 1 Innovation Charter format PDF"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>📄 Unduh PDF Innovation Charter</span>
          </a>

          {!isReadOnly && (
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold px-4 h-9 rounded-xl shadow-2xs gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Simpan Perubahan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Read-Only Notice Banner for Promotor / Viewer */}
      {isReadOnly && (
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <strong>Mode Tinjauan & Persetujuan (Read-Only)</strong> &mdash; Anda dapat meninjau isi komitmen tim dan memberikan persetujuan formal melalui tombol tanda tangan di bawah.
            </div>
          </div>
        </div>
      )}

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs ${
            statusMsg.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 0: STRUKTUR ROLE & AKUNTABILITAS TIM (MULTI-PERSON SUPPORT) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden hover:border-[#5142D6]/40 transition-all">
        <CardHeader
          onClick={() => toggleSection("roles")}
          className="bg-gradient-to-r from-[#5142D6]/5 via-white to-[#5142D6]/5 border-b border-gray-100 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/80 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#5142D6]/10 text-[#5142D6] border border-[#5142D6]/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Struktur Role &amp; Akuntabilitas Tim</span>
                  <SectionInfo
                    title="Template 1 — Bagian 0: Struktur Role & Akuntabilitas Tim"
                    text="Penugasan peran dan akuntabilitas resmi: Sponsor (Menetapkan arah, legitimasi, dan dukungan sumber daya), Promotor (Menjadi calon rumah inovasi, memberi perspektif bisnis, akses, dan dukungan operasional), Project Owner (Memimpin eksekusi harian tim, mengelola Kanban board, dan pengajuan anggaran/LPJ), Inisiator (Penggagas ide awal proposal PIA dan menjaga visi solusi), Co-creator (Anggota inti pengembangan prototipe, customer testing, dan iterasi sprint), Innovation Coach (Membimbing metodologi design thinking/lean startup dan fasilitasi sprint review), dan Collaborator/SME (Memberikan keahlian domain spesifik)."
                  />
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pilih atau buat akun pengguna untuk setiap peran tim (Inisiator, Co-creators, SME, Promotor, PO, Coach, Sponsor).
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5142D6]/10 text-[#5142D6] text-xs font-bold border border-[#5142D6]/20">
                <UserCheck className="h-3.5 w-3.5" />
                <span>{roleAssignments.filter((r) => r.userId || r.userName).length} Akun Terdaftar</span>
              </span>
              <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                {expandedSections.roles ? (
                  <ChevronDown className="h-5 w-5 text-[#5142D6]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {expandedSections.roles && (
          <CardContent className="p-0 animate-in fade-in duration-150">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold">
                    <th className="p-3.5 w-64">Peran & Akuntabilitas</th>
                    <th className="p-3.5 min-w-[280px]">Nama / Akun User (Searchable)</th>
                    <th className="p-3.5 min-w-[180px]">Jabatan Organisasi</th>
                    <th className="p-3.5 min-w-[180px]">Unit Kerja / Divisi</th>
                    <th className="p-3.5 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ROLES_CONFIG.map((config) => {
                    const roleItems = roleAssignments.filter(
                      (item) => item.roleCode === config.roleCode
                    );

                    return (
                      <tr key={config.roleCode} className="hover:bg-gray-50/40 transition-colors">
                        {/* Role & Accountability Info Header */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-xs">{config.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${config.badgeColor}`}>
                                {config.badge}
                              </span>
                              {/* Inline Hint Badge & Tooltip */}
                              {config.roleCode === 'promotor' && usulanPromotorHint && (
                                <RoleProposalHintTooltip
                                  title="Usulan Promotor dari Proposal"
                                  content={usulanPromotorHint}
                                  badgeLabel="Ada usulan"
                                  color="amber"
                                />
                              )}
                              {config.roleCode === 'project_owner' && usulanPoHint && (
                                <RoleProposalHintTooltip
                                  title="Saran Project Owner"
                                  content={usulanPoHint}
                                  badgeLabel="Saran PO"
                                  color="emerald"
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                              {config.accountability}
                            </p>
                            {config.isMulti ? (
                              <span className="inline-block text-[10px] text-[#0F5132] font-semibold bg-[#0F5132]/5 px-2 py-0.5 rounded-md border border-[#0F5132]/20">
                                * Multi-orang ({roleItems.length} Orang)
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-gray-400">
                                * 1 Orang (Lead)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Inputs Column: Single row or Multi-Person Stack */}
                        <td colSpan={4} className="p-0 align-top">
                          <div className="divide-y divide-gray-100">
                            {roleItems.length === 0 ? (
                              <div className="p-3.5 text-gray-400 italic text-xs flex items-center justify-between">
                                <span>Belum ada orang ditugaskan.</span>
                                {!isRolesReadOnly && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddPerson(config.roleCode)}
                                    className="h-7 text-xs font-bold text-[#0F5132] border-dashed border-[#0F5132]/40 hover:bg-[#0F5132]/10 bg-white gap-1 cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>+ Tugaskan {config.title}</span>
                                  </Button>
                                )}
                              </div>
                            ) : (
                              roleItems.map((item, index) => {
                                const selectedUser = item.userId
                                  ? {
                                      id: item.userId,
                                      nama: item.userName || "",
                                      email: item.userEmail || "",
                                    }
                                  : (item.userName ? { id: item.userId || "", nama: item.userName, email: item.userEmail || "" } : null);

                                return (
                                  <div
                                    key={item.id}
                                    className="grid grid-cols-[minmax(280px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_48px] items-center p-3 gap-2"
                                  >
                                    {/* User Combobox */}
                                    <div>
                                      <UserSelectCombobox
                                        value={item.userId || null}
                                        selectedUserData={selectedUser}
                                        disabled={isRolesReadOnly}
                                        timId={timId}
                                        onChange={(user) =>
                                          handlePersonUserChange(item.id!, user)
                                        }
                                        placeholder={`Pilih akun untuk ${config.title}${
                                          config.isMulti ? ` #${index + 1}` : ""
                                        }...`}
                                      />
                                    </div>

                                    {/* Jabatan */}
                                    <div>
                                      <Input
                                        disabled={isRolesReadOnly}
                                        placeholder="Contoh: Dept Head Digital"
                                        value={item.jabatan || ""}
                                        onChange={(e) =>
                                          handlePersonDetailChange(
                                            item.id!,
                                            "jabatan",
                                            e.target.value
                                          )
                                        }
                                        className="disabled:bg-gray-50 text-xs h-9"
                                      />
                                    </div>

                                    {/* Unit Kerja */}
                                    <div>
                                      <Input
                                        disabled={isRolesReadOnly}
                                        placeholder="Contoh: Divisi Bisnis Digital"
                                        value={item.unitKerja || ""}
                                        onChange={(e) =>
                                          handlePersonDetailChange(
                                            item.id!,
                                            "unitKerja",
                                            e.target.value
                                          )
                                        }
                                        className="disabled:bg-gray-50 text-xs h-9"
                                      />
                                    </div>

                                    {/* Action Delete */}
                                    <div className="text-center">
                                      {config.isMulti && !isRolesReadOnly && roleItems.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePerson(item.id)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                          title="Hapus baris orang"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}

                            {/* Multi-add Button for multi-person roles */}
                            {config.isMulti && !isRolesReadOnly && roleItems.length > 0 && (
                              <div className="p-2.5 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddPerson(config.roleCode)}
                                  className="h-8 text-xs font-bold text-[#0F5132] border-dashed border-[#0F5132]/40 hover:bg-[#0F5132]/10 bg-white gap-1.5 cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>+ Tambah {config.title}</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 1: PROBLEM & CUSTOMER FOCUS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden hover:border-[#B8720E]/40 transition-all">
        <CardHeader
          onClick={() => toggleSection("problem")}
          className="bg-gradient-to-r from-[#B8720E]/5 via-white to-[#B8720E]/5 border-b border-gray-100 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/80 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#B8720E]/10 text-[#B8720E] border border-[#B8720E]/20">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>1. Problem &amp; Customer Focus</span>
                  <SectionInfo
                    title="Template 1 — Bagian 1: Problem & Customer Focus"
                    text="Perumusan 4 elemen fokus: Project Mission (tujuan akhir inisiatif inovasi), Customer & Context (pengguna sasaran awal dan konteks operasional penerapan solusi), Problem Worth Solving (akar masalah utama beserta dampaknya jika tidak diselesaikan), dan How Might We / HMW (pertanyaan peluang yang menghubungkan target pengguna, tujuan, dan kendala utama)."
                  />
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Definisi misi proyek, target pengguna awal, dan masalah yang layak diselesaikan
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {autoFilledFields.some((f) =>
                ["customerEarlyAdopters", "contextAreaBantuan", "problemWorthSolving"].includes(f)
              ) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Terisi otomatis dari proposal
                </span>
              )}
              <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                {expandedSections.problem ? (
                  <ChevronDown className="h-5 w-5 text-[#B8720E]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {expandedSections.problem && (
          <CardContent className="space-y-4 p-5 pt-4 border-t border-gray-100 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Project Mission (Misi Proyek)
              </label>
              <Textarea
                disabled={isReadOnly}
                rows={2}
                placeholder="Jelaskan tujuan akhir dari inisiatif inovasi ini..."
                value={formData.projectMission}
                onChange={(e) => handleChange("projectMission", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Customer & Early Adopters
                  </label>
                  {autoFilledFields.includes("customerEarlyAdopters") && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                      Terisi otomatis dari proposal
                    </span>
                  )}
                </div>
                <Textarea
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Siapa pengguna sasaran awal yang paling merasakan masalah ini?"
                  value={formData.customerEarlyAdopters}
                  onChange={(e) => handleChange("customerEarlyAdopters", e.target.value)}
                  className={`disabled:bg-gray-50 ${autoFilledFields.includes("customerEarlyAdopters") ? "border-emerald-300 focus:border-emerald-500" : ""}`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Context & Area Bantuan
                  </label>
                  {autoFilledFields.includes("contextAreaBantuan") && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                      Terisi otomatis dari proposal
                    </span>
                  )}
                </div>
                <Textarea
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Di mana dan dalam konteks operasional apa solusi ini diterapkan?"
                  value={formData.contextAreaBantuan}
                  onChange={(e) => handleChange("contextAreaBantuan", e.target.value)}
                  className={`disabled:bg-gray-50 ${autoFilledFields.includes("contextAreaBantuan") ? "border-emerald-300 focus:border-emerald-500" : ""}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-700">
                  Problem Worth Solving (Masalah yang Layak Diselesaikan)
                </label>
                {autoFilledFields.includes("problemWorthSolving") && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    Terisi otomatis dari proposal
                  </span>
                )}
              </div>
              <Textarea
                disabled={isReadOnly}
                rows={3}
                placeholder="Deskripsikan akar masalah utama beserta dampaknya jika tidak diselesaikan..."
                value={formData.problemWorthSolving}
                onChange={(e) => handleChange("problemWorthSolving", e.target.value)}
                className={`disabled:bg-gray-50 ${autoFilledFields.includes("problemWorthSolving") ? "border-emerald-300 focus:border-emerald-500" : ""}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                How Might We (HMW Statement)
              </label>
              <Textarea
                disabled={isReadOnly}
                minHeight={70}
                placeholder="Bagaimana kita dapat membantu [target pengguna] untuk [mencapai tujuan] tanpa [kendala utama]?"
                value={formData.hmw}
                onChange={(e) => handleChange("hmw", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 2: SOLUSI & DFV HYPOTHESES */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden hover:border-[#0E8C55]/40 transition-all">
        <CardHeader
          onClick={() => toggleSection("solution")}
          className="bg-gradient-to-r from-[#0E8C55]/5 via-white to-[#0E8C55]/5 border-b border-gray-100 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/80 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0E8C55]/10 text-[#0E8C55] border border-[#0E8C55]/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>2. Solusi Awal &amp; Hipotesis DFV (Desirability, Feasibility, Viability)</span>
                  <SectionInfo
                    title="Template 1 — Bagian 2: Solusi Awal & Hipotesis DFV"
                    text="Pendefinisian bentuk prototype/solusi minimum yang dibangun serta 3 hipotesis kritis: Desirability (Apakah pengguna benar-benar menginginkan dan membutuhkan solusi ini?), Feasibility (Apakah kita mampu membangun solusi ini secara teknis & operasional?), dan Viability (Apakah solusi ini memberikan dampak bisnis/efisiensi berkelanjutan?)."
                  />
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Asumsi kritis yang harus diuji dan dibuktikan selama masa inkubasi
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {autoFilledFields.some((f) =>
                ["solusiAwal", "desirabilityHypothesis", "feasibilityHypothesis", "viabilityHypothesis"].includes(f)
              ) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Terisi otomatis dari proposal
                </span>
              )}
              <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                {expandedSections.solution ? (
                  <ChevronDown className="h-5 w-5 text-[#0E8C55]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {expandedSections.solution && (
          <CardContent className="space-y-4 p-5 pt-4 border-t border-gray-100 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-700">
                  Solusi Awal yang Diusulkan
                </label>
                {autoFilledFields.includes("solusiAwal") && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    Terisi otomatis dari proposal
                  </span>
                )}
              </div>
              <Textarea
                disabled={isReadOnly}
                rows={3}
                placeholder="Bentuk prototype atau solusi minimum yang akan dibangun..."
                value={formData.solusiAwal}
                onChange={(e) => handleChange("solusiAwal", e.target.value)}
                className={`disabled:bg-gray-50 ${autoFilledFields.includes("solusiAwal") ? "border-emerald-300 focus:border-emerald-500" : ""}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-xs font-bold text-blue-900 block">
                    🎯 Desirability Hypothesis
                  </label>
                  {autoFilledFields.includes("desirabilityHypothesis") && (
                    <span className="text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                      Auto-fill
                    </span>
                  )}
                </div>
                <Textarea
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Apakah pengguna benar-benar menginginkan dan membutuhkan solusi ini?"
                  value={formData.desirabilityHypothesis}
                  onChange={(e) => handleChange("desirabilityHypothesis", e.target.value)}
                  className="disabled:bg-white"
                />
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-xs font-bold text-amber-900 block">
                    ⚙️ Feasibility Hypothesis
                  </label>
                  {autoFilledFields.includes("feasibilityHypothesis") && (
                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                      Auto-fill
                    </span>
                  )}
                </div>
                <Textarea
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Apakah kita mampu membangun solusi ini secara teknis & operasional?"
                  value={formData.feasibilityHypothesis}
                  onChange={(e) => handleChange("feasibilityHypothesis", e.target.value)}
                  className="disabled:bg-white"
                />
              </div>

              <div className="p-3.5 bg-green-50/50 rounded-xl border border-green-100 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-xs font-bold text-green-900 block">
                    💰 Viability Hypothesis
                  </label>
                  {autoFilledFields.includes("viabilityHypothesis") && (
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      Auto-fill
                    </span>
                  )}
                </div>
                <Textarea
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Apakah solusi ini memberikan dampak bisnis/efisiensi berkelanjutan?"
                  value={formData.viabilityHypothesis}
                  onChange={(e) => handleChange("viabilityHypothesis", e.target.value)}
                  className="disabled:bg-white"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 3: TATA KELOLA, RITME KERJA & MILESTONE SPRINT TERSTRUKTUR */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden hover:border-[#0E6E7A]/40 transition-all">
        <CardHeader
          onClick={() => toggleSection("governance")}
          className="bg-gradient-to-r from-[#0E6E7A]/5 via-white to-[#0E6E7A]/5 border-b border-gray-100 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/80 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0E6E7A]/10 text-[#0E6E7A] border border-[#0E6E7A]/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>3. Tata Kelola, Ritme Kerja &amp; Rencana Milestone Sprint</span>
                  <SectionInfo
                    title="Template 1 — Bagian 3: Tata Kelola & Team Agreement"
                    text="Kesepakatan tata kelola pelaksanaan inovasi: Ritme Kerja & Standup (Cycle meeting, sprint planning, sprint review, retrospective, dan kanal komunikasi), Pacing Monitoring (Review kemajuan bersama Coach tiap 2 minggu), Rencana Milestone Sprint 12 Minggu, Kebutuhan Dukungan Lintas Divisi, serta Identifikasi Risiko Awal dan mitigasinya."
                  />
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pacing monitoring, jadwal rencana sprint, dan kebutuhan dukungan selama masa inkubasi
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E6E7A]/10 text-[#0E6E7A] text-xs font-bold border border-[#0E6E7A]/20">
                <Calendar className="h-3.5 w-3.5" />
                <span>{sprints.length} Milestone Sprint</span>
              </span>

              {canManageSprintCount && !isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetSprintCount(sprints.length);
                    setSprintAlasan("");
                    setIsSprintModalOpen(true);
                  }}
                  className="text-xs gap-1.5 font-semibold text-gray-700 hover:text-[#0F5132] h-8"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Ubah Jumlah Sprint ({sprints.length})</span>
                </Button>
              )}

              <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                {expandedSections.governance ? (
                  <ChevronDown className="h-5 w-5 text-[#0E6E7A]" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {expandedSections.governance && (
          <CardContent className="space-y-6 p-5 pt-4 border-t border-gray-100 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Ritme Kerja & Standup
                </label>
                <Input
                  disabled={isReadOnly}
                  placeholder="Contoh: Weekly Sprint & Standup 2x seminggu"
                  value={formData.ritmeKerja}
                  onChange={(e) => handleChange("ritmeKerja", e.target.value)}
                  className="disabled:bg-gray-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Pacing Monitoring Bersama Coach
                </label>
                <Input
                  disabled={isReadOnly}
                  placeholder="Contoh: Review kemajuan bersama Coach tiap 2 minggu"
                  value={formData.pacingMonitoring}
                  onChange={(e) => handleChange("pacingMonitoring", e.target.value)}
                  className="disabled:bg-gray-50"
                />
              </div>
            </div>

            {/* Structured Sprint Milestones */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Rencana Milestone per Sprint
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Target jadwal dan sasaran validasi setiap iterasi sprint (terhubung langsung ke Kanban).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#0F5132] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                    {sprints.length} Iterasi Sprint
                  </span>
                  <Link
                    href={`/tim/${timId}/kanban`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5142D6]/10 text-[#5142D6] hover:bg-[#5142D6]/20 text-xs font-bold transition-all border border-[#5142D6]/20 shadow-2xs"
                    title="Buka Sprint Planning & Kanban Board"
                  >
                    <KanbanSquare className="h-3.5 w-3.5" />
                    <span>Buka Sprint Planning &amp; Kanban &rarr;</span>
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                {sprints.map((s) => (
                  <div
                    key={s.nomorSprint}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="text-xs bg-[#0F5132] font-bold">
                        Sprint {s.nomorSprint}
                      </Badge>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {s.status === 'aktif' ? '🟢 Sedang Aktif' : s.status === 'selesai' ? '🔵 Selesai' : '⚪ Belum Dimulai'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">
                          Tanggal Mulai Rencana
                        </label>
                        <Input
                          type="date"
                          disabled={isReadOnly}
                          value={s.tanggalMulaiRencana || ""}
                          onChange={(e) =>
                            handleSprintChange(s.nomorSprint, "tanggalMulaiRencana", e.target.value)
                          }
                          className="text-xs h-8 disabled:bg-white"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">
                          Target Selesai Rencana
                        </label>
                        <Input
                          type="date"
                          disabled={isReadOnly}
                          value={s.tanggalSelesaiRencana || ""}
                          onChange={(e) =>
                            handleSprintChange(s.nomorSprint, "tanggalSelesaiRencana", e.target.value)
                          }
                          className="text-xs h-8 disabled:bg-white"
                        />
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-semibold text-gray-600 block">
                          Tujuan / Sasaran Milestone Sprint
                        </label>
                        <Input
                          disabled={isReadOnly}
                          placeholder={`Contoh: Problem validation dengan 10 customer...`}
                          value={s.tujuan || ""}
                          onChange={(e) =>
                            handleSprintChange(s.nomorSprint, "tujuan", e.target.value)
                          }
                          className="text-xs h-8 disabled:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-700">
                  Kebutuhan Dukungan (Data / SME / Akses Sistem)
                </label>
                {autoFilledFields.includes("kebutuhanDukungan") && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    Terisi otomatis dari proposal
                  </span>
                )}
              </div>
              <Textarea
                disabled={isReadOnly}
                rows={2}
                placeholder="Sebutkan dukungan divisi atau data yang dibutuhkan untuk validasi..."
                value={formData.kebutuhanDukungan}
                onChange={(e) => handleChange("kebutuhanDukungan", e.target.value)}
                className={`disabled:bg-gray-50 ${autoFilledFields.includes("kebutuhanDukungan") ? "border-emerald-300 focus:border-emerald-500" : ""}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Risiko Awal & Rencana Mitigasi
              </label>
              <Textarea
                disabled={isReadOnly}
                rows={2}
                placeholder="Potensi hambatan yang mungkin dihadapi dan solusinya..."
                value={formData.risikoAwal}
                onChange={(e) => handleChange("risikoAwal", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 4: PERSETUJUAN FORMAL (3 Tanda Tangan: PO | Coach | Promotor) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {(() => {
        const poAssignment = roleAssignments.find((r) => r.roleCode === "project_owner" && (r.userId || r.userName));
        const coachAssignment = roleAssignments.find((r) => ["coach", "innovation_coach"].includes(r.roleCode) && (r.userId || r.userName));
        const promotorAssignment = roleAssignments.find((r) => r.roleCode === "promotor" && (r.userId || r.userName));
        const poName = poAssignment?.userName || "Project Owner";
        const coachName = coachAssignment?.userName || "Innovation Coach";
        const promotorName = promotorAssignment?.userName || "Promotor Inovasi";

        const isAdmin = Boolean(currentUser?.globalRoles?.includes("admin_ic"));
        const canUserSignPo = Boolean(
          canSignPo && (isAdmin || (currentUser?.id && poAssignment?.userId === currentUser.id))
        );
        const canUserSignCoach = Boolean(
          canSignCoach && (isAdmin || (currentUser?.id && coachAssignment?.userId === currentUser.id))
        );
        const canUserSignPromotor = Boolean(
          canApprove && (isAdmin || (currentUser?.id && promotorAssignment?.userId === currentUser.id))
        );

        // Helper: renders one signature card
        const renderSigCard = (
          label: string,
          sublabel: string,
          ttd: any,
          assignedName: string,
          assignment: any,
          canSign: boolean,
          onSign: () => void,
          onRevoke: () => void,
          accentColor: "blue" | "purple" | "emerald",
        ) => {
          const colorMap = {
            blue: { border: "border-blue-300", bg: "bg-blue-50/40", badge: "bg-blue-100 text-blue-800 border-blue-200", icon: "text-blue-600", btn: "bg-blue-700 hover:bg-blue-800" },
            purple: { border: "border-purple-300", bg: "bg-purple-50/40", badge: "bg-purple-100 text-purple-800 border-purple-200", icon: "text-purple-600", btn: "bg-purple-700 hover:bg-purple-800" },
            emerald: { border: "border-emerald-300", bg: "bg-emerald-50/40", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "text-emerald-600", btn: "bg-[#0F5132] hover:bg-[#1B7A4D]" },
          };
          const c = colorMap[accentColor];
          const isSigned = ttd?.status === "approved";
          return (
            <div className={`p-4 rounded-xl border-2 transition-all space-y-3 ${isSigned ? `${c.border} ${c.bg}` : "border-dashed border-gray-200 bg-gray-50/70"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{label}</div>
                  <div className="text-[10px] text-gray-400">{sublabel}</div>
                </div>
                {isSigned ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
                    <CheckCircle className={`h-3 w-3 ${c.icon}`} />
                    <span>Ditandatangani</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-gray-400 italic">Belum Ditandatangani</span>
                )}
              </div>

              <div className="text-xs">
                {isSigned ? (
                  <>
                    <div className="font-bold text-gray-900">{assignedName || ttd.nama}</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                      <Briefcase className="h-3 w-3 text-gray-400" />
                      <span>{ttd.jabatan}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>{ttd.unit || "PT Pegadaian (Persero)"}</span>
                    </div>
                    {ttd.signatureImage && (
                      <div className={`bg-white p-1 rounded-lg border shadow-2xs max-w-[130px] my-2 ${c.border}`}>
                        <img src={ttd.signatureImage} alt={`Tanda Tangan ${sublabel}`} className="h-10 w-auto object-contain block" />
                      </div>
                    )}
                    {ttd.tanggal && (
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">{formatDateIndo(ttd.tanggal)}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-bold text-gray-700">{assignedName || `Belum ada akun ${sublabel} terdaftar`}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="h-3 w-3 text-gray-400" />
                      <span>{assignment?.jabatan || sublabel}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>{assignment?.unitKerja || "PT Pegadaian (Persero)"}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 italic mt-1">
                      {assignedName ? "Nama terdaftar di Penugasan Role Tim" : `Belum ada akun ${sublabel} terdaftar di Charter`}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-gray-200/60">
                {canSign ? (
                  isSigned ? (
                    <Button type="button" variant="ghost" size="sm" disabled={approving} onClick={onRevoke}
                      className="w-full text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-lg cursor-pointer">
                      {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                      <span>Batalkan Tanda Tangan</span>
                    </Button>
                  ) : (
                    <Button type="button" size="sm" disabled={approving} onClick={onSign}
                      className={`w-full text-white text-xs font-bold h-8 rounded-lg shadow-2xs cursor-pointer ${c.btn}`}>
                      <Stamp className="h-3.5 w-3.5 mr-1" />
                      <span>Tandatangani sbg {sublabel}</span>
                    </Button>
                  )
                ) : (
                  isSigned ? (
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-[11px] text-emerald-700 font-medium text-center`}>
                      <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>Telah ditandatangani</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gray-50 border border-gray-200/80 text-[11px] text-gray-500 font-medium text-center">
                      <Lock className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>Menunggu {assignedName || sublabel}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        };

        return (
          <>
            <Card className="border border-gray-200 shadow-xs bg-white rounded-2xl overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-emerald-50/50 via-white to-purple-50/30 border-b border-gray-100 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                      <Stamp className="h-4.5 w-4.5 text-[#0F5132]" />
                      <span>Persetujuan Formal &amp; Otorisasi Innovation Charter</span>
                      <SectionInfo
                        title="Template 1 — Bagian 4: Lembar Pengesahan Otorisasi"
                        text="Otorisasi formal mandat eksekusi inovasi sesuai Template 1 Juklak: Disusun Oleh Project Owner, Diperiksa Oleh Innovation Coach, dan Disetujui Oleh Promotor. Tanda tangan Promotor menjadi syarat sah pembukaan gerbang Customer Validation."
                      />
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">
                      Tanda tangan formal sesuai Template 1 Juklak. Gerbang fase hanya membutuhkan tanda tangan Promotor.
                    </CardDescription>
                  </div>
                  {ttdDisetujui?.status === "approved" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" />
                      Disetujui Formal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                      Menunggu Persetujuan Promotor
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderSigCard(
                    "Disusun Oleh", "Project Owner",
                    ttdDisusun, poName, poAssignment,
                    canUserSignPo,
                    () => setSigPoModalOpen(true),
                    handleRevokePoSign,
                    "blue"
                  )}
                  {renderSigCard(
                    "Diperiksa Oleh", "Innovation Coach",
                    ttdDiperiksa, coachName, coachAssignment,
                    canUserSignCoach,
                    () => setSigCoachModalOpen(true),
                    handleRevokeCoachSign,
                    "purple"
                  )}
                  {renderSigCard(
                    "Disetujui Oleh", "Promotor",
                    ttdDisetujui, promotorName, promotorAssignment,
                    canUserSignPromotor,
                    () => setSigModalOpen(true),
                    handleRevokeApproval,
                    "emerald"
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                  <strong>Catatan:</strong> Tanda tangan PO dan Coach bersifat dokumentasi tambahan. Pembukaan gerbang Customer Validation tetap hanya membutuhkan tanda tangan Promotor.
                </p>
              </CardContent>
            </Card>

            {/* SignaturePadModal for PO */}
            <SignaturePadModal
              isOpen={sigPoModalOpen}
              onClose={() => setSigPoModalOpen(false)}
              onSave={handleSavePoSignature}
              title="Tanda Tangan Innovation Charter — Disusun Oleh"
              roleName="Project Owner"
              userName={poName || "Belum ada akun Project Owner terdaftar"}
            />
            {/* SignaturePadModal for Coach */}
            <SignaturePadModal
              isOpen={sigCoachModalOpen}
              onClose={() => setSigCoachModalOpen(false)}
              onSave={handleSaveCoachSignature}
              title="Tanda Tangan Innovation Charter — Diperiksa Oleh"
              roleName="Innovation Coach"
              userName={coachName || "Belum ada akun Coach terdaftar"}
            />
            {/* SignaturePadModal for Promotor (gate-relevant) */}
            <SignaturePadModal
              isOpen={sigModalOpen}
              onClose={() => setSigModalOpen(false)}
              onSave={handleSaveSignature}
              title="Persetujuan Formal Innovation Charter"
              roleName="Promotor Inovasi"
              userName={promotorName || "Belum ada akun Promotor terdaftar di Charter"}
            />
          </>
        );
      })()}

      {/* Save Button for Editor */}
      {!isReadOnly && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold px-8 h-12 rounded-xl shadow-md gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan Innovation Charter...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Simpan Innovation Charter & Milestone Sprint</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dialog Ubah Jumlah Sprint */}
      <Dialog open={isSprintModalOpen} onOpenChange={setIsSprintModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#0F5132]" />
              Ubah Jumlah Iterasi Sprint
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p className="font-semibold">Perhatian Perubahan Jumlah Sprint</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Jumlah sprint default adalah 4. Perubahan jumlah sprint wajib disertai alasan resmi dan akan dicatat ke dalam <strong>sprint_log</strong> (audit trail).
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Target Jumlah Sprint Baru *
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={targetSprintCount}
                onChange={(e) => setTargetSprintCount(parseInt(e.target.value) || 1)}
                className="text-xs font-bold"
              />
              <span className="text-[10px] text-gray-400">
                Jumlah sprint saat ini: {sprints.length} sprint
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Alasan Perubahan Jumlah Sprint *
              </label>
              <Textarea
                rows={3}
                placeholder="Contoh: Penambahan 2 sprint untuk fase pengujian pasar skala luas..."
                value={sprintAlasan}
                onChange={(e) => setSprintAlasan(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSprintModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingSprintCount || !sprintAlasan.trim() || targetSprintCount === sprints.length}
              onClick={handleApplySprintCountChange}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-semibold gap-1.5"
            >
              {savingSprintCount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Simpan Perubahan Sprint</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ringkasan Akun Baru Dibuat Otomatis dari Proposal */}
      <Dialog
        open={Boolean(newlyCreatedAccounts && newlyCreatedAccounts.length > 0)}
        onOpenChange={(open) => {
          if (!open) setNewlyCreatedAccounts(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Akun Baru Dibuat Otomatis Dari Data Proposal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-gray-700 leading-relaxed">
              Akun baru dibuat otomatis dari data proposal (password default: <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold font-mono">gadai123</code>, <strong>wajib diganti saat login pertama</strong>):
            </p>

            <div className="space-y-2 border border-emerald-200 bg-emerald-50/50 p-3.5 rounded-xl max-h-56 overflow-y-auto">
              {newlyCreatedAccounts?.map((acc, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs">
                  <div>
                    <span className="font-bold text-gray-900 block">{acc.nama}</span>
                    <span className="text-[11px] text-gray-500 font-mono">{acc.email}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 text-emerald-800 shrink-0">
                    {acc.roleName}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                Informasikan ke Anggota Tim:
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Segera informasikan ke yang bersangkutan bahwa akun mereka sudah dibuat dan bisa login dengan password default di atas — sistem akan otomatis meminta mereka mengganti password saat login pertama kali.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setNewlyCreatedAccounts(null)}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold w-full sm:w-auto"
            >
              Mengerti & Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
