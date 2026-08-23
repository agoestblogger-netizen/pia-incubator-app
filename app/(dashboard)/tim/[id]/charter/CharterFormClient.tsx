"use client";

import { useState } from "react";
import {
  saveCharterAction,
  approveCharterAction,
  revokeCharterApprovalAction,
  RoleAssignmentItem,
} from "@/app/actions/charter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

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
    badge: 'Adopsi & Jaringan',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    accountability: 'Mendorong adopsi lintas unit kerja, membuka akses jaringan internal, dan mengawal integrasi solusi.',
    isMulti: false,
  },
  {
    roleCode: 'project_owner',
    title: 'Project Owner',
    badge: 'Lead Eksekusi',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accountability: 'Memimpin eksekusi harian, mengelola backlog sprint, dan bertanggung jawab atas deliverable & timeline.',
    isMulti: false,
  },
  {
    roleCode: 'inisiator',
    title: 'Inisiator',
    badge: 'Visi Inovasi',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accountability: 'Pemilik gagasan awal, menjaga orisinalitas visi dan esensi problem-solution fit selama inkubasi.',
    isMulti: true,
  },
  {
    roleCode: 'co_creator',
    title: 'Co-creators',
    badge: 'Tim Inti',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    accountability: 'Anggota tim inti yang mengeksekusi pengembangan teknis, user testing, dan pengujian lapangan.',
    isMulti: true,
  },
  {
    roleCode: 'coach',
    title: 'Innovation Coach',
    badge: 'Fasilitator & Metodologi',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accountability: 'Memandu penerapan metodologi inovasi, pacing monitoring 2-mingguan, dan problem solving tim.',
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
  canEdit = true,
  canApprove = false,
  currentUser,
}: {
  timId: string;
  initialData: any;
  initialRolesData?: any;
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

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isReadOnly = !canEdit;

  const handleChange = (field: string, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const res = await saveCharterAction(timId, formData, roleAssignments);
    if (res.success) {
      setStatusMsg({
        type: "success",
        text: "Innovation Charter & Struktur Akuntabilitas Tim berhasil disimpan!",
      });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Gagal menyimpan Charter." });
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
                                      className="h-9 text-xs border-gray-200 bg-white disabled:bg-gray-50"
                                    />
                                  </div>

                                  {/* Unit Kerja */}
                                  <div>
                                    <Input
                                      disabled={isReadOnly}
                                      placeholder="Contoh: Divisi TI"
                                      value={item.unitKerja || ""}
                                      onChange={(e) =>
                                        handlePersonDetailChange(
                                          item.id!,
                                          "unitKerja",
                                          e.target.value
                                        )
                                      }
                                      className="h-9 text-xs border-gray-200 bg-white disabled:bg-gray-50"
                                    />
                                  </div>

                                  {/* Delete Person Button */}
                                  <div className="text-center">
                                    {config.isMulti && !isReadOnly ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemovePerson(item.id)}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                        title="Hapus orang ini dari peran"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <span className="text-gray-300 text-xs">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {/* + Tambah Orang button */}
                          {config.isMulti && !isReadOnly && (
                            <div className="p-2.5 bg-gray-50/60 flex items-center justify-start">
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
              <label className="text-xs font-semibold text-gray-700">
                Customer & Early Adopters
              </label>
              <Textarea
                disabled={isReadOnly}
                rows={2}
                placeholder="Siapa pengguna sasaran awal yang paling merasakan masalah ini?"
                value={formData.customerEarlyAdopters}
                onChange={(e) => handleChange("customerEarlyAdopters", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Context & Area Bantuan
              </label>
              <Textarea
                disabled={isReadOnly}
                rows={2}
                placeholder="Di mana dan dalam konteks operasional apa solusi ini diterapkan?"
                value={formData.contextAreaBantuan}
                onChange={(e) => handleChange("contextAreaBantuan", e.target.value)}
                className="disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Problem Worth Solving (Masalah yang Layak Diselesaikan)
            </label>
            <Textarea
              disabled={isReadOnly}
              rows={3}
              placeholder="Deskripsikan akar masalah utama beserta dampaknya jika tidak diselesaikan..."
              value={formData.problemWorthSolving}
              onChange={(e) => handleChange("problemWorthSolving", e.target.value)}
              className="disabled:bg-gray-50"
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
            <label className="text-xs font-semibold text-gray-700">
              Solusi Awal yang Diusulkan
            </label>
            <Textarea
              disabled={isReadOnly}
              rows={3}
              placeholder="Bentuk prototype atau solusi minimum yang akan dibangun..."
              value={formData.solusiAwal}
              onChange={(e) => handleChange("solusiAwal", e.target.value)}
              className="disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
              <label className="text-xs font-bold text-blue-900 block">
                🎯 Desirability Hypothesis
              </label>
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
              <label className="text-xs font-bold text-amber-900 block">
                ⚙️ Feasibility Hypothesis
              </label>
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
              <label className="text-xs font-bold text-green-900 block">
                💰 Viability Hypothesis
              </label>
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
      {/* BAGIAN 3: TATA KELOLA & RITME KERJA */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            3. Tata Kelola, Ritme Kerja & Mitigasi Risiko
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Pacing monitoring dan kebutuhan dukungan selama masa inkubasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Kebutuhan Dukungan (Data / SME / Akses Sistem)
            </label>
            <Textarea
              disabled={isReadOnly}
              rows={2}
              placeholder="Sebutkan dukungan divisi atau data yang dibutuhkan untuk validasi..."
              value={formData.kebutuhanDukungan}
              onChange={(e) => handleChange("kebutuhanDukungan", e.target.value)}
              className="disabled:bg-gray-50"
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
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold px-8 h-12 rounded-xl shadow-md gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Innovation Charter & Role Tim"}</span>
          </Button>
        </div>
      )}
    </form>
  );
}
