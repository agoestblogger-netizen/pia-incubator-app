"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  UserCheck,
  TrendingUp,
  Wallet,
  Award,
  Lock,
  Kanban,
  CheckCircle2,
  AlertTriangle,
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
  }>({
    isOpen: false,
    title: "",
    reason: "",
  });

  const { timId, namaTim, activeSprint, gates } = phaseGateStatus;
  const isMainKanban = pathname === `/tim/${timId}`;

  const gateItems = [
    {
      id: "innovation_setup",
      name: "Innovation Setup",
      description: "Charter & hipotesis DFV",
      href: gates.innovationSetup.href,
      icon: FileText,
      unlocked: gates.innovationSetup.unlocked,
      reason: gates.innovationSetup.reason,
      badge: gates.innovationSetup.isFilled ? "Terisi" : null,
      token: PHASE_TOKENS.phase1,
    },
    {
      id: "customer_validation",
      name: "Customer Validation",
      description: "Rencana & uji early adopters",
      href: gates.customerValidation.href,
      icon: UserCheck,
      unlocked: gates.customerValidation.unlocked,
      reason: gates.customerValidation.reason,
      badge: null,
      token: PHASE_TOKENS.phase2,
    },
    {
      id: "market_validation",
      name: "Market Validation",
      description: "Rilis MVP & uji pasar",
      href: gates.marketValidation.href,
      icon: TrendingUp,
      unlocked: gates.marketValidation.unlocked,
      reason: gates.marketValidation.reason,
      badge: null,
      token: PHASE_TOKENS.phase3,
    },
    {
      id: "keuangan",
      name: "RAB & LPJ",
      description: "Anggaran & realisasi biaya",
      href: gates.keuangan.href,
      icon: Wallet,
      unlocked: gates.keuangan.unlocked,
      reason: gates.keuangan.reason,
      badge: null,
      token: PHASE_TOKENS.phase4,
    },
    {
      id: "governance",
      name: "FMI & Hasil",
      description: "Keputusan forum manajemen",
      href: gates.governance.href,
      icon: Award,
      unlocked: gates.governance.unlocked,
      reason: gates.governance.reason,
      badge: null,
      token: PHASE_TOKENS.phase5,
    },
  ];

  const handleBoxClick = (item: (typeof gateItems)[0], e: React.MouseEvent) => {
    if (!item.unlocked) {
      e.preventDefault();
      setLockedModal({
        isOpen: true,
        title: item.name,
        reason: item.reason || "Syarat fase sebelumnya belum terpenuhi.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Workspace: Nama Tim, Status Sprint, dan Navigasi Ringkas (Overview + Kanban) */}
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

        {/* Baris Tombol Navigasi Cepat: Overview Tim & Ke Kanban Board & Roadmap */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/15">
          <Link
            href={gates.overview.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              pathname === gates.overview.href
                ? "bg-white text-[#0B3D2E] font-extrabold shadow-md"
                : "bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-xs"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview Tim</span>
          </Link>

          <Link
            href={`/tim/${timId}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isMainKanban
                ? "bg-white text-[#0B3D2E] font-extrabold shadow-md"
                : "bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-xs"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Ke Kanban Board & Roadmap</span>
          </Link>
        </div>
      </div>

      {/* 2. Grid 5 Kotak Menu Gerbang Fase (Solid Pekat + Lock icon saat terkunci) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {gateItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const token = item.token;

          if (!item.unlocked) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleBoxClick(item, e)}
                className={`relative text-left p-3.5 rounded-2xl ${token.solidGradient} text-white shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[96px] border border-white/20`}
                title="Klik untuk melihat syarat pembukaan fase ini"
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <div className="p-1.5 rounded-xl bg-black/20 text-white backdrop-blur-xs">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="p-1.5 rounded-full bg-black/30 text-white/90 border border-white/30 backdrop-blur-xs group-hover:bg-black/50 transition-colors shadow-xs">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="mt-2 space-y-0.5">
                  <span className="text-xs font-extrabold text-white block line-clamp-1 drop-shadow-2xs">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-white/80 block line-clamp-1 font-medium">
                    🔒 Terkunci
                  </span>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative p-3.5 rounded-2xl ${token.solidGradient} text-white shadow-sm hover:shadow-lg transition-all flex flex-col justify-between min-h-[96px] group border border-white/20 ${
                isActive
                  ? "ring-3 ring-white ring-offset-2 ring-offset-slate-100 scale-[1.02] shadow-md"
                  : "opacity-95 hover:opacity-100 hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="p-1.5 rounded-xl bg-white/20 text-white backdrop-blur-xs group-hover:bg-white/30 transition-colors">
                  <Icon className="h-4 w-4" />
                </div>

                {item.badge ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-emerald-800 shadow-xs">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-xs">
                    Aktif
                  </span>
                ) : null}
              </div>

              <div className="mt-2 space-y-0.5">
                <span className="text-xs font-extrabold text-white block line-clamp-1 drop-shadow-2xs">
                  {item.name}
                </span>
                <span className="text-[10px] text-white/85 block line-clamp-1 font-medium">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
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
                Syarat Pembukaan Gerbang:
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
              className="text-xs font-semibold"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setLockedModal((prev) => ({ ...prev, isOpen: false }));
                router.push(`/tim/${timId}`);
              }}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Buka Kanban Board</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
