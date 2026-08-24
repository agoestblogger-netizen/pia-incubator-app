"use client";

import { useState } from "react";
import {
  saveCharterAction,
  approveCharterAction,
  revokeCharterApprovalAction,
  RoleAssignmentItem,
} from "@/app/actions/charter";
import {
  saveCharterSprintsAction,
  updateSprintCountAction,
} from "@/app/actions/sprint";
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
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  Plus,
  UserCheck,
  Building2,
  Briefcase,
  ShieldCheck,
  Stamp,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  Settings2,
  Sparkles,
} from "lucide-react";
import { RoleProposalHintTooltip } from "./RoleProposalHintTooltip";

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
    ritmeKerja: initialData?.ritmeKerja || "Weekly Sprint & Standup 2x seminggu",
    pacingMonitoring: initialData?.pacingMonitoring || "Review kemajuan bersama Coach tiap 2 minggu",
    kebutuhanDukungan: initialData?.kebutuhanDukungan || "",
    risikoAwal: initialData?.risikoAwal || "",
  });

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
      { nomorSprint: 1, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Sprint 1: Problem Validation & Setup" },
      { nomorSprint: 2, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Sprint 2: Solution Exploration & Prototyping" },
      { nomorSprint: 3, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Sprint 3: MVP Development & Testing" },
      { nomorSprint: 4, tanggalMulaiRencana: "", tanggalSelesaiRencana: "", tujuan: "Sprint 4: Market Validation & Pitch Preparation" },
    ];
  });

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [targetSprintCount, setTargetSprintCount] = useState(sprints.length);
  const [sprintAlasan, setSprintAlasan] = useState("");
  const [savingSprintCount, setSavingSprintCount] = useState(false);

  // Auto-created Accounts Dialog State
  const [newlyCreatedAccounts, setNewlyCreatedAccounts] = useState<
    Array<{ nama: string; email: string; roleName: string }> | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isReadOnly = !canEdit;

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
      alert("Alasan perubahan jumlah sprint wajib diisi.");
      return;
    }
    setSavingSprintCount(true);
    const res = await updateSprintCountAction(timId, targetSprintCount, sprintAlasan);
    if (res.success) {
      setIsSprintModalOpen(false);
      setSprintAlasan("");
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
      alert(res.error || "Gagal mengubah jumlah sprint.");
    }
    setSavingSprintCount(false);
  };

  const handleAddPerson = (roleCode: RoleAssignmentItem['roleCode']) => {
    if (isReadOnly) return;
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
    if (isReadOnly || !id) return;
    setRoleAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePersonUserChange = (id: string, user: SelectedUser | null) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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
      saveCharterAction(timId, formData, roleAssignments),
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
          }
        }
        setRoleAssignments(newItems);
      }

      setStatusMsg({
        type: "success",
        text: "Innovation Charter & Penugasan Tim Inovator berhasil disimpan!",
      });
    } else {
      setStatusMsg({
        type: "error",
        text: resCharter.error || resSprints.error || "Gagal menyimpan Charter.",
      });
    }
    setSaving(false);
  };

  const handleApproveCharter = async () => {
    setApproving(true);
    setStatusMsg(null);

    const res = await approveCharterAction(timId);
    if (res.success && res.ttdDisetujui) {
      setTtdDisetujui(res.ttdDisetujui);
      setStatusMsg({
        type: "success",
        text: "Innovation Charter berhasil disetujui secara formal oleh Promotor!",
      });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Gagal menyetujui Innovation Charter." });
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
      setStatusMsg({
        type: "success",
        text: "Persetujuan formal Innovation Charter telah dibatalkan untuk revisi tim.",
      });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Gagal membatalkan persetujuan." });
    }
    setApproving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
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
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 via-white to-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0F5132]" />
                Struktur Role & Akuntabilitas Tim
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Pilih atau buat akun pengguna untuk setiap peran tim. Role Inisiator, Co-creators, dan SME mendukung banyak orang (multi-person).
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F5132]/10 text-[#0F5132] text-xs font-bold border border-[#0F5132]/20">
              <UserCheck className="h-3.5 w-3.5" />
              Integrasi Akun User Otomatis
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
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
                            <div className="p-3 text-center text-gray-400 italic text-xs">
                              Belum ada orang ditugaskan.
                            </div>
                          ) : (
                            roleItems.map((item, index) => {
                              const selectedUser = item.userId
                                ? {
                                    id: item.userId,
                                    nama: item.userName || "",
                                    email: item.userEmail || "",
                                  }
                                : null;

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
                                      disabled={isReadOnly}
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
                                      disabled={isReadOnly}
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
                                      disabled={isReadOnly}
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
                                    {config.isMulti && !isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePerson(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
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
                          {config.isMulti && !isReadOnly && (
                            <div className="p-2.5 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddPerson(config.roleCode)}
                                className="h-8 text-xs font-bold text-[#0F5132] border-dashed border-[#0F5132]/40 hover:bg-[#0F5132]/10 bg-white gap-1.5"
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
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 1: PROBLEM & CUSTOMER FOCUS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            1. Problem & Customer Focus
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Definisi misi proyek, target pengguna awal, dan masalah yang layak diselesaikan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Input
              disabled={isReadOnly}
              placeholder="Bagaimana kita dapat membantu [target pengguna] untuk [mencapai tujuan] tanpa [kendala utama]?"
              value={formData.hmw}
              onChange={(e) => handleChange("hmw", e.target.value)}
              className="disabled:bg-gray-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 2: SOLUSI & DFV HYPOTHESES */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            2. Solusi Awal & Hipotesis DFV (Desirability, Feasibility, Viability)
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Asumsi kritis yang harus diuji dan dibuktikan selama masa inkubasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 3: TATA KELOLA, RITME KERJA & MILESTONE SPRINT TERSTRUKTUR */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0F5132]" />
                3. Tata Kelola, Ritme Kerja & Rencana Milestone Sprint
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Pacing monitoring, jadwal rencana sprint, dan kebutuhan dukungan selama masa inkubasi
              </CardDescription>
            </div>

            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetSprintCount(sprints.length);
                  setSprintAlasan("");
                  setIsSprintModalOpen(true);
                }}
                className="text-xs gap-1.5 font-semibold text-gray-700 hover:text-[#0F5132]"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Ubah Jumlah Sprint ({sprints.length})</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Ritme Kerja & Standup
              </label>
              <Input
                disabled={isReadOnly}
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
                value={formData.pacingMonitoring}
                onChange={(e) => handleChange("pacingMonitoring", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Structured Sprint Milestones */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Rencana Milestone per Sprint
                </h4>
                <p className="text-[11px] text-gray-500">
                  Target jadwal dan sasaran validasi setiap iterasi sprint (terhubung langsung ke Kanban).
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#0F5132] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                {sprints.length} Iterasi Sprint
              </span>
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
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN 4: PERSETUJUAN FORMAL PROMOTOR ("DISETUJUI OLEH") */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-950/5 via-white to-emerald-950/5 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Stamp className="h-5 w-5 text-[#0F5132]" />
                Persetujuan Formal & Komitmen Promotor
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Tanda tangan formal Promotor Inovasi sebagai mandat resmi dimulainya eksekusi inkubasi tim.
              </CardDescription>
            </div>

            {ttdDisetujui?.status === 'approved' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
                <FileCheck2 className="h-4 w-4 text-green-700" />
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

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Signature Stamp Box */}
            <div
              className={`p-5 rounded-2xl border-2 transition-all ${
                ttdDisetujui?.status === 'approved'
                  ? 'border-[#0F5132]/40 bg-emerald-50/50 shadow-xs'
                  : 'border-dashed border-gray-200 bg-gray-50/60'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Disetujui Oleh (Promotor Inovasi):
              </div>

              {ttdDisetujui?.status === 'approved' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{ttdDisetujui.nama}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#0F5132] text-white">
                      Verified
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                    <span>{ttdDisetujui.jabatan}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <span>{ttdDisetujui.unit}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 pt-1 font-mono">
                    Waktu Persetujuan: {new Date(ttdDisetujui.tanggal).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                  </div>
                </div>
              ) : (
                <div className="py-3 text-xs text-gray-400 italic flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-gray-300" />
                  <span>Belum ada tanda tangan persetujuan formal dari Promotor.</span>
                </div>
              )}
            </div>

            {/* Approval Action Controls */}
            <div className="space-y-3">
              {canApprove && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="text-xs font-bold text-gray-800">
                    Aksi Persetujuan Promotor
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Sebagai Promotor tim, klik tombol di bawah untuk membubuhkan tanda tangan formal digital dan mengesahkan Innovation Charter ini.
                  </p>

                  <div className="flex items-center gap-3">
                    {ttdDisetujui?.status === 'approved' ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={approving}
                        onClick={handleRevokeApproval}
                        className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1.5 h-10 rounded-xl"
                      >
                        {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        <span>Batalkan Persetujuan (Revisi)</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={approving}
                        onClick={handleApproveCharter}
                        className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-2 h-10 px-6 rounded-xl shadow-sm"
                      >
                        {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                        <span>Setujui Innovation Charter</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
