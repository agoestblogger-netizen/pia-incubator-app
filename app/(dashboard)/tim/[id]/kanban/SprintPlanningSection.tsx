"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberCapacityInfo, upsertMemberCapacityAction } from "@/app/actions/capacity";
import { updateSprintGoalAction, getSuggestedSprintGoalAction } from "@/app/actions/sprint";
import { getHeuristicSprintGoal } from "@/lib/ai/sprint-goal-generator";
import { toast } from "@/components/ui/ToastProvider";
import { getPhaseTokenBySlug } from "@/lib/theme/tokens";
import { detectCvBakuCardType } from "@/lib/utils/cv-cards";
import { isMvMandatoryCard } from "@/lib/utils/mv-cards";

import { BacklogReferenceDropdown } from "./BacklogReferenceDropdown";

export interface PlanningCardAssignment {
  cardId: string;
  storyPoint: number | null;
  estimatedMinutes: number | null;
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
  currentUser?: any;
  isAdmin?: boolean;
  isCoachOrAdmin?: boolean;
  phaseGateStatus?: any;
  onOpenCardDetail: (card: any, forceSprintNum?: number) => void;
  onOpenCreateBacklogModal: (sprintNum: number) => void;
  onOpenCreateIssueModal?: (sprintNum: number) => void;
  onRefreshCapacities: () => void;
  onStartSprint: (
    sprintId: string,
    assignments: Array<{ cardId: string; storyPoint?: number | null; ownerAnggotaId?: string | null }>
  ) => Promise<void>;
  startingSprint: boolean;
}

