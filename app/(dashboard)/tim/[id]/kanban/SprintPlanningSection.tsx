"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowUp,
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
  Zap,
  Target,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberCapacityInfo, upsertMemberCapacityAction } from "@/app/actions/capacity";
import { updateSprintGoalAction, getSuggestedSprintGoalAction } from "@/app/actions/sprint";
import { getHeuristicSprintGoal } from "@/lib/ai/sprint-goal-generator";
import { toast } from "@/components/ui/ToastProvider";
import { getPhaseTokenBySlug } from "@/lib/theme/tokens";

import { BacklogReferenceDropdown } from "./BacklogReferenceDropdown";

export interface PlanningCardAssignment {
  cardId: string;
  storyPoint: number | null;
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
    assignments: Array<{ cardId: string; storyPoint?: number | null; ownerAnggotaId?: string | null }>
  ) => Promise<void>;
  startingSprint: boolean;
}

const FIBONACCI_OPTIONS = [
  { value: 1, label: "1 SP — Sangat Sederhana (Tugas admin singkat)" },
  { value: 2, label: "2 SP — Sederhana (Review / Brief)" },
  { value: 3, label: "3 SP — Sedang (Riset / Dokumen)" },
  { value: 5, label: "5 SP — Menengah (Prototype / Testing)" },
  { value: 8, label: "8 SP — Kompleks (MVP Development / Integrasi)" },
  { value: 13, label: "13 SP — Sangat Kompleks (Arsitektur berat)" },
];

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
  const [tempCapacityVal, setTempCapacityVal] = useState<number>(15);
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Sprint Goal state & auto-suggestion
  const [sprintGoal, setSprintGoal] = useState<string>(sprint.sprintGoal || "");
  const [isSuggestedGoal, setIsSuggestedGoal] = useState<boolean>(false);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);

  // Phase gating check
  const isCvUnlocked = Boolean(phaseGateStatus?.gates?.customerValidation?.unlocked);
  const isMvUnlocked = Boolean(phaseGateStatus?.gates?.marketValidation?.unlocked);

  // Auto-suggest when sprint changes or when backlogCards are present and sprintGoal is empty
  React.useEffect(() => {
    if (sprint.sprintGoal && sprint.sprintGoal.trim().length > 0) {
      setSprintGoal(sprint.sprintGoal);
      setIsSuggestedGoal(false);
    } else {
      if (backlogCards && backlogCards.length > 0) {
        const suggestion = getHeuristicSprintGoal(backlogCards);
        setSprintGoal(suggestion);
        setIsSuggestedGoal(true);
      } else {
        setSprintGoal("");
        setIsSuggestedGoal(false);
      }
    }
  }, [sprint.id, sprint.sprintGoal, backlogCards]);

  const handleSaveSprintGoal = async (valToSave?: string) => {
    const text = valToSave !== undefined ? valToSave : sprintGoal;
    if (text.trim() === (sprint.sprintGoal || "").trim()) return;
    setSavingGoal(true);
    try {
      const res = await updateSprintGoalAction(timId, sprint.id, text);
      if (res.success) {
        setIsSuggestedGoal(false);
        toast.success("Sprint Goal berhasil disimpan!", "Goal Tersimpan");
        if (onRefreshCapacities) onRefreshCapacities();
      } else {
        toast.error(res.error || "Gagal menyimpan Sprint Goal.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan Sprint Goal.", "Gagal");
    } finally {
      setSavingGoal(false);
    }
  };

  const handleFetchAiSuggestion = async () => {
    if (backlogCards.length === 0) {
      toast.info("Belum ada backlog di sprint ini. Tambahkan backlog terlebih dahulu.", "Backlog Kosong");
      return;
    }
    setLoadingSuggestion(true);
    try {
      const res = await getSuggestedSprintGoalAction(timId, sprint.nomorSprint);
      if (res.success && res.suggestedGoal) {
        setSprintGoal(res.suggestedGoal);
        setIsSuggestedGoal(true);
        toast.success("Saran Sprint Goal diperbarui!", "Saran AI");
      }
    } catch {
      toast.error("Gagal membuat saran Sprint Goal.");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // Local state for assignments in planning: cardId -> { storyPoint, ownerAnggotaId }
  const [assignments, setAssignments] = useState<Record<string, PlanningCardAssignment>>(() => {
    const initial: Record<string, PlanningCardAssignment> = {};
    backlogCards.forEach((c) => {
      initial[c.id] = {
        cardId: c.id,
        storyPoint: c.storyPoint ?? 3,
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
            storyPoint: c.storyPoint ?? 3,
            ownerAnggotaId: c.ownerAnggotaId ?? null,
          };
        }
      });
      return next;
    });
  }, [backlogCards]);

  // Capacity lookup map: anggotaTimId -> SP Capacity (AI suggested or manual)
  const capacityMap = useMemo(() => {
    const map = new Map<string, number>();
    anggotaTim.forEach((a) => {
      const cap = capacities.find((c) => c.anggotaTimId === a.id);
      map.set(a.id, cap ? cap.kapasitasSp : 15);
    });
    return map;
  }, [anggotaTim, capacities]);

  // Compute allocated SP per member from current assignments
  const allocatedSpMap = useMemo(() => {
    const map: Record<string, number> = {};
    anggotaTim.forEach((a) => {
      map[a.id] = 0;
    });

    Object.values(assignments).forEach((asg) => {
      if (asg.ownerAnggotaId && asg.storyPoint && asg.storyPoint > 0) {
        map[asg.ownerAnggotaId] = (map[asg.ownerAnggotaId] || 0) + asg.storyPoint;
      }
    });

    return map;
  }, [assignments, anggotaTim]);

  // Total Team Aggregate SP (Non-blocking gauge)
  const totalTeamMaxSp = useMemo(() => {
    return anggotaTim.reduce((sum, a) => sum + (capacityMap.get(a.id) ?? 15), 0);
  }, [anggotaTim, capacityMap]);

  const totalTeamUsedSp = useMemo(() => {
    return Object.values(allocatedSpMap).reduce((sum, v) => sum + v, 0);
  }, [allocatedSpMap]);

  const totalTeamPct = totalTeamMaxSp > 0 ? Math.round((totalTeamUsedSp / totalTeamMaxSp) * 1000) / 10 : 0;

  // Check if planning has at least 1 valid card (SP > 0 and owner selected)
  const validAssignedCards = useMemo(() => {
    return Object.values(assignments).filter((asg) => {
      const card = backlogCards.find((c) => c.id === asg.cardId);
      if (card && card.judul.toLowerCase().includes("retrospective")) {
        return false;
      }
      return Boolean(asg.ownerAnggotaId && asg.storyPoint && asg.storyPoint > 0);
    });
  }, [assignments, backlogCards]);

  const canStartSprint = validAssignedCards.length > 0;

  // Handle updating Story Point for a card
  const handleSpChange = (cardId: string, value: string) => {
    const parsed = value === "" ? null : Math.max(1, parseInt(value) || 3);
    
    // If card already has an owner, check if changing SP would exceed owner capacity
    const currentOwnerId = assignments[cardId]?.ownerAnggotaId;
    if (currentOwnerId && parsed) {
      const currentOwner = anggotaTim.find((a) => a.id === currentOwnerId);
      const ownerMaxSp = capacityMap.get(currentOwnerId) ?? 15;
      const currentUsedSp = allocatedSpMap[currentOwnerId] ?? 0;
      const prevCardSp = assignments[cardId]?.storyPoint ?? 0;
      const projectedSp = currentUsedSp - prevCardSp + parsed;

      if (projectedSp > ownerMaxSp) {
        toast.error(
          `⚠ Perubahan ke ${parsed} SP akan melebihi kapasitas ${currentOwner?.nama || "Owner"} (${projectedSp}/${ownerMaxSp} SP). Sesuaikan kapasitas atau ganti penugasan.`,
          "Kapasitas Melebihi Batas"
        );
        return;
      }
    }

    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, ownerAnggotaId: null }),
        storyPoint: parsed,
      },
    }));
  };

  // Handle updating owner for a card with BLOCKING capacity checking
  const handleOwnerChange = (cardId: string, newOwnerId: string | null) => {
    if (newOwnerId) {
      const targetOwner = anggotaTim.find((a) => a.id === newOwnerId);
      const targetMaxSp = capacityMap.get(newOwnerId) ?? 15;
      const currentUsedSp = allocatedSpMap[newOwnerId] ?? 0;
      const thisCardCurrentOwner = assignments[cardId]?.ownerAnggotaId;
      const thisCardSp = assignments[cardId]?.storyPoint ?? 3;
      const alreadyAssignedSpToThisOwner = thisCardCurrentOwner === newOwnerId ? thisCardSp : 0;
      const projectedSp = currentUsedSp - alreadyAssignedSpToThisOwner + thisCardSp;

      // BLOCKING validation if >= 100% (or exceeds max capacity)
      if (projectedSp > targetMaxSp || currentUsedSp >= targetMaxSp) {
        toast.error(
          `⚠ ${targetOwner?.nama || "Anggota"} sudah mencapai kapasitas (${projectedSp}/${targetMaxSp} SP). Alokasikan ke anggota lain atau sesuaikan kapasitas.`,
          "Kapasitas Penuh / Terlampaui"
        );
        return;
      }
    }

    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, storyPoint: 3 }),
        ownerAnggotaId: newOwnerId === "" ? null : newOwnerId,
      },
    }));
  };

  // Handle saving edited SP capacity
  const handleSaveCapacity = async (anggotaId: string) => {
    setSavingCapacity(true);
    const res = await upsertMemberCapacityAction(
      timId,
      anggotaId,
      sprint.nomorSprint,
      tempCapacityVal
    );
    if (res.success) {
      toast.success("Kapasitas Story Point anggota berhasil diperbarui.", "Kapasitas Disimpan");
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
      .filter((asg) => asg.ownerAnggotaId && asg.storyPoint && asg.storyPoint > 0)
      .map((asg) => ({
        cardId: asg.cardId,
        storyPoint: asg.storyPoint,
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
      {/* BAGIAN A: SPRINT GOAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/70 via-white to-amber-50/40 border border-purple-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200/80 shadow-2xs">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
                <span>Sprint Goal — Sasaran Utama Sprint {sprint.nomorSprint}</span>
                {isSuggestedGoal && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Saran Otomatis AI</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Target luaran utama yang disepakati bersama tim selama sprint ini berjalan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backlogCards.length > 0 && canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchAiSuggestion}
                disabled={loadingSuggestion || savingGoal}
                className="h-7 text-[11px] font-semibold text-purple-700 hover:text-purple-800 hover:bg-purple-100/60 gap-1 px-2.5 rounded-lg cursor-pointer"
                title="Generate ulang saran Sprint Goal dari backlog aktual"
              >
                {loadingSuggestion ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
                <span>Saran Ulang AI</span>
              </Button>
            )}
            {canEdit && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveSprintGoal()}
                disabled={savingGoal || !sprintGoal.trim()}
                className="h-7 text-[11px] font-bold bg-purple-700 hover:bg-purple-800 text-white gap-1 px-3 rounded-lg shadow-2xs cursor-pointer"
              >
                {savingGoal ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                <span>{savingGoal ? "Menyimpan..." : "Simpan Goal"}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Textarea
            rows={2}
            disabled={!canEdit}
            value={sprintGoal}
            onChange={(e) => {
              setSprintGoal(e.target.value);
              setIsSuggestedGoal(false);
            }}
            onBlur={() => handleSaveSprintGoal()}
            placeholder="Belum ada saran — tambahkan backlog dulu atau isi manual sasaran utama sprint ini..."
            className={`text-xs sm:text-sm resize-none rounded-xl transition-all ${
              isSuggestedGoal
                ? "italic text-purple-950 border-purple-300 bg-purple-50/40 focus:bg-white focus:not-italic"
                : "text-gray-900 border-gray-300 bg-white"
            }`}
          />
        </div>
      </div>

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
            Usulan AI &amp; template validasi dari proposal, lengkap dengan skor Story Point Fibonacci
          </span>
        </div>

        {/* SATU Dropdown Tunggal Backlog Referensi dengan Grouping Per Sprint */}
        <BacklogReferenceDropdown
          currentPlanningSprintNumber={sprint.nomorSprint}
          sprints={sprints}
          aiReferenceCards={aiReferenceCards}
          canEdit={canEdit}
          isCvUnlocked={isCvUnlocked}
          isMvUnlocked={isMvUnlocked}
          onSelectCard={onOpenCardDetail}
        />
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
            Alokasikan Story Point dan PIC owner sebelum memulai eksekusi sprint
          </span>
        </div>

        {/* Kotak Hijau Sangat Muda (#E3F0E6) dengan Border Hijau */}
        <div className="bg-[#E3F0E6] rounded-2xl border-2 border-[#3E9463]/70 p-5 shadow-xs space-y-6">
          {/* Header Dalam Kotak: Judul Sub & Tombol "+ Tambah Backlog" */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9E4D0] pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0B3D2E]" />
              <h4 className="text-xs font-extrabold text-[#0B3D2E] uppercase tracking-wider">
                Panel Kapasitas Tim (Story Point) &amp; Backlog Kerja
              </h4>
            </div>

            {canEdit && (
              <Button
                size="sm"
                onClick={() => onOpenCreateBacklogModal(sprint.nomorSprint)}
                className="bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs gap-1.5 cursor-pointer active:scale-98 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Backlog</span>
              </Button>
            )}
          </div>

          {/* Panel Kapasitas Tim Versi SP — Sprint N */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0B3D2E] flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Kapasitas Anggota Tim (Disarankan AI dalam Story Point)</span>
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Klik ikon pensil untuk menyesuaikan kapasitas SP per orang
              </span>
            </div>

            {anggotaTim.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center bg-[#F0F7F1] border border-[#C9E4D0] rounded-xl">
                Belum ada anggota tim terdaftar. Tambahkan anggota di menu Charter/Tim.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {anggotaTim.map((anggota) => {
                  const maxCap = capacityMap.get(anggota.id) ?? 15;
                  const usedCap = allocatedSpMap[anggota.id] ?? 0;
                  const pct = maxCap > 0 ? Math.round((usedCap / maxCap) * 100) : 0;
                  const isOver = usedCap >= maxCap && maxCap > 0;
                  const isNear = !isOver && pct >= 60;

                  return (
                    <div
                      key={anggota.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isOver
                          ? "border-l-4 border-l-red-500 border-red-300 bg-red-50/70 shadow-xs"
                          : isNear
                          ? "border-l-4 border-l-amber-500 border-amber-300 bg-amber-50/60 shadow-2xs"
                          : "border-l-4 border-l-[#3E9463] border-[#C9E4D0] bg-[#F0F7F1] hover:bg-white shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">
                            {anggota.nama}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium truncate">
                            {anggota.jabatan || "Anggota Tim"}
                          </p>
                        </div>

                        {/* Edit Capacity Trigger */}
                        {editingCapacityId === anggota.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={tempCapacityVal}
                              onChange={(e) =>
                                setTempCapacityVal(Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="h-6 w-14 text-xs px-1 text-center py-0 font-bold border-[#C9E4D0] bg-white"
                              disabled={savingCapacity}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCapacity(anggota.id)}
                              disabled={savingCapacity}
                              className="h-6 w-6 rounded bg-[#3E9463] text-white flex items-center justify-center hover:bg-[#0B3D2E] disabled:opacity-50"
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
                              title="Klik untuk ubah kapasitas Story Point"
                              className="text-gray-400 hover:text-[#3E9463] p-1 rounded hover:bg-white transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )
                        )}
                      </div>

                      {/* SP Text & Dynamic Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-medium">
                            {anggota.nama.split(" ")[0]}:{" "}
                            <strong
                              className={
                                isOver
                                  ? "text-red-700 font-black"
                                  : isNear
                                  ? "text-amber-900 font-black"
                                  : "text-gray-900 font-black"
                              }
                            >
                              {usedCap} / {maxCap} SP
                            </strong>
                          </span>
                          <span
                            className={`font-black text-[10px] px-2 py-0.5 rounded-full border shadow-2xs ${
                              isOver
                                ? "bg-red-100 text-red-800 border-red-200"
                                : isNear
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : "bg-[#E3F0E6] text-[#0B3D2E] border-[#C9E4D0]"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="h-2.5 w-full bg-[#E3F0E6] rounded-full overflow-hidden p-0.5 border border-[#C9E4D0]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver
                                ? "bg-red-600"
                                : isNear
                                ? "bg-amber-500"
                                : "bg-[#3E9463]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>

                        {isOver ? (
                          <p className="text-[10px] font-bold text-red-600 flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Kapasitas penuh/tercapai ({usedCap}/{maxCap} SP)</span>
                          </p>
                        ) : isNear ? (
                          <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1 pt-0.5">
                            <span>💡 Alokasi mendekati batas kapasitas ({usedCap}/{maxCap} SP)</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Agregat SP Tim (Non-blocking Gauge) — Hijau Tua Pekat #0B3D2E & Emas #F0C24B */}
            {anggotaTim.length > 0 && (
              <div className="p-4 bg-[#0B3D2E] rounded-2xl border border-[#0B3D2E] shadow-sm space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-white font-extrabold text-xs">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>
                      Total Tim:{" "}
                      <span className="text-[#F0C24B] font-black text-sm">
                        {totalTeamUsedSp} / {totalTeamMaxSp} SP
                      </span>
                    </span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#3E9463] text-white text-[11px] font-black shadow-2xs">
                    {totalTeamPct}% Terpakai
                  </span>
                </div>
                <div className="h-3 w-full bg-[#07261D] rounded-full overflow-hidden p-0.5 border border-emerald-900/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      totalTeamPct > 100 ? "bg-amber-500" : "bg-[#F0C24B]"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, totalTeamPct))}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/70 font-medium">
                  Indikator total agregat tim bersifat informasional (non-blocking). Penugasan task divalidasi per orang.
                </p>
              </div>
            )}
          </div>

          {/* Daftar Backlog untuk Sprint Ini */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0B3D2E]">
                Backlog Kerja Terdaftar ({backlogCards.length})
              </span>
              <span className="text-xs bg-[#F0F7F1] text-[#0B3D2E] px-3 py-1 rounded-lg font-black border border-[#C9E4D0] shadow-2xs">
                {validAssignedCards.length} kartu siap dimulai
              </span>
            </div>

            {backlogCards.length === 0 ? (
              /* Panduan Default Kosong (Border Dashed) */
              <div className="text-center py-10 px-4 border-2 border-dashed border-[#C9E4D0] rounded-2xl bg-[#F0F7F1] space-y-2">
                <p className="text-xs font-bold text-[#0B3D2E]">
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
                    storyPoint: card.storyPoint ?? 3,
                    ownerAnggotaId: card.ownerAnggotaId ?? null,
                  };

                  const currentOwnerId = currentAsg.ownerAnggotaId;
                  const currentSp = currentAsg.storyPoint;
                  const currentOwner = anggotaTim.find((a) => a.id === currentOwnerId);

                  // Check if selected owner is currently over capacity
                  const ownerMaxCap = currentOwnerId ? capacityMap.get(currentOwnerId) ?? 15 : 15;
                  const ownerUsedCap = currentOwnerId ? allocatedSpMap[currentOwnerId] ?? 0 : 0;
                  const isOwnerOverCap = currentOwnerId ? ownerUsedCap >= ownerMaxCap : false;

                  return (
                    <div
                      key={card.id}
                      className="bg-[#F0F7F1] rounded-xl border border-[#C9E4D0] p-3.5 shadow-2xs hover:border-[#3E9463]/50 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#3E9463] text-white shadow-2xs">
                              {card.tahap ? card.tahap.replace(/_/g, " ") : "Innovation Setup"}
                            </span>
                            {card.label && (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#B8860B] text-white shadow-2xs">
                                🏷️ {card.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-gray-900 truncate">
                            {card.judul}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenCardDetail(card)}
                          className="text-xs text-[#3E9463] hover:text-[#0B3D2E] font-bold hover:underline shrink-0 self-start sm:self-center cursor-pointer"
                        >
                          Sunting Detail
                        </button>
                      </div>

                      {/* Inputs: Story Point + Owner PIC */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#C9E4D0]">
                        <div>
                          <label className="text-[11px] font-bold text-[#8A6300] block mb-1 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-[#B8860B] fill-[#B8860B]" />
                            <span>Story Point (Skala Fibonacci)</span>
                          </label>
                          <select
                            value={currentSp ?? 3}
                            disabled={!canEdit}
                            onChange={(e) => handleSpChange(card.id, e.target.value)}
                            className="w-full h-8 text-xs bg-[#FBF3DD] border-2 border-[#D4AF37] hover:border-[#B8860B] rounded-lg px-2 text-[#8A6300] font-extrabold focus:ring-2 focus:ring-[#D4AF37] transition-colors"
                          >
                            {FIBONACCI_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-800 block mb-1 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[#3E9463]" />
                            <span>Owner / PIC Anggota</span>
                          </label>
                          <select
                            value={currentOwnerId || ""}
                            disabled={!canEdit}
                            onChange={(e) => handleOwnerChange(card.id, e.target.value || null)}
                            className="w-full h-8 text-xs bg-[#F0F7F1] border-2 border-[#C9E4D0] hover:border-[#3E9463] rounded-lg px-2 text-gray-900 font-bold focus:ring-2 focus:ring-[#C9E4D0] focus:border-[#3E9463] transition-colors"
                          >
                            <option value="">-- Pilih Owner --</option>
                            {anggotaTim.map((a) => {
                              const aMax = capacityMap.get(a.id) ?? 15;
                              const aUsed = allocatedSpMap[a.id] ?? 0;
                              return (
                                <option key={a.id} value={a.id}>
                                  {a.nama} ({aUsed}/{aMax} SP)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Owner Overload Warning Alert */}
                      {isOwnerOverCap && currentOwner && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-2 flex items-center gap-2 text-[11px] text-red-700 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          <span>
                            {currentOwner.nama} telah mencapai batas kapasitas ({ownerUsedCap}/{ownerMaxCap} SP).
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
            <div className="pt-4 border-t border-[#C9E4D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {canStartSprint ? (
                  <span className="text-[#3E9463] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#3E9463]" />
                    Sprint siap dimulai dengan {validAssignedCards.length} kartu backlog.
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Minimal 1 kartu harus memiliki Story Point &amp; PIC Owner untuk memulai sprint.
                  </span>
                )}
              </div>

              <Button
                type="button"
                disabled={!canStartSprint || startingSprint}
                onClick={handleStartSprintClick}
                className="bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition-all"
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
