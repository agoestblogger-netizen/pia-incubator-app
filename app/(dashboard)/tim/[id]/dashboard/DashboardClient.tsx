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

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Phase Gate Navigation Bar ── */}
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      {/* ── 2. Header & Banner Dashboard ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#C9E4D0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#0B3D2E] text-white">
              <Activity className="h-3 w-3 text-[#3E9463]" />
              <span>Real-Time Team Dashboard</span>
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Pantau sprint, kapasitas, dan gerbang kelolosan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B3D2E]">
            Dashboard Perkembangan Inovasi
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/tim/${timId}/kanban`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#3E9463] hover:bg-[#0B3D2E] text-white transition-all shadow-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Buka Kanban Board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 3. BLOK A: RINGKASAN 4-ANGKA (Grid 4 Kolom) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Sprint Aktif */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-gradient-to-br from-white to-[#F0F7F1] shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Sprint Aktif</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0B3D2E]">
                <Zap className="h-4 w-4 fill-[#3E9463] text-[#3E9463]" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-[#0B3D2E] tracking-tight">
                {activeSprintText}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                {hasActiveSprint ? "Sedang dalam tahap eksekusi" : "Belum ada sprint aktif"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Kartu Selesai */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-gradient-to-br from-white to-[#F0F7F1] shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Kartu Selesai</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {cardsCompletedInActiveSprint}{" "}
                <span className="text-base text-gray-400 font-semibold">
                  / {totalCardsInActiveSprint}
                </span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {totalCardsInActiveSprint > 0
                  ? `${sprintProgressPct}% terselesaikan di sprint aktif`
                  : "Tidak ada kartu di sprint ini"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Kartu Wajib Belum Isi */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-gradient-to-br from-white to-[#FFFBF0] shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Kartu Wajib Belum Isi</span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-700" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-amber-900 tracking-tight">
                {mandatoryCardsPendingCount}{" "}
                <span className="text-xs font-bold text-amber-700 uppercase tracking-normal">
                  Kartu
                </span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {mandatoryCardsPendingCount === 0
                  ? "Semua subtask wajib telah lengkap!"
                  : "Perlu diisi via subtask wajib (CV/MV)"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Tenggat Mendekat */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-gradient-to-br from-white to-[#FFF5F5] shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Tenggat Mendekat</span>
              <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <Clock className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-rose-900 tracking-tight">
                {approachingDeadlineCardsCount}{" "}
                <span className="text-xs font-bold text-rose-700 uppercase tracking-normal">
                  Kartu
                </span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {approachingDeadlineCardsCount === 0
                  ? "Tidak ada kartu berisiko telat"
                  : "Jatuh tempo dlm 3 hari / lewat batas"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. BLOK B: PROGRESS SPRINT AKTIF ── */}
      <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#E3F0E6] flex items-center justify-center text-[#0B3D2E]">
                <Target className="h-4 w-4 text-[#3E9463]" />
              </div>
              <CardTitle className="text-sm font-extrabold text-gray-900">
                Progress Sprint Aktif {hasActiveSprint && `(${activeSprintText})`}
              </CardTitle>
            </div>
            {hasActiveSprint && (
              <Badge className="bg-emerald-100 text-[#0B3D2E] border-emerald-300 font-extrabold text-xs">
                {sprintProgressPct}% Selesai
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {hasActiveSprint ? (
            <>
              {/* Sprint Goal */}
              <div className="p-3 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0B3D2E]">
                  <Target className="h-3.5 w-3.5 text-[#3E9463]" />
                  <span>Sprint Goal:</span>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed pl-5 italic">
                  {activeSprintGoal ? `"${activeSprintGoal}"` : "Sprint goal belum ditentukan pada perencanaan sprint ini."}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>Tingkat Penyelesaian Kartu</span>
                  <span>
                    {cardsCompletedInActiveSprint} dari {totalCardsInActiveSprint} kartu selesai
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#3E9463] to-[#0B3D2E] transition-all duration-500 rounded-full"
                    style={{ width: `${sprintProgressPct}%` }}
                  />
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
                Mulai sprint melalui panel Sprint Planning di Kanban Board untuk mengaktifkan pelacakan progress real-time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. BLOK C & D: DISTRIBUSI KARTU & KAPASITAS TIM (2 Kolom) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOK C: Distribusi Kartu di Sprint Aktif */}
        <Card className="rounded-2xl border border-[#C9E4D0] bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-extrabold text-gray-900">
                    Distribusi Status Kartu
                  </CardTitle>
                  <CardDescription className="text-[11px] text-gray-500">
                    Sebaran kartu kanban pada sprint aktif
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {totalCardsInActiveSprint === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  Belum ada kartu yang dialokasikan ke sprint ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* To Do */}
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                      <span className="text-xs font-bold text-gray-700">To Do / Backlog</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-900">
                        {cardDistribution.todo}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({Math.round((cardDistribution.todo / totalCardsInActiveSprint) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-amber-900">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-amber-900">
                        {cardDistribution.in_progress}
                      </span>
                      <span className="text-[10px] text-amber-700">
                        ({Math.round((cardDistribution.in_progress / totalCardsInActiveSprint) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Review */}
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-blue-900">Review / QA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-blue-900">
                        {cardDistribution.review}
                      </span>
                      <span className="text-[10px] text-blue-700">
                        ({Math.round((cardDistribution.review / totalCardsInActiveSprint) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Done */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">Done / Selesai</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-900">
                        {cardDistribution.done}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        ({Math.round((cardDistribution.done / totalCardsInActiveSprint) * 100)}%)
                      </span>
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
                        className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-200/80 space-y-1.5"
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
                          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
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
                <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
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
                Belum ada aktivitas tercatat pada kartu kanban tim ini.
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

        {/* BLOK F: Status Gerbang Fase (Phase Gate) */}
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
              const isWarning = badge.variant === "warning";
              const isInfo = badge.variant === "info";

              return (
                <div
                  key={badge.phaseKey}
                  className="p-3 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-gray-900 block">
                      {badge.phaseName}
                    </span>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge
                      className={`text-xs font-extrabold px-2.5 py-1 ${
                        isSuccess
                          ? "bg-emerald-100 text-[#0B3D2E] border-emerald-300"
                          : isWarning
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : isInfo
                          ? "bg-blue-100 text-blue-900 border-blue-300"
                          : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
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
