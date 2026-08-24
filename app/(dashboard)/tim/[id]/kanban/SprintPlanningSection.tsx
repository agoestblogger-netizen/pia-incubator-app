"use client";

import React, { useState, useMemo } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ArrowRight,
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
  Sparkles,
  Info,
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
  anggotaTim: any[];
  aiReferenceCards: any[];
  backlogCards: any[];
  capacities: MemberCapacityInfo[];
  canEdit: boolean;
  onOpenCardDetail: (card: any) => void;
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
  anggotaTim,
  aiReferenceCards,
  backlogCards,
  capacities,
  canEdit,
  onOpenCardDetail,
  onRefreshCapacities,
  onStartSprint,
  startingSprint,
}: SprintPlanningSectionProps) {
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [tempCapacityVal, setTempCapacityVal] = useState<number>(80);
  const [savingCapacity, setSavingCapacity] = useState(false);

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
      // Find card title to exclude Retrospective if needed
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

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Sub-bagian 1: Referensi AI Roadmap (Collapsible) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {aiReferenceCards.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAiPanelOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="h-5 w-5 text-amber-600 shrink-0" />
              <span className="text-sm font-extrabold text-amber-950">
                Referensi AI Roadmap
              </span>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold shadow-xs">
                {aiReferenceCards.length}
              </span>
              <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
                — Usulan AI dari analisis proposal, belum ditinjau tim
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="text-[11px] font-semibold">
                {isAiPanelOpen ? "Ciutkan" : "Buka"}
              </span>
              {isAiPanelOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {isAiPanelOpen && (
            <div className="px-5 pb-4 border-t border-amber-200/60 pt-3">
              <p className="text-xs text-amber-900 mb-3 leading-relaxed">
                Kartu di bawah ini adalah usulan roadmap dari AI. Klik <strong>Tinjau &amp; Adopsi</strong> agar kartu masuk ke Backlog Kerja resmi dan bisa dimasukkan ke Sprint ini.
              </p>
              <div className="space-y-2">
                {aiReferenceCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between gap-3 bg-white rounded-xl border border-amber-200 px-4 py-2.5 shadow-2xs hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wide border border-amber-200 shrink-0">
                        <BrainCircuit className="w-2.5 h-2.5" />
                        Ref AI
                      </span>
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {card.judul}
                      </span>
                      {card.tahap && card.tahap !== "umum" && (
                        <span className="hidden sm:inline text-[10px] text-gray-400 truncate">
                          · {card.tahap.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCardDetail(card)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-500 hover:text-white border border-amber-300 hover:border-amber-500 transition-all shadow-2xs cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>Tinjau &amp; Adopsi</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center gap-2.5 text-xs text-emerald-900 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Semua kartu Referensi AI telah diadopsi ke Backlog Kerja.</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Sub-bagian 2: Panel Kapasitas Tim — Sprint [N] */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-gray-900">
              Panel Kapasitas Tim — Sprint {sprint.nomorSprint}
            </h3>
          </div>
          <span className="text-[11px] text-gray-500">
            Kapasitas default 80 jam/sprint (dapat disesuaikan)
          </span>
        </div>

        {anggotaTim.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center">
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
                          onChange={(e) => setTempCapacityVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-6 w-14 text-xs px-1 text-center py-0"
                          disabled={savingCapacity}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCapacity(anggota.id)}
                          disabled={savingCapacity}
                          className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {savingCapacity ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Sub-bagian 3: Backlog untuk Sprint Ini */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Backlog untuk Sprint Ini ({backlogCards.length})
            </h3>
            <p className="text-xs text-gray-500">
              Tentukan estimasi jam kerja dan pilih Person in Charge (Owner) untuk tiap kartu.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
            {validAssignedCards.length} kartu siap dimulai
          </span>
        </div>

        {backlogCards.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
            Tidak ada kartu di Backlog. Adopsi kartu dari usulan AI di atas atau buat kartu baru di tombol &quot;+ Tambah Kartu&quot;.
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
              const isOwnerOverCapacity = currentOwnerId ? ownerUsedCap > ownerMaxCap : false;

              return (
                <div
                  key={card.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isOwnerOverCapacity
                      ? "border-red-300 bg-red-50/40 shadow-xs"
                      : "border-gray-200 bg-white hover:border-gray-300 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Card Title & Stage */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenCardDetail(card)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gray-900 hover:text-emerald-700 transition-colors">
                          {card.judul}
                        </span>
                        {card.tahap && card.tahap !== "umum" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {card.tahap.replace(/_/g, " ")}
                          </span>
                        )}
                        {card.label && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {card.label}
                          </span>
                        )}
                      </div>
                      {card.deskripsi && (
                        <p className="text-[11px] text-gray-500 line-clamp-1">
                          {card.deskripsi}
                        </p>
                      )}
                    </div>

                    {/* Right: Estimasi Jam & Owner Inputs */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Input Estimasi Jam */}
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <input
                          type="number"
                          min={0}
                          max={999}
                          placeholder="Jam"
                          disabled={!canEdit}
                          value={currentJam !== null && currentJam !== undefined ? currentJam : ""}
                          onChange={(e) => handleJamChange(card.id, e.target.value)}
                          className="w-12 text-xs font-bold text-gray-800 bg-transparent border-0 p-0 focus:outline-hidden text-right"
                        />
                        <span className="text-[10px] text-gray-400">jam</span>
                      </div>

                      {/* Dropdown Owner */}
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 min-w-[170px]">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <select
                          disabled={!canEdit}
                          value={currentOwnerId || ""}
                          onChange={(e) => handleOwnerChange(card.id, e.target.value || null)}
                          className="w-full text-xs font-semibold text-gray-800 bg-transparent border-0 p-0 focus:outline-hidden cursor-pointer"
                        >
                          <option value="">-- Pilih Owner --</option>
                          {anggotaTim.map((a) => {
                            const aMax = capacityMap.get(a.id) ?? 80;
                            const aUsed = allocatedHoursMap[a.id] ?? 0;
                            // Check potential overflow if assigned
                            const willExceed = a.id !== currentOwnerId && currentJam && aUsed + currentJam > aMax;

                            return (
                              <option
                                key={a.id}
                                value={a.id}
                                disabled={Boolean(willExceed)}
                              >
                                {a.nama} ({aUsed}/{aMax} jam){willExceed ? " ⚠ Penuh" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Warning if selected owner exceeds capacity */}
                  {isOwnerOverCapacity && currentOwner && (
                    <div className="mt-2.5 pt-2 border-t border-red-200 flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                      <span>
                        ⚠ {currentOwner.nama} telah dialokasikan {ownerUsedCap} jam dari kapasitas {ownerMaxCap} jam (melebihi {ownerUsedCap - ownerMaxCap} jam). Harap sesuaikan alokasi.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Tombol Mulai Sprint */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {canEdit && (
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-gray-400 shrink-0" />
              <span>
                {canStartSprint
                  ? `${validAssignedCards.length} kartu akan dimasukkan ke Sprint ${sprint.nomorSprint} dan siap dieksekusi.`
                  : "Isi estimasi jam dan owner minimal 1 kartu di atas untuk mengaktifkan tombol Mulai Sprint."}
              </span>
            </div>

            <Button
              type="button"
              disabled={!canStartSprint || startingSprint}
              onClick={handleStartSprintClick}
              className="w-full sm:w-auto text-xs bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold px-6 py-2.5 rounded-xl shadow-md gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingSprint ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-white" />
              )}
              <span>Mulai Sprint {sprint.nomorSprint}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
