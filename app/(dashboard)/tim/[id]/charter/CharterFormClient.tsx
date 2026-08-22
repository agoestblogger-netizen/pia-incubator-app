"use client";

import { useState } from "react";
import { saveCharterAction, RoleAssignmentItem } from "@/app/actions/charter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserSelectCombobox, SelectedUser } from "@/components/user/UserSelectCombobox";
import { Save, CheckCircle2, Users, Shield, Award, UserCheck, Sparkles, Building2, Briefcase } from "lucide-react";

interface RoleRowConfig {
  roleCode: RoleAssignmentItem['roleCode'];
  title: string;
  badge: string;
  badgeColor: string;
  accountability: string;
}

const DEFAULT_ROLE_ROWS: RoleRowConfig[] = [
  {
    roleCode: 'sponsor',
    title: 'Sponsor',
    badge: 'Mandat & Budget',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    accountability: 'Memberikan mandat strategis, persetujuan alokasi anggaran, dan proteksi politis inisiatif.',
  },
  {
    roleCode: 'promotor',
    title: 'Promotor',
    badge: 'Adopsi & Jaringan',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    accountability: 'Mendorong adopsi lintas unit kerja, membuka akses jaringan internal, dan mengawal integrasi solusi.',
  },
  {
    roleCode: 'project_owner',
    title: 'Project Owner',
    badge: 'Lead Eksekusi',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accountability: 'Memimpin eksekusi harian, mengelola backlog sprint, dan bertanggung jawab atas deliverable & timeline.',
  },
  {
    roleCode: 'inisiator',
    title: 'Inisiator',
    badge: 'Visi Inovasi',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accountability: 'Pemilik gagasan awal, menjaga orisinalitas visi dan esensi problem-solution fit selama inkubasi.',
  },
  {
    roleCode: 'co_creator',
    title: 'Co-creators',
    badge: 'Tim Inti',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    accountability: 'Anggota tim inti yang mengeksekusi pengembangan teknis, user testing, dan pengujian lapangan.',
  },
  {
    roleCode: 'coach',
    title: 'Innovation Coach',
    badge: 'Fasilitator & Metodologi',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accountability: 'Memandu penerapan metodologi inovasi, pacing monitoring 2-mingguan, dan problem solving tim.',
  },
  {
    roleCode: 'sme',
    title: 'Collaborator / SME',
    badge: 'Domain Expert',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    accountability: 'Memberikan keahlian domain spesifik (IT Architecture, Legal/Compliance, Finance, Risk, Operasional).',
  },
];

