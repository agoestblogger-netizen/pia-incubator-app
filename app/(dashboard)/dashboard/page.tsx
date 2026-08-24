import Link from "next/link";
import { getDashboardData } from "@/app/actions/dashboard";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import {
  Plus,
  Rocket,
  ArrowRight,
  Sparkles,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Activity,
  Calendar,
  Award,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateIndo } from "@/lib/utils";

import {
  PEGADAIAN_HEADER_GRADIENT_STYLE,
  PHASE_TOKENS,
  getMedalToken,
} from "@/lib/theme/tokens";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  const dashboardData = await getDashboardData(currentUser);
  const canCreateTeam = currentUser ? await hasPermission(currentUser, 'tim.manage') : false;
  const isGlobalUser = Boolean(currentUser?.hasGlobalScope || (currentUser?.globalRoles && currentUser.globalRoles.length > 0));

  const { teams, aggregates } = dashboardData;

  const getPhaseBadgeVariant = (stageNumber: number) => {
    switch (stageNumber) {
      case 3:
        return "gold";
      case 2:
        return "default";
      case 1:
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner Gradient Pegadaian */}
      <div
        style={PEGADAIAN_HEADER_GRADIENT_STYLE}
        className="rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-[#E6CA65]" />
            Program Inkubasi PIA Season 12 (2026)
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight drop-shadow-xs">
            Dashboard Akselerasi Inovasi
          </h1>
          <p className="text-sm text-green-100/90 leading-relaxed font-normal">
            Selamat datang di portal inkubasi Pegadaian Innovation Award. Pantau progres sprint berjalan, validasi pelanggan, validasi pasar, dan mitigasi task terlambat.
          </p>
        </div>

        {canCreateTeam && (
          <Link href="/dashboard/tim-baru">
            <Button
              className="flex items-center gap-2 font-bold shadow-lg bg-[#0F5132] hover:bg-[#1B7A4D] text-white border border-white/20"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              <span>Daftarkan Tim Inovator</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Ringkasan Agregat 4 Angka (Khusus Role Global: Admin & Divisi IC) */}
      {isGlobalUser && aggregates.totalTeams > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Belum Mulai (Solid Slate) */}
          <div
            style={{ background: "linear-gradient(135deg, #475569 0%, #1E293B 100%)" }}
            className="p-4 sm:p-5 rounded-2xl text-white shadow-md border border-slate-700 space-y-1.5"
          >
            <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
              Belum Mulai
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white font-mono-stats drop-shadow-xs">
                {aggregates.totalBelumMulai}
              </span>
              <span className="text-xs text-slate-300 font-bold">Tim</span>
            </div>
            <p className="text-[11px] text-slate-300/90 font-medium">Tim baru / belum isi Charter</p>
          </div>

          {/* Card 2: Tahap 1 Setup (Solid Ungu #7B6EF0 → #5142D6) */}
          <div
            style={{ background: "linear-gradient(135deg, #7B6EF0 0%, #5142D6 100%)" }}
            className="p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#5142D6]/40 space-y-1.5"
          >
            <span className="text-[11px] font-extrabold text-purple-200 uppercase tracking-wider block">
              Tahap 1: Setup
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white font-mono-stats drop-shadow-xs">
                {aggregates.totalInnovationSetup}
              </span>
              <span className="text-xs text-purple-200 font-bold">Tim</span>
            </div>
            <p className="text-[11px] text-purple-100 font-medium">Charter & Sprint Planning</p>
          </div>

          {/* Card 3: Tahap 2 Cust. Validation (Solid Amber #E29A2E → #B8720E) */}
          <div
            style={{ background: "linear-gradient(135deg, #E29A2E 0%, #B8720E 100%)" }}
            className="p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#B8720E]/40 space-y-1.5"
          >
            <span className="text-[11px] font-extrabold text-amber-200 uppercase tracking-wider block">
              Tahap 2: Cust. Validation
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white font-mono-stats drop-shadow-xs">
                {aggregates.totalCustomerValidation}
              </span>
              <span className="text-xs text-amber-200 font-bold">Tim</span>
            </div>
            <p className="text-[11px] text-amber-100 font-medium">Early Adopter & User Testing</p>
          </div>

          {/* Card 4: Tahap 3 Market Validation (Solid Emerald #22B06E → #0E8C55) */}
          <div
            style={{ background: "linear-gradient(135deg, #22B06E 0%, #0E8C55 100%)" }}
            className="p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#0E8C55]/40 space-y-1.5"
          >
            <span className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider block">
              Tahap 3: Market Validation
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white font-mono-stats drop-shadow-xs">
                {aggregates.totalMarketValidation}
              </span>
              <span className="text-xs text-emerald-200 font-bold">Tim</span>
            </div>
            <p className="text-[11px] text-emerald-100 font-medium">Pilot & Market Launch</p>
          </div>
        </div>
      )}

      {/* Grid Tim Inovator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isGlobalUser ? "Daftar Tim Inovator Aktif" : "Daftar Tim Inovator Saya"}
            </h2>
            <p className="text-xs text-gray-500">
              {isGlobalUser
                ? `Total ${teams.length} tim sedang dalam tahap inkubasi dan validasi`
                : `Menampilkan ${teams.length} tim yang ditugaskan kepada Anda`}
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center bg-white/60">
            {isGlobalUser ? (
              <>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#0F5132] mb-3">
                  <Rocket className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Belum Ada Tim Inovator
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Mulai program inkubasi dengan mendaftarkan tim finalis PIA Season 12.
                </p>
                {canCreateTeam && (
                  <Link href="/dashboard/tim-baru">
                    <Button variant="default" size="sm">
                      Daftarkan Tim Pertama
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 mb-3">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Anda Belum Ter-assign ke Tim Mana Pun
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Akun Anda belum memiliki penugasan role pada tim inovator manapun. Silakan hubungi <strong>Admin Innovation Center</strong> untuk mendapatkan penugasan tim.
                </p>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(({ tim, fase, activeSprint, activeCardsCount, overdueTasksCount, latestActivityText }) => {
              const medal = getMedalToken(tim.klasifikasiInovasi);

              return (
                <Card
                  key={tim.id}
                  style={{
                    borderTop: `5px solid ${medal.borderColor}`,
                    boxShadow: `0 4px 14px ${medal.shadowColor}`,
                  }}
                  className="hover:shadow-lg transition-all border-gray-200 bg-white group flex flex-col justify-between overflow-hidden rounded-2xl"
                >
                  <CardHeader className="pb-3 space-y-2.5">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F5132]/10 text-[#0F5132]">
                        {tim.kategoriPia === 'BI' ? 'Breakthrough Innovation' : 'Business Case'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {overdueTasksCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{overdueTasksCount} task terlambat</span>
                          </span>
                        )}

                        <Badge
                          variant={
                            tim.status === 'aktif'
                              ? 'success'
                              : tim.status === 'selesai'
                              ? 'gold'
                              : 'secondary'
                          }
                          className="capitalize text-[10px]"
                        >
                          {tim.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Title & Classification */}
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-[#0F5132] transition-colors line-clamp-2">
                        {tim.namaProyekInovasi}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-2xs"
                          style={{ background: medal.bgGradient }}
                        >
                          {medal.iconType === "diamond" ? (
                            <Gem className="h-3 w-3 text-white" />
                          ) : (
                            <Award className="h-3 w-3 text-white" />
                          )}
                          <span>{medal.name}</span>
                        </span>
                        <span className="text-gray-300">&bull;</span>
                        <Badge variant={getPhaseBadgeVariant(fase.stageNumber)} className="text-[9px] py-0 font-bold">
                          {fase.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Active Sprint Section & Progress Bar */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    {activeSprint ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            Sprint {activeSprint.nomorSprint} (Aktif)
                          </span>
                          <span className="font-extrabold text-[#0F5132]">
                            {activeSprint.progressPercentage}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#0F5132] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${activeSprint.progressPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span className="truncate max-w-[180px]" title={activeSprint.tujuan || undefined}>
                            {activeSprint.tujuan || `Sprint ${activeSprint.nomorSprint}`}
                          </span>
                          <span>
                            {activeSprint.doneCards}/{activeSprint.totalCards} Selesai
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between py-1 text-xs text-gray-400">
                        <span className="italic flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Sprint belum dimulai
                        </span>
                        <span className="text-[10px] bg-gray-200/80 px-2 py-0.5 rounded text-gray-600 font-semibold">
                          Belum Aktif
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Footer */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-gray-50/75 border border-gray-100 space-y-0.5">
                      <span className="text-gray-400 block text-[10px]">Task Aktif</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1 text-xs">
                        <Layers className="h-3 w-3 text-gray-400" />
                        {activeCardsCount} Task
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50/75 border border-gray-100 space-y-0.5">
                      <span className="text-gray-400 block text-[10px]">Aktivitas Terakhir</span>
                      <span className="font-semibold text-gray-700 block truncate text-xs">
                        {latestActivityText}
                      </span>
                    </div>
                  </div>

                  <Link href={`/tim/${tim.id}`} className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-between text-xs font-semibold hover:bg-[#0F5132] hover:text-white group-hover:border-[#0F5132] transition-all"
                    >
                      <span>Buka Workspace Tim</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
