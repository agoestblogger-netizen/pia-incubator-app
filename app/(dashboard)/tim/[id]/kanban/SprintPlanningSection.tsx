"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowUp,
  Clock,
  User,
  Users,
  AlertTriangle,
  Play,
  CheckCircle2,
  Loader2,
  Edit2,
  Check,
  X,
  Lock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCapacityInfo, upsertMemberCapacityAction } from "@/app/actions/capacity";
import { toast } from "@/components/ui/ToastProvider";

export interface PlanningCardAssignment {
  cardId: string;
  estimasiJam: number | null;
  ownerAnggotaId: string | null;
}

interface SprintPlanningSectionProps {
  timId: string;
  sprint: any;
  sprints: any[];
  anggotaTim: any[];
  aiReferenceCards: any[];
  backlogCards: any[];
  capacities: MemberCapacityInfo[];
  canEdit: boolean;
  phaseGateStatus?: any;
  onOpenCardDetail: (card: any, forceSprintNum?: number) => void;
  onOpenCreateBacklogModal: (sprintNum: number) => void;
  onRefreshCapacities: () => void;
  onStartSprint: (
    sprintId: string,
    assignments: Array<{ cardId: string; estimasiJam?: number | null; ownerAnggotaId?: string | null }>
  ) => Promise<void>;
  startingSprint: boolean;
}