export function CharterFormClient({
  timId,
  initialData,
  initialRolesData,
}: {
  timId: string;
  initialData: any;
  initialRolesData?: any;
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

  // Initialize role assignments from database
  const assignmentsList = initialRolesData?.assignments || [];
  const anggotaList = initialRolesData?.anggotaTim || [];

  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentItem[]>(() => {
    return DEFAULT_ROLE_ROWS.map((row) => {
      const existingAssign = assignmentsList.find((a: any) => a.roleCode === row.roleCode);
      const existingAnggota = existingAssign ? anggotaList.find((ang: any) => ang.userId === existingAssign.userId) : null;

      return {
        roleCode: row.roleCode,
        userId: existingAssign?.userId || null,
        userName: existingAssign?.userName || "",
        userEmail: existingAssign?.userEmail || "",
        jabatan: existingAnggota?.jabatan || "",
        unitKerja: existingAnggota?.unitKerja || "",
      };
    });
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleUserChange = (roleCode: RoleAssignmentItem['roleCode'], user: SelectedUser | null) => {
    setRoleAssignments((prev) =>
      prev.map((r) => {
        if (r.roleCode === roleCode) {
          return {
            ...r,
            userId: user ? user.id : null,
            userName: user ? user.nama : '',
            userEmail: user ? user.email : '',
          };
        }
        return r;
      })
    );
  };

  const handleRoleDetailChange = (
    roleCode: RoleAssignmentItem['roleCode'],
    field: 'jabatan' | 'unitKerja',
    value: string
  ) => {
    setRoleAssignments((prev) =>
      prev.map((r) => {
        if (r.roleCode === roleCode) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const res = await saveCharterAction(timId, formData, roleAssignments);
    if (res.success) {
      setStatusMsg({ type: "success", text: "Innovation Charter & Struktur Akuntabilitas Tim berhasil disimpan!" });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Gagal menyimpan Charter." });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
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
      {/* BAGIAN 0: STRUKTUR ROLE & AKUNTABILITAS TIM (TERHUBUNG KE AKUN USER) */}
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
                Pilih atau buat akun pengguna untuk setiap peran kunci. Pengguna yang terdaftar otomatis mendapat hak akses ke workspace tim ini.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEFAULT_ROLE_ROWS.map((row) => {
                  const currentAssign = roleAssignments.find((r) => r.roleCode === row.roleCode);
                  const selectedUser = currentAssign?.userId
                    ? {
                        id: currentAssign.userId,
                        nama: currentAssign.userName || '',
                        email: currentAssign.userEmail || '',
                      }
                    : null;

                  return (
                    <tr key={row.roleCode} className="hover:bg-gray-50/60 transition-colors">
                      {/* Role & Accountability */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-xs">{row.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${row.badgeColor}`}>
                              {row.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            {row.accountability}
                          </p>
                        </div>
                      </td>

                      {/* Searchable User Combobox */}
                      <td className="p-3.5 align-top">
                        <UserSelectCombobox
                          value={currentAssign?.userId || null}
                          selectedUserData={selectedUser}
                          onChange={(user) => handleRoleUserChange(row.roleCode, user)}
                          placeholder={`Pilih akun untuk ${row.title}...`}
                        />
                      </td>

                      {/* Jabatan */}
                      <td className="p-3.5 align-top">
                        <Input
                          placeholder="Contoh: Dept Head Digital"
                          value={currentAssign?.jabatan || ''}
                          onChange={(e) => handleRoleDetailChange(row.roleCode, 'jabatan', e.target.value)}
                          className="h-9 text-xs border-gray-200 bg-white"
                        />
                      </td>

                      {/* Unit Kerja */}
                      <td className="p-3.5 align-top">
                        <Input
                          placeholder="Contoh: Divisi TI"
                          value={currentAssign?.unitKerja || ''}
                          onChange={(e) => handleRoleDetailChange(row.roleCode, 'unitKerja', e.target.value)}
                          className="h-9 text-xs border-gray-200 bg-white"
                        />
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
              rows={2}
              placeholder="Jelaskan tujuan akhir dari inisiatif inovasi ini..."
              value={formData.projectMission}
              onChange={(e) => handleChange("projectMission", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Customer & Early Adopters
              </label>
              <Textarea
                rows={2}
                placeholder="Siapa pengguna sasaran awal yang paling merasakan masalah ini?"
                value={formData.customerEarlyAdopters}
                onChange={(e) => handleChange("customerEarlyAdopters", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Context & Area Bantuan
              </label>
              <Textarea
                rows={2}
                placeholder="Di mana dan dalam konteks operasional apa solusi ini diterapkan?"
                value={formData.contextAreaBantuan}
                onChange={(e) => handleChange("contextAreaBantuan", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Problem Worth Solving (Masalah yang Layak Diselesaikan)
            </label>
            <Textarea
              rows={3}
              placeholder="Deskripsikan akar masalah utama beserta dampaknya jika tidak diselesaikan..."
              value={formData.problemWorthSolving}
              onChange={(e) => handleChange("problemWorthSolving", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              How Might We (HMW Statement)
            </label>
            <Input
              placeholder="Bagaimana kita dapat membantu [target pengguna] untuk [mencapai tujuan] tanpa [kendala utama]?"
              value={formData.hmw}
              onChange={(e) => handleChange("hmw", e.target.value)}
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
              rows={3}
              placeholder="Bentuk prototype atau solusi minimum yang akan dibangun..."
              value={formData.solusiAwal}
              onChange={(e) => handleChange("solusiAwal", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
              <label className="text-xs font-bold text-blue-900 block">
                🎯 Desirability Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah pengguna benar-benar menginginkan dan membutuhkan solusi ini?"
                value={formData.desirabilityHypothesis}
                onChange={(e) => handleChange("desirabilityHypothesis", e.target.value)}
              />
            </div>

            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1.5">
              <label className="text-xs font-bold text-amber-900 block">
                ⚙️ Feasibility Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah kita mampu membangun solusi ini secara teknis & operasional?"
                value={formData.feasibilityHypothesis}
                onChange={(e) => handleChange("feasibilityHypothesis", e.target.value)}
              />
            </div>

            <div className="p-3.5 bg-green-50/50 rounded-xl border border-green-100 space-y-1.5">
              <label className="text-xs font-bold text-green-900 block">
                💰 Viability Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah solusi ini memberikan dampak bisnis/efisiensi berkelanjutan?"
                value={formData.viabilityHypothesis}
                onChange={(e) => handleChange("viabilityHypothesis", e.target.value)}
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
                value={formData.ritmeKerja}
                onChange={(e) => handleChange("ritmeKerja", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Pacing Monitoring Bersama Coach
              </label>
              <Input
                value={formData.pacingMonitoring}
                onChange={(e) => handleChange("pacingMonitoring", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Kebutuhan Dukungan (Data / SME / Akses Sistem)
            </label>
            <Textarea
              rows={2}
              placeholder="Sebutkan dukungan divisi atau data yang dibutuhkan untuk validasi..."
              value={formData.kebutuhanDukungan}
              onChange={(e) => handleChange("kebutuhanDukungan", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Risiko Awal & Rencana Mitigasi
            </label>
            <Textarea
              rows={2}
              placeholder="Potensi hambatan yang mungkin dihadapi dan solusinya..."
              value={formData.risikoAwal}
              onChange={(e) => handleChange("risikoAwal", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

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
    </form>
  );
}
