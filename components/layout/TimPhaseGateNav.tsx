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
  ArrowLeft,
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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F5132] bg-[#0F5132]/10 px-2.5 py-0.5 rounded-md">
              Workspace Tim Inovasi
            </span>
            {activeSprint ? (
              <Badge variant="success" className="text-[10px] font-bold gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  Sprint {activeSprint.nomorSprint} Aktif
                  {activeSprint.tanggalMulaiAktual &&
                    ` — Dimulai ${formatDateIndo(activeSprint.tanggalMulaiAktual)}`}
                </span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] text-gray-500 font-semibold">
                ⚪ Belum ada sprint aktif
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
            {namaTim}
          </h1>
        </div>

        {/* Baris Tombol Navigasi Cepat: Overview Tim & Ke Kanban Board & Roadmap */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Link
            href={gates.overview.href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
              pathname === gates.overview.href
                ? "bg-[#0F5132] text-white border-[#0F5132]"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview Tim</span>
          </Link>

          <Link
            href={`/tim/${timId}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
              isMainKanban
                ? "bg-[#0F5132] text-white border-[#0F5132]"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Ke Kanban Board & Roadmap</span>
          </Link>
        </div>
      </div>

      {/* 2. Grid 5 Kotak Menu Gerbang Fase (Dimulai dari Innovation Setup di Paling Kiri) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {gateItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (!item.unlocked) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => handleBoxClick(item, e)}
                className="relative text-left p-3.5 rounded-2xl border border-dashed border-gray-300 bg-gray-100/70 text-gray-400 opacity-60 hover:opacity-80 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-not-allowed group flex flex-col justify-between min-h-[90px]"
                title="Klik untuk melihat syarat pembukaan fase ini"
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <div className="p-1.5 rounded-lg bg-gray-200/80 text-gray-500">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="p-1 rounded-full bg-gray-200 text-gray-600 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                    <Lock className="h-3 w-3" />
                  </span>
                </div>

                <div className="mt-2 space-y-0.5">
                  <span className="text-xs font-bold text-gray-600 block line-clamp-1">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-400 block line-clamp-1">
                    Fase Terkunci
                  </span>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] shadow-2xs group ${
                isActive
                  ? "bg-green-50/80 border-[#0F5132] ring-2 ring-[#0F5132]/20"
                  : "bg-white border-gray-200 hover:border-[#0F5132]/60 hover:shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isActive
                      ? "bg-[#0F5132] text-white"
                      : "bg-[#0F5132]/10 text-[#0F5132] group-hover:bg-[#0F5132] group-hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {item.badge && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {item.badge}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-0.5">
                <span
                  className={`text-xs font-extrabold block line-clamp-1 ${
                    isActive ? "text-[#0F5132]" : "text-gray-900"
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-[10px] text-gray-400 block line-clamp-1">
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
