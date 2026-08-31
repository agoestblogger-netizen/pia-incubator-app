"use client";

import React from "react";
import Link from "next/link";
import {
  TeamDashboardData,
  TeamDashboardActivityItem,
  TeamDashboardPhaseGateBadge,
} from "@/app/actions/dashboard-tim";
import { PhaseGateStatus } from "@/app/actions/phase-gate";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  Layers,
  Users,
  Activity,
  ArrowRight,
  ShieldCheck,
  FileText,
  TrendingUp,
  MessageSquare,
  History,
  CheckSquare,
  Edit3,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardClientProps {
  dashboardData: TeamDashboardData;
  phaseGateStatus: PhaseGateStatus;
}

function formatRelativeTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getActivityIcon(actionType: string) {
  switch (actionType) {
    case "STATUS_CHANGE":
      return <Layers className="h-3.5 w-3.5 text-blue-600" />;
    case "SUBTASK_TOGGLE":
    case "MANDATORY_SUBTASK_SAVE":
      return <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />;
    case "COMMENT_ADD":
      return <MessageSquare className="h-3.5 w-3.5 text-amber-600" />;
    case "CARD_CREATE":
      return <FileText className="h-3.5 w-3.5 text-purple-600" />;
    case "SPRINT_ASSIGN":
      return <Zap className="h-3.5 w-3.5 text-[#0F5132]" />;
    default:
      return <History className="h-3.5 w-3.5 text-gray-500" />;
  }
}

function getActivityActionText(act: TeamDashboardActivityItem) {
  switch (act.actionType) {
    case "STATUS_CHANGE":
      return `mengubah status menjadi "${act.newValue || "Selesai"}"`;
    case "SUBTASK_TOGGLE":
      return `memperbarui progres subtask`;
    case "MANDATORY_SUBTASK_SAVE":
      return `menyimpan data subtask wajib`;
    case "COMMENT_ADD":
      return `menambahkan komentar`;
    case "CARD_CREATE":
      return `membuat kartu baru`;
    case "SPRINT_ASSIGN":
      return `mengalokasikan ke ${act.newValue || "Sprint"}`;
    case "FIELD_UPDATE":
      return `memperbarui ${act.fieldName || "informasi kartu"}`;
    default:
      return `memperbarui aktivitas`;
  }
}

// ── Donut Chart warna per status kolom (SAMA PERSIS dengan Board Sprint: 3 Kolom) ──
const DONUT_COLORS = {
  todo: "#94a3b8",       // slate-400 — To Do / Backlog
  in_progress: "#f59e0b", // amber-500 — In Progress
  done: "#10b981",       // emerald-500 — Done
};

// Custom tooltip for donut
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-gray-900 text-white border border-gray-700 rounded-xl shadow-xl px-3 py-1.5 text-xs font-bold">
      <span style={{ color: entry.payload.fill }}>● {entry.name}</span>: {entry.value} kartu
    </div>
  );
}