export function SprintPlanningSection({
  timId,
  sprint,
  sprints = [],
  anggotaTim,
  aiReferenceCards,
  backlogCards,
  capacities,
  canEdit,
  phaseGateStatus,
  onOpenCardDetail,
  onOpenCreateBacklogModal,
  onRefreshCapacities,
  onStartSprint,
  startingSprint,
}: SprintPlanningSectionProps) {
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [tempCapacityVal, setTempCapacityVal] = useState<number>(80);
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Phase gating check
  const isCvUnlocked = Boolean(phaseGateStatus?.gates?.customerValidation?.unlocked);
  const isMvUnlocked = Boolean(phaseGateStatus?.gates?.marketValidation?.unlocked);

  // Local state for assignments in planning: cardId -> { estimasiJam, ownerAnggotaId }
  const [assignments, setAssignments] = useState<Record<string, PlanningCardAssignment>>(() => {
    const initial: Record<string, PlanningCardAssignment> = {};
    backlogCards.forEach((c) => {
      initial[c.id] = {
        cardId: c.id,
        estimasiJam: c.estimasiJam ?? null,
        ownerAnggotaId: c.ownerAnggotaId ?? null,
      };
    });
    return initial;
  });

  // Keep assignments synced if backlogCards change
  React.useEffect(() => {
    setAssignments((prev) => {
      const next = { ...prev };
      backlogCards.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = {
            cardId: c.id,
            estimasiJam: c.estimasiJam ?? null,
            ownerAnggotaId: c.ownerAnggotaId ?? null,
          };
        }
      });
      return next;
    });
  }, [backlogCards]);

  // Capacity lookup map: anggotaTimId -> MemberCapacityInfo
  const capacityMap = useMemo(() => {
    const map = new Map<string, number>();
    anggotaTim.forEach((a) => {
      const cap = capacities.find((c) => c.anggotaTimId === a.id);
      map.set(a.id, cap ? cap.kapasitasJam : 80);
    });
    return map;
  }, [anggotaTim, capacities]);

  // Compute allocated hours per member from current assignments
  const allocatedHoursMap = useMemo(() => {
    const map: Record<string, number> = {};
    anggotaTim.forEach((a) => {
      map[a.id] = 0;
    });

    Object.values(assignments).forEach((asg) => {
      if (asg.ownerAnggotaId && asg.estimasiJam && asg.estimasiJam > 0) {
        map[asg.ownerAnggotaId] = (map[asg.ownerAnggotaId] || 0) + asg.estimasiJam;
      }
    });

    return map;
  }, [assignments, anggotaTim]);

  // Check if planning has at least 1 valid card (jam > 0 and owner selected)
  const validAssignedCards = useMemo(() => {
    return Object.values(assignments).filter((asg) => {
      const card = backlogCards.find((c) => c.id === asg.cardId);
      if (card && card.judul.toLowerCase().includes("retrospective")) {
        return false;
      }
      return Boolean(asg.ownerAnggotaId && asg.estimasiJam && asg.estimasiJam > 0);
    });
  }, [assignments, backlogCards]);

  const canStartSprint = validAssignedCards.length > 0;

  // Handle updating estimasi jam for a card
  const handleJamChange = (cardId: string, value: string) => {
    const parsed = value === "" ? null : Math.max(0, parseInt(value) || 0);
    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, ownerAnggotaId: null }),
        estimasiJam: parsed,
      },
    }));
  };

  // Handle updating owner for a card with capacity checking
  const handleOwnerChange = (cardId: string, newOwnerId: string | null) => {
    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, estimasiJam: null }),
        ownerAnggotaId: newOwnerId === "" ? null : newOwnerId,
      },
    }));
  };

  // Handle saving edited capacity
  const handleSaveCapacity = async (anggotaId: string) => {
    setSavingCapacity(true);
    const res = await upsertMemberCapacityAction(
      timId,
      anggotaId,
      sprint.nomorSprint,
      tempCapacityVal
    );
    if (res.success) {
      toast.success("Kapasitas jam anggota berhasil diperbarui.", "Kapasitas Disimpan");
      setEditingCapacityId(null);
      onRefreshCapacities();
    } else {
      toast.error(res.error || "Gagal memperbarui kapasitas.", "Gagal");
    }
    setSavingCapacity(false);
  };

  // Handle click Mulai Sprint
  const handleStartSprintClick = async () => {
    if (!canStartSprint) return;
    const assignedPayload = Object.values(assignments)
      .filter((asg) => asg.ownerAnggotaId && asg.estimasiJam && asg.estimasiJam > 0)
      .map((asg) => ({
        cardId: asg.cardId,
        estimasiJam: asg.estimasiJam,
        ownerAnggotaId: asg.ownerAnggotaId,
      }));

    await onStartSprint(sprint.id, assignedPayload);
  };

  // Sort sprints by sprint number
  const sortedSprints = useMemo(() => {
    if (sprints.length === 0) {
      return [{ id: sprint.id, nomorSprint: sprint.nomorSprint, status: sprint.status }];
    }
    return [...sprints].sort((a, b) => a.nomorSprint - b.nomorSprint);
  }, [sprints, sprint]);

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN C: PANEL "BACKLOG REFERENSI" */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Heading di luar / di atas kotak */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-extrabold text-sm">✦</span>
            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
              Backlog Referensi
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold shadow-2xs">
              {aiReferenceCards.length} kartu
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Usulan AI &amp; template validasi dari proposal, dapat ditinjau atau dipromosikan
          </span>
        </div>

        {/* SATU Kotak Putih Menerus dengan Scroll Internal */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {aiReferenceCards.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Semua kartu Backlog Referensi telah diadopsi ke Backlog Kerja.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto pr-0.5">
              {sortedSprints.map((s) => {
                const isCurrentPlanningSprint = s.nomorSprint === sprint.nomorSprint;
                const groupCards = aiReferenceCards.filter(
                  (c) => (c.suggestedSprintNumber || 1) === s.nomorSprint
                );

                return (
                  <div key={s.nomorSprint} className="space-y-0">
                    {/* Header Teks Kecil + Garis Divider Grup Sprint */}
                    <div
                      className={`px-5 py-2 flex items-center justify-between transition-colors ${
                        isCurrentPlanningSprint
                          ? "bg-purple-50/80 border-y border-purple-100 text-purple-800"
                          : "bg-gray-50/70 border-y border-gray-100 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          SPRINT {s.nomorSprint} ·{" "}
                          {isCurrentPlanningSprint
                            ? "SEDANG DIRENCANAKAN"
                            : "BELUM WAKTUNYA"}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isCurrentPlanningSprint
                              ? "bg-purple-200/80 text-purple-900"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {groupCards.length}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium hidden sm:inline">
                        {isCurrentPlanningSprint
                          ? "Grup Aktif — Siap diadopsi ke Sprint ini"
                          : "Grup Pasif — Promosikan untuk ditarik ke Sprint ini"}
                      </span>
                    </div>

                    {/* Daftar Kartu di Grup Ini */}
                    <div className="p-4 space-y-2.5">
                      {groupCards.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic px-1 py-1">
                          Tidak ada usulan kartu referensi untuk Sprint {s.nomorSprint}.
                        </p>
                      ) : (
                        groupCards.map((card) => {
                          // Phase gating check
                          let isPhaseLocked = false;
                          let lockReason = "";

                          if (card.tahap === "customer_validation" && !isCvUnlocked) {
                            isPhaseLocked = true;
                            lockReason = "🔒 Fase Customer Validation belum terbuka";
                          } else if (card.tahap === "market_validation" && !isMvUnlocked) {
                            isPhaseLocked = true;
                            lockReason = "🔒 Fase Market Validation belum terbuka";
                          }

                          return (
                            <div
                              key={card.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                                isCurrentPlanningSprint
                                  ? "bg-purple-50/40 border-purple-200/90 hover:border-purple-300 shadow-2xs"
                                  : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {/* Info Kartu */}
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border shrink-0 ${
                                      card.label?.includes("CV") || card.tahap === "customer_validation"
                                        ? "bg-blue-50 text-blue-800 border-blue-200"
                                        : card.label?.includes("MV") || card.tahap === "market_validation"
                                        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                        : "bg-purple-100 text-purple-800 border-purple-200"
                                    }`}
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {card.label || "Draf Roadmap"}
                                  </span>

                                  {card.tahap && card.tahap !== "umum" && (
                                    <span className="text-[10px] text-gray-400 font-medium truncate">
                                      · {card.tahap.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-bold text-gray-900 leading-snug">
                                  {card.judul}
                                </p>

                                {card.deskripsi && (
                                  <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                                    {card.deskripsi}
                                  </p>
                                )}

                                {/* Lock Warning Text */}
                                {isPhaseLocked && (
                                  <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 pt-0.5">
                                    <Lock className="h-3 w-3 shrink-0" />
                                    <span>{lockReason}</span>
                                  </p>
                                )}
                              </div>

                              {/* Tombol Aksi: Tinjau & Adopsi (Grup Aktif) atau Promosikan (Grup Pasif) */}
                              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                                {isCurrentPlanningSprint ? (
                                  <button
                                    type="button"
                                    disabled={!canEdit || isPhaseLocked}
                                    onClick={() => onOpenCardDetail(card, sprint.nomorSprint)}
                                    title={
                                      isPhaseLocked
                                        ? lockReason
                                        : "Tinjau dan adopsi kartu ke Sprint Planning saat ini"
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                                      isPhaseLocked
                                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                                        : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-98"
                                    }`}
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                    <span>Tinjau &amp; Adopsi</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canEdit || isPhaseLocked}
                                    onClick={() => onOpenCardDetail(card, sprint.nomorSprint)}
                                    title={
                                      isPhaseLocked
                                        ? lockReason
                                        : `Promosikan kartu ini ke Sprint ${sprint.nomorSprint}`
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                                      isPhaseLocked
                                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                                        : "bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 hover:border-purple-400 cursor-pointer active:scale-98"
                                    }`}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                    <span>↑ Promosikan</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN D: PANEL "SPRINT PLANNING — SPRINT N" */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Heading di luar / di atas kotak */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
              Sprint Planning — Sprint {sprint.nomorSprint}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shadow-2xs">
              {backlogCards.length} backlog di sprint ini
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Alokasikan estimasi jam dan PIC owner sebelum memulai eksekusi sprint
          </span>
        </div>

        {/* Kotak Putih dengan Border Hijau Aktif */}
        <div className="bg-white rounded-2xl border-2 border-emerald-500/80 p-5 shadow-xs space-y-6 ring-1 ring-emerald-400/20">
          {/* Header Dalam Kotak: Judul Sub & Tombol "+ Tambah Backlog" */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Panel Kapasitas Tim &amp; Backlog Kerja
              </h4>
            </div>

            {canEdit && (
              <Button
                size="sm"
                onClick={() => onOpenCreateBacklogModal(sprint.nomorSprint)}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs gap-1.5 cursor-pointer active:scale-98 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Backlog</span>
              </Button>
            )}
          </div>

          {/* Panel Kapasitas Tim — Sprint N */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Kapasitas Anggota Tim (Default 80 jam/sprint)
              </span>
              <span className="text-[11px] text-gray-400">
                Klik ikon pensil untuk mengubah kapasitas per orang
              </span>
            </div>

            {anggotaTim.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded-xl">
                Belum ada anggota tim terdaftar. Tambahkan anggota di menu Charter/Tim.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {anggotaTim.map((anggota) => {
                  const maxCap = capacityMap.get(anggota.id) ?? 80;
                  const usedCap = allocatedHoursMap[anggota.id] ?? 0;
                  const pct = maxCap > 0 ? Math.min(100, Math.round((usedCap / maxCap) * 100)) : 0;
                  const isOver = usedCap > maxCap;
                  const isNear = !isOver && pct >= 80;

                  return (
                    <div
                      key={anggota.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isOver
                          ? "border-red-300 bg-red-50/50 shadow-xs"
                          : isNear
                          ? "border-amber-300 bg-amber-50/40"
                          : "border-gray-200 bg-gray-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {anggota.nama}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {anggota.jabatan || "Anggota Tim"}
                          </p>
                        </div>

                        {/* Edit Capacity Trigger */}
                        {editingCapacityId === anggota.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              min={0}
                              max={999}
                              value={tempCapacityVal}
                              onChange={(e) =>
                                setTempCapacityVal(Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="h-6 w-14 text-xs px-1 text-center py-0"
                              disabled={savingCapacity}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCapacity(anggota.id)}
                              disabled={savingCapacity}
                              className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {savingCapacity ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCapacityId(null)}
                              disabled={savingCapacity}
                              className="h-6 w-6 rounded bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCapacityId(anggota.id);
                                setTempCapacityVal(maxCap);
                              }}
                              title="Klik untuk ubah kapasitas jam"
                              className="text-gray-400 hover:text-emerald-700 p-1 rounded hover:bg-white transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )
                        )}
                      </div>

                      {/* Hours Text & Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isOver ? "font-bold text-red-700" : "text-gray-600"}>
                            {usedCap} / {maxCap} jam
                          </span>
                          <span
                            className={`font-bold text-[10px] ${
                              isOver ? "text-red-700" : isNear ? "text-amber-700" : "text-gray-500"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver
                                ? "bg-red-500"
                                : isNear
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        {isOver && (
                          <p className="text-[10px] font-semibold text-red-600 flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Kapasitas terlampaui +{usedCap - maxCap} jam</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daftar Backlog untuk Sprint Ini */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">
                Backlog Kerja Terdaftar ({backlogCards.length})
              </span>
              <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg font-bold border border-emerald-200">
                {validAssignedCards.length} kartu siap dimulai
              </span>
            </div>

            {backlogCards.length === 0 ? (
              /* Panduan Default Kosong (Border Dashed) */
              <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <p className="text-xs font-bold text-gray-700">
                  Belum ada backlog di sprint ini.
                </p>
                <p className="text-xs text-gray-500">
                  Pilih dari <strong>Backlog Referensi</strong> di atas, atau klik <strong>&quot;+ Tambah Backlog&quot;</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {backlogCards.map((card) => {
                  const currentAsg = assignments[card.id] || {
                    cardId: card.id,
                    estimasiJam: card.estimasiJam ?? null,
                    ownerAnggotaId: card.ownerAnggotaId ?? null,
                  };

                  const currentOwnerId = currentAsg.ownerAnggotaId;
                  const currentJam = currentAsg.estimasiJam;
                  const currentOwner = anggotaTim.find((a) => a.id === currentOwnerId);

                  // Check if selected owner is currently over capacity
                  const ownerMaxCap = currentOwnerId ? capacityMap.get(currentOwnerId) ?? 80 : 80;
                  const ownerUsedCap = currentOwnerId ? allocatedHoursMap[currentOwnerId] ?? 0 : 0;
                  const isOwnerOverCap = currentOwnerId ? ownerUsedCap > ownerMaxCap : false;

                  return (
                    <div
                      key={card.id}
                      className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs hover:border-gray-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {card.tahap ? card.tahap.replace(/_/g, " ") : "Umum"}
                            </span>
                            {card.label && (
                              <span className="text-[10px] text-gray-400 font-medium">
                                · {card.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {card.judul}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenCardDetail(card)}
                          className="text-xs text-emerald-700 font-semibold hover:underline shrink-0 self-start sm:self-center"
                        >
                          Sunting Detail
                        </button>
                      </div>

                      {/* Inputs: Estimasi Jam + Owner PIC */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Estimasi Jam Kerja</span>
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={999}
                            placeholder="Contoh: 16"
                            value={currentJam !== null && currentJam !== undefined ? currentJam : ""}
                            disabled={!canEdit}
                            onChange={(e) => handleJamChange(card.id, e.target.value)}
                            className="h-8 text-xs font-bold text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span>Owner / PIC Anggota</span>
                          </label>
                          <select
                            value={currentOwnerId || ""}
                            disabled={!canEdit}
                            onChange={(e) => handleOwnerChange(card.id, e.target.value || null)}
                            className="w-full h-8 text-xs bg-white border border-gray-200 rounded-md px-2 text-gray-800 font-medium focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Owner --</option>
                            {anggotaTim.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Owner Overload Warning Alert */}
                      {isOwnerOverCap && currentOwner && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-2 flex items-center gap-2 text-[11px] text-red-700 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          <span>
                            {currentOwner.nama} teralokasi {ownerUsedCap} jam (melebihi kapasitas {ownerMaxCap} jam).
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer: Tombol Mulai Sprint */}
          {canEdit && (
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {canStartSprint ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Sprint siap dimulai dengan {validAssignedCards.length} kartu backlog.
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Minimal 1 kartu harus memiliki estimasi jam &amp; PIC Owner untuk memulai sprint.
                  </span>
                )}
              </div>

              <Button
                type="button"
                disabled={!canStartSprint || startingSprint}
                onClick={handleStartSprintClick}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition-all"
              >
                {startingSprint ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memulai Sprint...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Mulai Sprint {sprint.nomorSprint}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
