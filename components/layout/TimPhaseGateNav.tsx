"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  MessageSquare,
  Wallet,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateIndo } from "@/lib/utils";
import type { PhaseGateStatus } from "@/app/actions/phase-gate";
import {
  PEGADAIAN_HEADER_GRADIENT_STYLE,
  PHASE_TOKENS,
} from "@/lib/theme/tokens";

export function TimPhaseGateNav({
  phaseGateStatus,
}: {
  phaseGateStatus: PhaseGateStatus;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [lockedModal, setLockedModal] = useState<{
    isOpen: boolean;
    title: string;
    reason: string;
    isComingSoon?: boolean;
  }>({
    isOpen: false,
    title: "",
    reason: "",
    isComingSoon: false,
  });

  const { timId, namaTim, activeSprint, gates } = phaseGateStatus;
  const isDashboardActive = pathname.startsWith(`/tim/${timId}/dashboard`);

  // ── 3 Kotak Fase Resmi ─────────────────────────────────────────────────────
  const gateItems = [
    {
      id: "innovation_setup",
      phase: "Tahap 1",
      name: "Innovation Setup",
      description: "Penyusunan Innovation Charter, Backlog, dan Sprint MVP",
      href: gates.innovationSetup.href,
      icon: FileText,
      unlocked: true, // selalu terbuka
      reason: null,
      badge: gates.innovationSetup.isFilled ? "Terisi" : null,
      token: PHASE_TOKENS.phase1, // ungu
    },
    {
      id: "customer_validation",
      phase: "Tahap 2",
      name: "Customer Validation",
      description: "Uji Problem-Solution Fit dengan early adopter di unit kerja",
      href: gates.customerValidation.href,
      icon: Users,
      unlocked: true, // Selalu bisa diklik/dibuka oleh semua role
      gateDecisionUnlocked: gates.customerValidation.unlocked,
      reason: gates.customerValidation.reason,
      badge: !gates.customerValidation.unlocked ? "Belum Aktif" : null,
      token: PHASE_TOKENS.phase2, // kuning/amber
    },
    {
      id: "market_validation",
      phase: "Tahap 3",
      name: "Market Validation",
      description: "Uji Product-Market Fit, evaluasi bisnis, dan FMI Decision",
      href: gates.marketValidation.href,
      icon: TrendingUp,
      unlocked: true, // Selalu bisa diklik/dibuka oleh semua role
      gateDecisionUnlocked: gates.marketValidation.unlocked,
      reason: gates.marketValidation.reason,
      badge: !gates.marketValidation.unlocked ? "Belum Aktif" : null,
      token: PHASE_TOKENS.phase3, // hijau
    },
  ];

  const handleBoxClick = (item: (typeof gateItems)[0], e: React.MouseEvent) => {
    if (!item.unlocked) {
      e.preventDefault();
      setLockedModal({
        isOpen: true,
        title: item.name,
        reason: item.reason || "Syarat fase sebelumnya belum terpenuhi.",
        isComingSoon: false,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Workspace: Nama Tim, Status Sprint, dan Tombol Akses */}
      <div
        style={PEGADAIAN_HEADER_GRADIENT_STYLE}
        className="rounded-2xl p-5 text-white shadow-md space-y-4 border border-white/10"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-black/20 px-2.5 py-0.5 rounded-md border border-white/15 backdrop-blur-xs">
              Workspace Tim Inovasi
            </span>
            {activeSprint ? (
              <Badge className="text-[10px] font-bold gap-1.5 bg-black/25 text-emerald-200 border border-emerald-400/30 backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  Sprint {activeSprint.nomorSprint} Aktif
                  {activeSprint.tanggalMulaiAktual &&
                    ` — Dimulai ${formatDateIndo(activeSprint.tanggalMulaiAktual)}`}
                </span>
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-black/20 text-white/80 border border-white/20 font-semibold backdrop-blur-xs">
                ⚪ Belum ada sprint aktif
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white leading-tight tracking-tight drop-shadow-xs">
            {namaTim}
          </h1>
        </div>

        {/* Baris Tombol Menu: Dashboard */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/15">
          {/* Tombol Dashboard Tim (Aktif) */}
          <Link
            href={`/tim/${timId}/dashboard`}
            prefetch={false}
            style={{
              boxShadow: isDashboardActive
                ? "0 0 0 2px #FEE388, 0 4px 12px rgba(0, 0, 0, 0.4)"
                : "0 2px 6px rgba(0, 0, 0, 0.25)",
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer select-none ${
              isDashboardActive
                ? "bg-[#FEE388] text-[#0B3D2E] border-[#FEE388] shadow-md scale-102"
                : "bg-[#0B3D2E]/90 hover:bg-[#0B3D2E] text-white border-white/30 hover:border-white/60 shadow-xs"
            }`}
            title="Buka Dashboard Ringkasan & Statistik Real-Time Tim"
          >
            <BarChart3
              className={`h-3.5 w-3.5 shrink-0 ${
                isDashboardActive ? "text-[#0B3D2E]" : "text-[#FEE388]"
              }`}
            />
            <span>Dashboard</span>
            {isDashboardActive ? (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#0B3D2E] text-[#FEE388]">
                Aktif
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-700/80 text-white">
                Baru
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 2. Baris Utama: 3 Kotak Fase Resmi + Garis Pembatas Vertikal + Ruang Diskusi & RAB LPJ (Vertikal) */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5">
        {/* 3 Kotak Fase Resmi (Flex 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 flex-1 min-w-0">
          {gateItems.map((item) => {
            const isActive =
              item.id === "innovation_setup"
                ? pathname.startsWith(`/tim/${timId}/charter`) || pathname.startsWith(`/tim/${timId}/kanban`)
                : item.id === "customer_validation"
                ? pathname.startsWith(`/tim/${timId}/customer-validation`)
                : item.id === "market_validation"
                ? pathname.startsWith(`/tim/${timId}/market-validation`)
                : false;

            const Icon = item.icon;
            const token = item.token;

            if (!item.unlocked) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => handleBoxClick(item, e)}
                  style={{ background: token.solidGradientCss }}
                  className="relative text-left p-5 rounded-2xl text-white shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[130px] border border-white/20"
                  title="Klik untuk melihat syarat pembukaan fase ini"
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block mb-1">
                        {item.phase}
                      </span>
                      <div className="p-2 rounded-xl bg-black/20 text-white backdrop-blur-xs w-fit">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <span className="p-1.5 rounded-full bg-black/30 text-white/90 border border-white/30 backdrop-blur-xs group-hover:bg-black/50 transition-colors shadow-xs mt-0.5">
                      <Lock className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-3 space-y-0.5">
                    <span className="text-sm font-extrabold text-white block drop-shadow-2xs">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-white/75 block font-medium leading-snug">
                      🔒 Terkunci — {item.description}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                style={{ background: token.solidGradientCss }}
                className={`relative p-5 rounded-2xl text-white shadow-sm hover:shadow-lg transition-all flex flex-col justify-between min-h-[130px] group border border-white/20 ${
                  isActive
                    ? "ring-3 ring-white ring-offset-2 ring-offset-slate-100 scale-[1.02] shadow-md"
                    : "opacity-95 hover:opacity-100 hover:scale-[1.01]"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block mb-1">
                      {item.phase}
                    </span>
                    <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs group-hover:bg-white/30 transition-colors w-fit">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {item.badge ? (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs mt-0.5 ${
                        item.badge === "Belum Aktif"
                          ? "bg-black/35 text-white/90 border border-white/25 backdrop-blur-xs"
                          : "bg-white text-emerald-800"
                      }`}
                    >
                      {item.badge === "Terisi" && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-xs mt-0.5">
                      Aktif
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-0.5">
                  <span className="text-sm font-extrabold text-white block drop-shadow-2xs">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-white/85 block font-medium leading-snug">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Garis Pembatas Vertikal (Desktop) */}
        <div className="hidden lg:block w-[2px] bg-gray-300 rounded-full self-stretch my-1" />

        {/* Menu Pendukung Samping: Ruang Diskusi & RAB LPJ (Tersusun Vertikal dengan Warna Selaras) */}
        <div className="flex flex-row lg:flex-col justify-between gap-3 lg:w-48 xl:w-56 shrink-0">
          {/* Ruang Diskusi — Ocean Blue Gradient */}
          {(() => {
            const isDiskusiActive = pathname.startsWith(`/tim/${timId}/diskusi`);
            return (
              <Link
                href={`/tim/${timId}/diskusi`}
                prefetch={false}
                style={{
                  background: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
                }}
                className={`relative p-3.5 sm:p-4 rounded-2xl text-white shadow-sm hover:shadow-lg transition-all flex-1 flex flex-col justify-between group border border-white/20 ${
                  isDiskusiActive
                    ? "ring-3 ring-white ring-offset-2 ring-offset-slate-100 scale-[1.02] shadow-md opacity-100"
                    : "opacity-95 hover:opacity-100 hover:scale-[1.01]"
                }`}
                title="Buka Ruang Diskusi & Ideasi Tim"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block mb-1">
                      Kolaborasi
                    </span>
                    <div className="p-1.5 rounded-xl bg-white/20 text-white backdrop-blur-xs group-hover:bg-white/30 transition-colors w-fit">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  </div>

                  {isDiskusiActive && (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-xs mt-0.5">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <span className="text-sm font-extrabold text-white block drop-shadow-2xs">
                    Ruang Diskusi
                  </span>
                  <span className="text-[11px] text-white/85 block font-medium leading-snug">
                    Ideasi &amp; kolaborasi tim
                  </span>
                </div>
              </Link>
            );
          })()}

          {/* RAB & LPJ — Teal Gradient (Sesuai Phase 4 Token) */}
          {(() => {
            const isKeuanganActive = pathname.startsWith(`/tim/${timId}/keuangan`);
            return (
              <Link
                href={`/tim/${timId}/keuangan`}
                prefetch={false}
                style={{
                  background: PHASE_TOKENS.phase4?.solidGradientCss || "linear-gradient(135deg, #1F98A8 0%, #0E6E7A 100%)",
                }}
                className={`relative p-3.5 sm:p-4 rounded-2xl text-white shadow-sm hover:shadow-lg transition-all flex-1 flex flex-col justify-between group border border-white/20 ${
                  isKeuanganActive
                    ? "ring-3 ring-white ring-offset-2 ring-offset-slate-100 scale-[1.02] shadow-md opacity-100"
                    : "opacity-95 hover:opacity-100 hover:scale-[1.01]"
                }`}
                title="Buka RAB & LPJ (Anggaran & Realisasi Biaya)"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block mb-1">
                      Keuangan
                    </span>
                    <div className="p-1.5 rounded-xl bg-white/20 text-white backdrop-blur-xs group-hover:bg-white/30 transition-colors w-fit">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>

                  {isKeuanganActive && (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-xs mt-0.5">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <span className="text-sm font-extrabold text-white block drop-shadow-2xs">
                    RAB &amp; LPJ
                  </span>
                  <span className="text-[11px] text-white/85 block font-medium leading-snug">
                    Anggaran &amp; realisasi biaya
                  </span>
                </div>
              </Link>
            );
          })()}
        </div>
      </div>

      {/* Dialog Penjelasan Kotak Terkunci */}
      <Dialog
        open={lockedModal.isOpen}
        onOpenChange={(open) =>
          setLockedModal((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Lock className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Fase {lockedModal.title} Masih Terkunci
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 pt-1">
              Fase inkubasi ini memiliki gerbang kelulusan formal yang harus diselesaikan terlebih dahulu.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5 text-xs">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Syarat Pembukaan Gerbang:</span>
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium pl-5.5">
                {lockedModal.reason}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLockedModal((prev) => ({ ...prev, isOpen: false }))
              }
              className="text-xs font-semibold cursor-pointer"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setLockedModal((prev) => ({ ...prev, isOpen: false }));
                router.push(gates.innovationSetup.href);
              }}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Selesaikan Innovation Setup</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