export function DashboardClient({
  dashboardData,
  phaseGateStatus,
}: DashboardClientProps) {
  const {
    timId,
    namaTim,
    activeSprintNumber,
    activeSprintText,
    activeSprintGoal,
    cardsCompletedInActiveSprint,
    totalCardsInActiveSprint,
    mandatoryCardsPendingCount,
    approachingDeadlineCardsCount,
    cardDistribution,
    teamCapacity,
    recentActivities,
    phaseGateBadges,
  } = dashboardData;

  const hasActiveSprint = activeSprintNumber !== null;
  const sprintProgressPct =
    totalCardsInActiveSprint > 0
      ? Math.round((cardsCompletedInActiveSprint / totalCardsInActiveSprint) * 100)
      : 0;

  // Donut chart data (3 statuses: To Do, In Progress, Done)
  const donutData = [
    { name: "To Do", value: cardDistribution.todo, fill: DONUT_COLORS.todo },
    { name: "In Progress", value: cardDistribution.in_progress, fill: DONUT_COLORS.in_progress },
    { name: "Done", value: cardDistribution.done, fill: DONUT_COLORS.done },
  ].filter((d) => d.value > 0);

  const donutEmpty = totalCardsInActiveSprint === 0 || donutData.length === 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Phase Gate Navigation Bar ── */}
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      {/* ── 2. Header & Banner Dashboard ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0B3D2E] via-[#0e4e3b] to-[#145d47] p-5 rounded-2xl shadow-md border border-[#1b6b52]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#3E9463]/40 text-[#C1F2CE] border border-[#3E9463]/60">
              <Activity className="h-3 w-3 text-[#A8EDBB]" />
              <span>Real-Time Team Dashboard</span>
            </span>
            <span className="text-xs font-semibold text-[#88D4A4]">
              Pantau sprint, kapasitas, dan gerbang kelolosan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Dashboard Perkembangan Inovasi
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/tim/${timId}/kanban`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#3E9463] hover:bg-[#2d7a50] text-white transition-all shadow-md hover:shadow-lg"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Buka Board Sprint</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 3. BLOK A: RINGKASAN 4-ANGKA — SOLID & SATURATED BOLD COLORS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Sprint Aktif — INDIGO SOLID */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 shadow-md hover:shadow-lg transition-all text-white border border-indigo-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider">Sprint Aktif</span>
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {activeSprintText}
          </p>
          <p className="text-xs text-indigo-200 font-medium mt-1 truncate">
            {hasActiveSprint ? "Sedang dalam tahap eksekusi" : "Belum ada sprint aktif"}
          </p>
        </div>

        {/* Metric 2: Kartu Selesai — EMERALD SOLID */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 shadow-md hover:shadow-lg transition-all text-white border border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-emerald-200 uppercase tracking-wider">Kartu Selesai</span>
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {cardsCompletedInActiveSprint}
            <span className="text-xl text-emerald-200 font-bold ml-1">
              / {totalCardsInActiveSprint}
            </span>
          </p>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            {totalCardsInActiveSprint > 0
              ? `${sprintProgressPct}% terselesaikan di sprint aktif`
              : "Tidak ada kartu di sprint ini"}
          </p>
        </div>

        {/* Metric 3: Kartu Wajib Belum Isi — ROSE SOLID */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 p-5 shadow-md hover:shadow-lg transition-all text-white border border-rose-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-rose-200 uppercase tracking-wider">Wajib Belum Isi</span>
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {mandatoryCardsPendingCount}
            <span className="text-sm text-rose-200 font-bold ml-1.5 uppercase">Kartu</span>
          </p>
          <p className="text-xs text-rose-100 font-medium mt-1">
            {mandatoryCardsPendingCount === 0
              ? "Semua subtask wajib telah lengkap!"
              : "Perlu diisi via subtask wajib (CV/MV)"}
          </p>
        </div>

        {/* Metric 4: Tenggat Mendekat — AMBER SOLID */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 shadow-md hover:shadow-lg transition-all text-white border border-amber-400/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-amber-100 uppercase tracking-wider">Tenggat Mendekat</span>
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {approachingDeadlineCardsCount}
            <span className="text-sm text-amber-100 font-bold ml-1.5 uppercase">Kartu</span>
          </p>
          <p className="text-xs text-amber-100 font-medium mt-1">
            {approachingDeadlineCardsCount === 0
              ? "Tidak ada kartu berisiko telat"
              : "Jatuh tempo dlm 3 hari / lewat batas"}
          </p>
        </div>
      </div>

      {/* ── 4. BLOK B: PROGRESS SPRINT AKTIF — PEKAT & EMAS PEGADAIAN ── */}
      <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#E3F0E6] flex items-center justify-center">
                <Target className="h-4 w-4 text-[#0B3D2E]" />
              </div>
              <CardTitle className="text-sm font-extrabold text-gray-900">
                Progress Sprint Aktif {hasActiveSprint && `(${activeSprintText})`}
              </CardTitle>
            </div>
            {hasActiveSprint && (
              <div className="flex items-center gap-2">
                <Badge className="bg-[#0B3D2E] text-white border-[#0B3D2E] font-extrabold text-xs px-3 py-1">
                  {sprintProgressPct}% Selesai
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {hasActiveSprint ? (
            <>
              {/* Sprint Goal — Highlight & Large Typography */}
              <div className="p-4 bg-gradient-to-r from-[#EAF5EC] via-[#F0F7F1] to-white rounded-xl border border-[#C9E4D0] border-l-4 border-l-[#3E9463] shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-[#0B3D2E] text-white shadow-xs">
                    <Target className="h-3.5 w-3.5 text-[#A8EDBB]" />
                    <span>Sprint Goal</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#3E9463]">
                    Fokus Utama Tim di Sprint Ini
                  </span>
                </div>
                <p className="text-sm sm:text-base font-extrabold text-[#0B3D2E] leading-snug tracking-tight pl-1">
                  {activeSprintGoal ? `"${activeSprintGoal}"` : "Sprint goal belum ditentukan pada perencanaan sprint ini."}
                </p>
              </div>

              {/* Progress Bar — gradient hijau ke emas Pegadaian */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>Tingkat Penyelesaian Kartu</span>
                  <span>
                    {cardsCompletedInActiveSprint} dari {totalCardsInActiveSprint} kartu selesai
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${sprintProgressPct}%`,
                      background: "linear-gradient(90deg, #0B3D2E 0%, #3E9463 45%, #D4AF37 80%, #B8860B 100%)",
                      boxShadow: sprintProgressPct > 0 ? "0 1px 8px rgba(212, 175, 55, 0.6)" : "none",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-2">
              <div className="h-10 w-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-gray-700">
                Belum ada sprint yang sedang aktif
              </p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Mulai sprint melalui panel Sprint Planning di Board Sprint untuk mengaktifkan pelacakan progress real-time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. BLOK C & D: DISTRIBUSI KARTU (DONUT CHART) & KAPASITAS TIM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOK C: Distribusi Kartu — Donut Chart */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-extrabold text-gray-900">
                    Distribusi Status Kartu
                  </CardTitle>
                  <CardDescription className="text-[11px] text-gray-500">
                    Sebaran status kartu pada sprint aktif
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {donutEmpty ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="relative flex items-center justify-center">
                    <svg width={130} height={130} viewBox="0 0 130 130">
                      <circle cx={65} cy={65} r={46} fill="none" stroke="#e5e7eb" strokeWidth={18} />
                      <circle cx={65} cy={65} r={28} fill="#f9fafb" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-gray-400">0</span>
                      <span className="text-[10px] font-semibold text-gray-400">Kartu</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic text-center">
                    Belum ada kartu yang dialokasikan ke sprint ini.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Donut Chart with total inside */}
                  <div className="relative shrink-0 flex items-center justify-center" style={{ width: 170, height: 170 }}>
                    <ResponsiveContainer width={170} height={170}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-gray-900 leading-none">
                        {totalCardsInActiveSprint}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 mt-0.5 uppercase tracking-wide">
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="flex-1 space-y-2 w-full">
                    {/* To Do */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: DONUT_COLORS.todo }} />
                        <span className="text-xs font-bold text-slate-700">To Do</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">{cardDistribution.todo}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          ({totalCardsInActiveSprint > 0 ? Math.round((cardDistribution.todo / totalCardsInActiveSprint) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    {/* In Progress */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: DONUT_COLORS.in_progress }} />
                        <span className="text-xs font-bold text-amber-900">In Progress</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-amber-900">{cardDistribution.in_progress}</span>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          ({totalCardsInActiveSprint > 0 ? Math.round((cardDistribution.in_progress / totalCardsInActiveSprint) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    {/* Done */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: DONUT_COLORS.done }} />
                        <span className="text-xs font-bold text-emerald-900">Done / Selesai</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-emerald-900">{cardDistribution.done}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          ({totalCardsInActiveSprint > 0 ? Math.round((cardDistribution.done / totalCardsInActiveSprint) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* BLOK D: Kapasitas Tim (Sprint Aktif) */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[#0B3D2E]">
                    <Users className="h-4 w-4 text-[#3E9463]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-gray-900">
                      Kapasitas Tim
                    </CardTitle>
                    <CardDescription className="text-[11px] text-gray-500">
                      Alokasi beban kerja per anggota {hasActiveSprint ? activeSprintText : "Sprint"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200">
                  {teamCapacity.filter((c) => c.isIncludedInCapacity).length} Anggota Aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {teamCapacity.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  Belum ada data anggota tim terdaftar.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {teamCapacity.map((member) => {
                    const maxSubtask = member.kapasitasSubtask;
                    const count = member.subtasksCount;
                    const isOver = maxSubtask !== null && count > maxSubtask;
                    const isFull = maxSubtask !== null && count === maxSubtask;
                    const pct = maxSubtask !== null && maxSubtask > 0 ? Math.min(100, Math.round((count / maxSubtask) * 100)) : 0;

                    return (
                      <div
                        key={member.anggotaTimId}
                        className={`p-2.5 rounded-xl border space-y-1.5 ${
                          isOver
                            ? "bg-red-50/60 border-red-200"
                            : isFull
                            ? "bg-amber-50/60 border-amber-200"
                            : "bg-gray-50/70 border-gray-200/80"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-gray-900 truncate block">
                              {member.nama}
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              {member.roleName} &bull; {member.jabatan}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`font-extrabold text-xs ${
                                isOver
                                  ? "text-red-600"
                                  : isFull
                                  ? "text-amber-600"
                                  : "text-[#0B3D2E]"
                              }`}
                            >
                              {count}{" "}
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {maxSubtask !== null ? `/ ${maxSubtask} subtask` : "subtask"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {maxSubtask !== null && (
                          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? "bg-red-500" : isFull ? "bg-amber-500" : "bg-[#3E9463]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* ── 6. BLOK E & F: AKTIVITAS TERBARU & STATUS GERBANG FASE (2 Kolom) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOK E: Aktivitas Terbaru (Riwayat Log) */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-extrabold text-gray-900">
                    Aktivitas Terbaru
                  </CardTitle>
                  <CardDescription className="text-[11px] text-gray-500">
                    5 riwayat pembaruan kartu &amp; subtask tim
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                Belum ada aktivitas tercatat pada kartu Board Sprint tim ini.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 text-xs"
                  >
                    <div className="p-1.5 bg-white rounded-lg border border-gray-200 shrink-0 mt-0.5">
                      {getActivityIcon(act.actionType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 leading-snug text-xs">
                        <strong className="font-bold text-[#0B3D2E]">{act.userName}</strong>{" "}
                        <span>{getActivityActionText(act)}</span> pada kartu{" "}
                        <strong className="text-gray-900 font-semibold">
                          &quot;{act.cardJudul}&quot;
                        </strong>
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BLOK F: Status Gerbang Fase — Bold Solid Per-Fase Colors */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[#0B3D2E]">
                <ShieldCheck className="h-4 w-4 text-[#3E9463]" />
              </div>
              <div>
                <CardTitle className="text-sm font-extrabold text-gray-900">
                  Status Gerbang Fase
                </CardTitle>
                <CardDescription className="text-[11px] text-gray-500">
                  Kelolosan gerbang evaluasi (Phase Gate 1, 2, &amp; 3)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {phaseGateBadges.map((badge) => {
              const isSuccess = badge.variant === "success";
              const phaseKey = badge.phaseKey;
              const isInnovationSetup = phaseKey === "innovation_setup";
              const isCustomerValidation = phaseKey === "customer_validation";
              const isMarketValidation = phaseKey === "market_validation";

              // Solid row background + icon color per fase
              const rowStyle = isInnovationSetup
                ? "bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-indigo-700"
                : isCustomerValidation
                ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white border-amber-600"
                : isMarketValidation
                ? "bg-gradient-to-r from-[#0B3D2E] to-[#145d47] text-white border-[#0B3D2E]"
                : "bg-gray-100 border-gray-200 text-gray-700";

              const badgeStyle = isSuccess
                ? "bg-white/25 text-white border-white/40 font-extrabold shadow-xs"
                : "bg-black/25 text-white border-white/20 font-extrabold";

              return (
                <div
                  key={badge.phaseKey}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${rowStyle}`}
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-extrabold block tracking-wide">
                      {badge.phaseName}
                    </span>
                    <p className="text-[11px] opacity-85 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge
                      className={`text-xs px-2.5 py-1 border ${badgeStyle}`}
                    >
                      {badge.statusText}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