function formatHoursDuration(hours: number): string {
  if (hours <= 0) return "0 jam";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours} jam`;
  if (wholeHours === 0) return `${minutes} menit`;
  return `${wholeHours} jam ${minutes} menit`;
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
  currentUser,
  isAdmin: propIsAdmin,
  phaseGateStatus,
  onOpenCardDetail,
  onOpenCreateBacklogModal,
  onOpenCreateIssueModal,
  onRefreshCapacities,
  onStartSprint,
  startingSprint,
  isCoachOrAdmin: propIsCoachOrAdmin,
}: SprintPlanningSectionProps) {
  const router = useRouter();
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [tempCapacityVal, setTempCapacityVal] = useState<number>(2);
  const [tempSubtaskCapacityVal, setTempSubtaskCapacityVal] = useState<number | "">("");
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Admin & Coach status check
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = propIsAdmin ?? Boolean(
    currentUser?.globalRoles?.some((r: string) =>
      ["super_admin", "admin_ic", "admin"].includes(r)
    ) || ["super_admin", "admin_ic", "admin"].includes(userRole)
  );
  const isCoach = Boolean(
    userRole === "coach" ||
    userRole === "innovation_coach" ||
    currentUser?.globalRoles?.some((r: string) => ["coach", "innovation_coach"].includes(r))
  );
  const isAdminOrCoach = propIsCoachOrAdmin ?? (isAdmin || isCoach);

  // Sprint Goal state & auto-suggestion
  const [savedGoal, setSavedGoal] = useState<string>(sprint.sprintGoal || "");
  const [sprintGoal, setSprintGoal] = useState<string>(sprint.sprintGoal || "");
  const [isSuggestedGoal, setIsSuggestedGoal] = useState<boolean>(false);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);

  // Check if goal is already saved
  const isGoalSaved = Boolean(savedGoal && savedGoal.trim().length > 0);
  const isGoalLocked = isGoalSaved && !isAdminOrCoach;

  // Phase gating check
  const isCvUnlocked = Boolean(phaseGateStatus?.gates?.customerValidation?.unlocked);
  const isMvUnlocked = Boolean(phaseGateStatus?.gates?.marketValidation?.unlocked);

  // Auto-suggest when sprint changes:
  // - If sprint already has a saved sprintGoal → load it as-is
  // - If sprintGoal is empty BUT backlog has cards → instant heuristic (fast, no network)
  // - If sprintGoal is empty AND backlog is also empty → call server action which
  //   falls back to CV Planning Form data (or generic placeholder if form is also empty)
  React.useEffect(() => {
    let cancelled = false;
    setSavedGoal(sprint.sprintGoal || "");

    if (sprint.sprintGoal && sprint.sprintGoal.trim().length > 0) {
      setSprintGoal(sprint.sprintGoal);
      setIsSuggestedGoal(false);
      return;
    }

    if (backlogCards && backlogCards.length > 0) {
      // Instant heuristic from backlog cards (no server round-trip needed)
      const suggestion = getHeuristicSprintGoal(backlogCards);
      setSprintGoal(suggestion);
      setIsSuggestedGoal(true);
      return;
    }

    // No backlog → ask server (server checks CV plan as fallback)
    setLoadingSuggestion(true);
    getSuggestedSprintGoalAction(timId, sprint.nomorSprint)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.suggestedGoal) {
          setSprintGoal(res.suggestedGoal);
          setIsSuggestedGoal(true);
        } else {
          setSprintGoal("");
          setIsSuggestedGoal(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSprintGoal("");
          setIsSuggestedGoal(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestion(false);
      });

    return () => { cancelled = true; };
  }, [sprint.id, sprint.sprintGoal, backlogCards, timId]);

  const handleSaveSprintGoal = async (valToSave?: string) => {
    const text = (valToSave !== undefined ? valToSave : sprintGoal).trim();
    if (!text) return;
    if (text === (savedGoal || "").trim()) return;
    setSavingGoal(true);
    try {
      const res = await updateSprintGoalAction(timId, sprint.id, text);
      if (res.success) {
        setSavedGoal(text);
        setSprintGoal(text);
        sprint.sprintGoal = text;
        setIsSuggestedGoal(false);
        toast.success("Sprint Goal berhasil disimpan!", "Goal Tersimpan");
        if (onRefreshCapacities) onRefreshCapacities();
        router.refresh();
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
    setLoadingSuggestion(true);
    try {
      const res = await getSuggestedSprintGoalAction(timId, sprint.nomorSprint);
      if (res.success && res.suggestedGoal) {
        setSprintGoal(res.suggestedGoal);
        setIsSuggestedGoal(true);
        toast.success("Saran Sprint Goal diperbarui!", "Saran AI");
      } else {
        toast.info("Belum ada data yang cukup untuk membuat saran. Isi Form Perencanaan CV atau tambahkan backlog terlebih dahulu.", "Tidak Ada Saran");
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
        estimatedMinutes: c.estimatedMinutes ?? Math.round((c.storyPoint ?? 3) * 60),
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
            estimatedMinutes: c.estimatedMinutes ?? Math.round((c.storyPoint ?? 3) * 60),
            ownerAnggotaId: c.ownerAnggotaId ?? null,
          };
        }
      });
      return next;
    });
  }, [backlogCards]);

  // Anggota tim yang diikutsertakan dalam Kapasitas Sprint Planning (Paket 24b - Role Config Filter)
  const includedMembers = useMemo(() => {
    if (!capacities || capacities.length === 0) return [];
    return capacities.filter((c) => c.isIncludedInCapacity !== false);
  }, [capacities]);

  // Batas Maksimal Jam Kerja Kelompok = SUM kapasitas jam semua anggota tim yang diikutsertakan
  const totalTeamMaxHours = useMemo(() => {
    return includedMembers.reduce((sum, c) => sum + (c.kapasitasJam ?? 2), 0);
  }, [includedMembers]);

  // Akumulasi Total Durasi Subtask dari semua kartu di sprint ini (Paket 24a)
  const totalSubtaskHours = useMemo(() => {
    return backlogCards.reduce((sum, c) => sum + (c.totalSubtaskHours || 0), 0);
  }, [backlogCards]);

  // Akumulasi Total Estimated Menit per anggota dari kartu board (Paket 24c)
  const taskMinutesPerMember = useMemo(() => {
    const map = new Map<string, number>();
    includedMembers.forEach(member => {
      let total = 0;
      backlogCards.filter((c) => c.ownerAnggotaId === member.anggotaTimId).forEach((c) => {
        total += c.estimatedMinutes ?? 0;
      });
      map.set(member.anggotaTimId, total);
    });
    return map;
  }, [includedMembers, backlogCards]);

  const totalTeamPct = totalTeamMaxHours > 0 ? Math.round((totalSubtaskHours / totalTeamMaxHours) * 100) : 0;

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

  // Handle updating Estimasi Waktu (menit) for a card (Paket 24a)
  const handleMinutesChange = (cardId: string, value: string) => {
    const minutes = value === "" ? null : Math.max(1, parseInt(value, 10) || 60);
    const storyPoint = minutes !== null ? Math.max(1, Math.round(minutes / 60)) : null;

    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, storyPoint: 3, estimatedMinutes: null, ownerAnggotaId: null }),
        storyPoint: storyPoint,
        estimatedMinutes: minutes,
      },
    }));
  };

  // Handle updating owner for a card
  const handleOwnerChange = (cardId: string, newOwnerId: string | null) => {
    setAssignments((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { cardId, storyPoint: 3, estimatedMinutes: Math.round(3 * 60), ownerAnggotaId: null }),
        ownerAnggotaId: newOwnerId === "" ? null : newOwnerId,
      },
    }));
  };

  // Handle saving edited Jam & Subtask capacity (Paket 24b)
  const handleSaveCapacity = async (anggotaId: string) => {
    setSavingCapacity(true);
    const parsedSubtask =
      tempSubtaskCapacityVal === "" || tempSubtaskCapacityVal === null
        ? null
        : Math.max(1, Number(tempSubtaskCapacityVal));

    const res = await upsertMemberCapacityAction(
      timId,
      anggotaId,
      sprint.nomorSprint,
      {
        kapasitasJam: tempCapacityVal,
        kapasitasSubtask: parsedSubtask,
      }
    );
    if (res.success) {
      toast.success("Kapasitas anggota berhasil diperbarui.", "Kapasitas Disimpan");
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
        estimatedMinutes: asg.estimatedMinutes,
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
                {isGoalSaved ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Goal Disimpan</span>
                  </span>
                ) : isSuggestedGoal ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Saran Otomatis AI</span>
                  </span>
                ) : null}
                {isGoalSaved && isAdminOrCoach && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-900 bg-purple-200 px-2 py-0.5 rounded-full border border-purple-300 shadow-2xs">
                    <ShieldCheck className="h-3 w-3 text-purple-700" />
                    <span>Mode {isAdmin ? "Admin" : "Coach"} — Kunci dilewati</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Target luaran utama yang disepakati bersama tim selama sprint ini berjalan
              </p>
            </div>
          </div>

          {canEdit && (!isGoalSaved || isAdminOrCoach) && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFetchAiSuggestion}
                disabled={loadingSuggestion || savingGoal}
                className="h-7 text-[11px] font-semibold text-purple-700 hover:text-purple-800 hover:bg-purple-100/60 gap-1 px-2.5 rounded-lg cursor-pointer"
                title="Generate saran Sprint Goal dari backlog aktual"
              >
                {loadingSuggestion ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
                <span>{isGoalSaved ? "Saran Ulang AI" : "Saran Otomatis AI"}</span>
              </Button>
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
            </div>
          )}
        </div>

        <div className="relative">
          {isGoalLocked ? (
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/95 border border-purple-200/90 text-xs sm:text-sm text-purple-950 font-medium leading-relaxed shadow-2xs italic">
              &ldquo;{sprintGoal || savedGoal}&rdquo;
            </div>
          ) : (
            <Textarea
              rows={2}
              disabled={!canEdit}
              value={sprintGoal}
              onChange={(e) => {
                setSprintGoal(e.target.value);
                setIsSuggestedGoal(false);
              }}
              placeholder="Belum ada saran — tambahkan backlog dulu atau isi manual sasaran utama sprint ini..."
              className={`text-xs sm:text-sm resize-none rounded-xl transition-all ${
                isSuggestedGoal
                  ? "italic text-purple-950 border-purple-300 bg-purple-50/40 focus:bg-white focus:not-italic"
                  : "text-gray-900 border-gray-300 bg-white"
              }`}
            />
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BAGIAN C: PANEL "BACKLOG REFERENSI" */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
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
            Usulan AI &amp; template validasi dari proposal, lengkap dengan estimasi waktu &amp; Story Point
          </span>
        </div>

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
            Alokasikan estimasi menit dan PIC owner sebelum memulai eksekusi sprint
          </span>
        </div>

        <div className="bg-[#E3F0E6] rounded-2xl border-2 border-[#3E9463]/70 p-5 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9E4D0] pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0B3D2E]" />
              <h4 className="text-xs font-extrabold text-[#0B3D2E] uppercase tracking-wider">
                Panel Kapasitas Tim &amp; Backlog Kerja
              </h4>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                {isAdminOrCoach && onOpenCreateIssueModal && (
                  <Button
                    size="sm"
                    onClick={() => onOpenCreateIssueModal(sprint.nomorSprint)}
                    className="border border-orange-300 bg-orange-50/90 hover:bg-orange-100 text-orange-950 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs gap-1.5 cursor-pointer active:scale-98 transition-all"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                    <span>+ Tambah Issue</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => onOpenCreateBacklogModal(sprint.nomorSprint)}
                  className="bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs gap-1.5 cursor-pointer active:scale-98 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Tambah Backlog</span>
                </Button>
              </div>
            )}
          </div>

          {/* Panel Kapasitas Anggota Tim — Sprint N (Paket 24a & 24b) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#0B3D2E] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#3E9463]" />
                <span>Kapasitas Anggota Tim (Role Aktif)</span>
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Klik ikon pensil untuk menyesuaikan kapasitas jam &amp; batas subtask per orang
              </span>
            </div>

            {includedMembers.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center bg-[#F0F7F1] border border-[#C9E4D0] rounded-xl">
                Belum ada anggota tim dengan role aktif untuk kapasitas sprint. Periksa konfigurasi role di menu Admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {includedMembers.map((member) => {
                  const maxJam = member.kapasitasJam ?? 2;
                  const maxSubtask = member.kapasitasSubtask;
                  const subtaskCount = member.subtasksCount ?? 0;
                  const isEditing = editingCapacityId === member.anggotaTimId;
                  const totalTaskMin = taskMinutesPerMember.get(member.anggotaTimId) ?? 0;

                  // Progress calculation if subtask cap is set
                  const hasSubtaskCap = maxSubtask !== null && maxSubtask !== undefined && maxSubtask > 0;
                  const subtaskPct = hasSubtaskCap ? Math.round((subtaskCount / maxSubtask) * 100) : 0;

                  let progressColor = "bg-emerald-500";
                  let textColor = "text-emerald-800";
                  if (subtaskPct >= 100) {
                    progressColor = "bg-red-500";
                    textColor = "text-red-700 font-black";
                  } else if (subtaskPct >= 60) {
                    progressColor = "bg-amber-500";
                    textColor = "text-amber-700 font-bold";
                  }

                  return (
                    <div
                      key={member.anggotaTimId}
                      className="p-3.5 rounded-xl border border-l-4 border-l-[#3E9463] border-[#C9E4D0] bg-[#F0F7F1] hover:bg-white shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">
                            {member.nama}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-[#0B3D2E] bg-emerald-50 border border-[#C9E4D0] px-1.5 py-0.2 rounded">
                              {member.roleName || member.jabatan || "Anggota"}
                            </span>
<div className="text-[10px] text-gray-500 ml-2">
                              const totalTaskMin = taskMinutesPerMember.get(member.anggotaTimId) ?? 0;
                              Task: {totalTaskMin !== 0 ? 
                                Math.floor(totalTaskMin / 60) + " jam " + 
                                (totalTaskMin % 60) + " menit" 
                                : "-"}
                            </div>
                          </div>
                        </div>

                        {/* Edit Capacity Trigger */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveCapacity(member.anggotaTimId)}
                              disabled={savingCapacity}
                              className="h-6 w-6 rounded bg-[#3E9463] text-white flex items-center justify-center hover:bg-[#0B3D2E] disabled:opacity-50 cursor-pointer"
                              title="Simpan kapasitas"
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
                              className="h-6 w-6 rounded bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCapacityId(member.anggotaTimId);
                                setTempCapacityVal(maxJam);
                                setTempSubtaskCapacityVal(maxSubtask ?? "");
                              }}
                              title="Klik untuk ubah kapasitas jam & batas subtask"
                              className="text-gray-400 hover:text-[#3E9463] p-1 rounded hover:bg-white transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )
                        )}
                      </div>

                      {/* Edit Mode Inputs */}
                      {isEditing ? (
                        <div className="space-y-2 p-2 bg-white rounded-lg border border-[#C9E4D0] text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                              Kapasitas Jam (default 2 jam):
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={tempCapacityVal}
                              onChange={(e) =>
                                setTempCapacityVal(Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="h-7 text-xs px-2 font-bold border-[#C9E4D0]"
                              disabled={savingCapacity}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                              Batas Subtask (opsional / kosong = tanpa batas):
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              placeholder="Tanpa Batas"
                              value={tempSubtaskCapacityVal}
                              onChange={(e) =>
                                setTempSubtaskCapacityVal(
                                  e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1)
                                )
                              }
                              className="h-7 text-xs px-2 font-bold border-[#C9E4D0]"
                              disabled={savingCapacity}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Normal View Metrics */
                        <div className="space-y-2 pt-1 border-t border-[#C9E4D0]">
                          {/* Durasi Jam */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 font-medium">Kapasitas Jam:</span>
                            <span className="font-extrabold text-[#0B3D2E] bg-white px-2 py-0.5 rounded-md border border-[#C9E4D0] shadow-2xs">
                              {maxJam} Jam
                            </span>
                          </div>

                          {/* Subtask Capacity (Paket 24b) */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">Beban Subtask:</span>
                              {hasSubtaskCap ? (
                                <span className={`text-[11px] font-extrabold ${textColor}`}>
                                  {subtaskCount} / {maxSubtask} subtask ({subtaskPct}%)
                                </span>
                              ) : (
                                <span className="font-bold text-[#0B3D2E] bg-white px-2 py-0.5 rounded-md border border-[#C9E4D0] text-[11px]">
                                  {subtaskCount} subtask diambil
                                </span>
                              )}
                            </div>

                            {/* Progress bar only shown if kapasitas_subtask is set */}
                            {hasSubtaskCap && (
                              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${progressColor} transition-all duration-300`}
                                  style={{ width: `${Math.min(100, subtaskPct)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Tim: Akumulasi Durasi Subtask (Non-blocking Gauge) — Paket 24a */}
            {anggotaTim.length > 0 && (
              <div className="p-4 bg-[#0B3D2E] rounded-2xl border border-[#0B3D2E] shadow-sm space-y-2.5">
                <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                  <span className="flex items-center gap-2 text-white font-extrabold text-xs">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>
                      Total Tim (Durasi Subtask):{" "}
                      <span className="text-[#F0C24B] font-black text-sm">
                        {formatHoursDuration(totalSubtaskHours)}
                      </span>
                      <span className="text-emerald-200 font-normal text-xs ml-1.5">
                        / Batas Kelompok: {totalTeamMaxHours} jam
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
                  Akumulasi total durasi seluruh subtask kartu pada sprint ini dibandingkan dengan batas maksimal jam kerja kelompok. Indikator ini bersifat informasional (non-blocking).
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
                    estimatedMinutes: card.estimatedMinutes ?? Math.round((card.storyPoint ?? 3) * 60),
                    ownerAnggotaId: card.ownerAnggotaId ?? null,
                  };

                  const currentOwnerId = currentAsg.ownerAnggotaId;
                  const currentSp = currentAsg.storyPoint ?? (card.storyPoint ?? 3);
                  const currentMinutes = currentAsg.estimatedMinutes ?? Math.round(currentSp * 60);
                  const isBakuCv =
                    detectCvBakuCardType(card.judul, card.tahap) !== null ||
                    card.label === "Template Baku CV";
                  const isMandatory = isBakuCv || isMvMandatoryCard(card.judul, card.tahap);

                  return (
                    <div
                      key={card.id}
                      className="bg-[#F0F7F1] rounded-xl border border-[#C9E4D0] p-3.5 shadow-2xs hover:border-[#3E9463]/50 transition-all space-y-3"
                    >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                {isMandatory && (
                                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs">
                                    Wajib
                                  </span>
                                )}
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#3E9463] text-white shadow-2xs">
                                  {card.tahap ? card.tahap.replace(/_/g, " ") : "Innovation Setup"}
                                </span>
                                {card.label && (
                                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#B8860B] text-white shadow-2xs">
                                    🏷️ {card.label}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs font-extrabold truncate ${isBakuCv ? "text-rose-700" : "text-gray-900"}`}>
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

                      {/* Inputs: Estimasi Waktu (Menit) + Owner PIC (Paket 24a) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#C9E4D0]">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-[#8A6300] flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#B8860B]" />
                              <span>Estimasi Waktu (menit)</span>
                            </label>
                            <span className="text-[10px] font-extrabold text-[#8A6300] bg-[#FBF3DD] px-1.5 py-0.5 rounded border border-[#D4AF37]">
                              {currentMinutes} menit ({Number.isInteger(currentMinutes / 60) ? `${currentMinutes / 60} jam` : `${(currentMinutes / 60).toFixed(1)} jam`})
                            </span>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            disabled={!canEdit}
                            value={Number.isFinite(currentMinutes) ? Math.max(1, Math.round(currentMinutes)) : 60}
                            onChange={(e) => handleMinutesChange(card.id, e.target.value)}
                            className="h-8 text-xs bg-[#FBF3DD] border-2 border-[#D4AF37] hover:border-[#B8860B] rounded-lg px-2 text-[#8A6300] font-extrabold focus:ring-2 focus:ring-[#D4AF37] transition-colors"
                            placeholder="Contoh: 120"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-800 block mb-1 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[#3E9463]" />
                            <span>Koordinator / Penanggung Jawab Utama</span>
                          </label>
                          <select
                            value={currentOwnerId || ""}
                            disabled={!canEdit}
                            onChange={(e) => handleOwnerChange(card.id, e.target.value || null)}
                            className="w-full h-8 text-xs bg-[#F0F7F1] border-2 border-[#C9E4D0] hover:border-[#3E9463] rounded-lg px-2 text-gray-900 font-bold focus:ring-2 focus:ring-[#C9E4D0] focus:border-[#3E9463] transition-colors"
                          >
                            <option value="">-- Pilih Owner --</option>
                            {anggotaTim.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nama} ({a.jabatan || "Anggota Tim"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
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
