"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createKanbanCardAction,
  updateKanbanCardStatusAction,
  updateKanbanCardSprintAction,
  updateKanbanCardFullAction,
  deleteKanbanCardAction,
  getTaskAttachmentsAction,
  addTaskAttachmentAction,
  deleteTaskAttachmentAction,
  getTaskLinksAction,
  addTaskLinkAction,
  deleteTaskLinkAction,
  adoptAiCardAction,
  getTaskSubtasksAction,
  createTaskSubtaskAction,
  updateSubtaskAssigneeAction,
  toggleTaskSubtaskAction,
  deleteTaskSubtaskAction,
  updateTaskSubtaskTitleAction,
  updateTaskSubtaskHoursAction,
  addSubtaskAttachmentAction,
  deleteSubtaskAttachmentAction,
  getTaskCommentsAction,
  createTaskCommentAction,
  getTaskActivityLogsAction,
} from "@/app/actions/kanban";
import {
  startSprintAction,
  completeSprintAction,
  updateSprintCountAction,
  generateSprintReviewDraftAction,
} from "@/app/actions/sprint";
import {
  getTeamCapacityForSprint,
  MemberCapacityInfo,
} from "@/app/actions/capacity";
import { SprintPlanningSection } from "./SprintPlanningSection";
import { MandatorySubtaskModal } from "@/components/kanban/MandatorySubtaskModal";
import { detectCvBakuCardType } from "@/lib/utils/cv-cards";
import { detectMvBakuCardType, isMvMandatoryCard } from "@/lib/utils/mv-cards";
import { toast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Plus,
  Calendar,
  Layers,
  Kanban as KanbanIcon,
  Clock,
  Tag,
  GripVertical,
  AlertCircle,
  AlertTriangle,
  Play,
  CheckCircle2,
  Settings2,
  ArrowRight,
  Sparkles,
  Inbox,
  Loader2,
  Trash2,
  User,
  ExternalLink,
  Paperclip,
  Link2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  UploadCloud,
  Globe,
  Video,
  HardDrive,
  Download,
  Target,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Lock,
  Unlock,
  PlayCircle,
  FolderKanban,
  Check,
  CheckSquare,
  Square,
  MessageSquare,
  History,
  Send,
  Zap,
  ListTodo,
} from "lucide-react";
import { formatDateIndo } from "@/lib/utils";
import {
  getColumnPillStyle,
  getPastelCardVariant,
  getPhaseTokenBySlug,
  PHASE_TOKENS,
} from "@/lib/theme/tokens";

// ─────────────────────────────────────────────────────────────────────────────
// Format Helpers for Activity & Comments
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTimeIndo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatActivityLogText(log: any): string {
  const actor = log.userNama || "Pengguna";
  switch (log.actionType) {
    case "created":
      return `${actor} membuat kartu ini`;
    case "status_change":
      return `${actor} mengubah Status Kolom dari "${log.oldValue || "-"}" ke "${log.newValue || "-"}"`;
    case "owner_change":
      return `${actor} mengubah Owner / PIC dari "${log.oldValue || "Belum Ditugaskan"}" ke "${log.newValue || "Belum Ditugaskan"}"`;
    case "estimate_change":
      return `${actor} mengubah Estimasi Jam dari "${log.oldValue || "0 jam"}" ke "${log.newValue || "0 jam"}"`;
    case "sprint_change":
      return `${actor} mengubah Penugasan Sprint dari "${log.oldValue || "Backlog"}" ke "${log.newValue || "Backlog"}"`;
    default:
      return `${actor} mengubah ${log.fieldName || "kartu"} dari "${log.oldValue || "-"}" ke "${log.newValue || "-"}"`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment & Link Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDomainIcon(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      return <HardDrive className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
    }
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return <Video className="h-3.5 w-3.5 text-red-600 shrink-0" />;
    }
    return <Globe className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  } catch {
    return <Link2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
  }
}

function getFileIcon(fileName: string, fileType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || fileType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-purple-600 shrink-0" />;
  }
  if (ext === "pdf" || fileType?.includes("pdf")) {
    return <FileText className="h-4 w-4 text-red-600 shrink-0" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext) || fileType?.includes("spreadsheet") || fileType?.includes("excel")) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-blue-600 shrink-0" />;
}

// dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─────────────────────────────────────────────────────────────────────────────
// Card Component (Sortable) with Overdue Visualization & Modal Click
// ─────────────────────────────────────────────────────────────────────────────

function SortableCard({
  card,
  columns,
  sprints,
  isBacklog = false,
  cardIndex,
  onMoveCard,
  onAssignSprint,
  onSelectCard,
}: {
  card: any;
  columns: any[];
  sprints: any[];
  isBacklog?: boolean;
  cardIndex?: number;
  onMoveCard: (cardId: string, newCol: string) => void;
  onAssignSprint: (cardId: string, sprintNum: number | null) => void;
  onSelectCard: (card: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const now = new Date();
  const isDone = card.statusKolom === "Done";
  const isOverdue =
    Boolean(card.tanggalSelesai) &&
    new Date(card.tanggalSelesai) < now &&
    !isDone;

  const overdueDays = isOverdue
    ? Math.ceil(
        (now.getTime() - new Date(card.tanggalSelesai).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const pastel =
    cardIndex !== undefined && !isOverdue && !isDragging
      ? getPastelCardVariant(cardIndex)
      : null;

  const isBakuCv =
    detectCvBakuCardType(card.judul, card.tahap) !== null ||
    card.label === "Template Baku CV";
  const isMandatoryMv = isMvMandatoryCard(card.judul, card.tahap);
  const isMandatoryCard = isBakuCv || isMandatoryMv;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(pastel && !isDragging && !isOverdue
          ? { backgroundColor: pastel.hexBg, borderColor: pastel.hexBorder }
          : {}),
      }}
      {...attributes}
      className={`group relative rounded-xl p-3.5 border transition-all select-none shadow-2xs ${
        isDragging
          ? "border-[#0F5132] bg-green-50/20 shadow-lg"
          : isOverdue
          ? "border-red-400 bg-red-50/25 hover:border-red-500 hover:shadow-sm ring-1 ring-red-300"
          : pastel
          ? `${pastel.bg} ${pastel.border} ${pastel.hover} hover:shadow-xs`
          : "border-gray-200 bg-white hover:border-[#0F5132]/60 hover:shadow-sm"
      }`}
    >
      {/* Top Tag & Drag handle */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div
          onClick={() => onSelectCard(card)}
          className="flex flex-wrap items-center gap-1.5 cursor-pointer"
        >
          {card.tipeKartu === "issue" && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-950 border border-orange-300 shadow-2xs">
              <AlertCircle className="h-2.5 w-2.5 text-orange-700" />
              <span>ISSUE</span>
            </span>
          )}

          {isMandatoryCard && (
            <span className="inline-flex items-center text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs">
              Wajib
            </span>
          )}

          {card.label && card.label !== "Issue" && (
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pastel ? pastel.badge : "bg-[#0F5132]/10 text-[#0F5132]"
              }`}
            >
              {card.label}
            </span>
          )}

          {/* Story Point Badge */}
          <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100/90 text-purple-900 border border-purple-200/70 shadow-2xs">
            <Zap className="h-2.5 w-2.5 text-purple-700 fill-purple-700" />
            {card.storyPoint || 3} SP
          </span>

          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Terlambat {overdueDays} hari</span>
            </span>
          )}
        </div>

        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -mr-1 text-gray-300 hover:text-gray-600 rounded transition-colors touch-none"
          title="Geser kartu"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Card Body - Click to open full detail modal */}
      <div
        onClick={() => onSelectCard(card)}
        className="cursor-pointer space-y-1.5 group-hover:text-[#0F5132]"
      >
        <h4
          className={`text-xs font-bold leading-tight transition-colors ${
            isMandatoryCard
              ? "text-rose-700 font-extrabold group-hover:text-rose-800"
              : isOverdue
              ? "text-red-950"
              : pastel
              ? "text-gray-900 group-hover:text-gray-950"
              : "text-gray-900 group-hover:text-[#0F5132]"
          }`}
        >
          {card.judul}
        </h4>

        {card.deskripsi && (
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
            {card.deskripsi}
          </p>
        )}

        {/* Attachment & Link Count Badges */}
        {(Boolean(card.attachmentsCount) || Boolean(card.linksCount)) && (
          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-gray-600 font-medium">
            {Boolean(card.attachmentsCount) && (
              <span
                className="inline-flex items-center gap-1 bg-white/80 hover:bg-white border border-gray-200/70 px-1.5 py-0.5 rounded text-gray-700 transition-colors shadow-2xs"
                title={`${card.attachmentsCount} Lampiran`}
              >
                <Paperclip className="h-3 w-3 text-gray-500" />
                <span>{card.attachmentsCount}</span>
              </span>
            )}
            {Boolean(card.linksCount) && (
              <span
                className="inline-flex items-center gap-1 bg-white/80 hover:bg-white border border-gray-200/70 px-1.5 py-0.5 rounded text-gray-700 transition-colors shadow-2xs"
                title={`${card.linksCount} Tautan`}
              >
                <Link2 className="h-3 w-3 text-gray-500" />
                <span>{card.linksCount}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Sprint selector, Due date, Status selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-gray-200/50 text-[10px] text-gray-400">
        {card.tanggalSelesai ? (
          <span
            onClick={() => onSelectCard(card)}
            className={`flex items-center gap-1 font-mono cursor-pointer ${
              isOverdue ? "text-red-700 font-bold" : "text-gray-500"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {formatDateIndo(card.tanggalSelesai)}
          </span>
        ) : (
          <span onClick={() => onSelectCard(card)} className="cursor-pointer">-</span>
        )}

        <div className="flex items-center gap-1">
          {/* Sprint assignment dropdown */}
          <select
            className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F5132] shadow-2xs"
            value={card.sprintNumber === null ? "backlog" : String(card.sprintNumber)}
            onChange={(e) => {
              const val = e.target.value === "backlog" ? null : parseInt(e.target.value);
              onAssignSprint(card.id, val);
            }}
            onClick={(e) => e.stopPropagation()}
            title="Pindahkan ke Sprint / Backlog"
          >
            <option value="backlog">📦 Backlog</option>
            {sprints.map((s) => (
              <option key={s.nomorSprint} value={s.nomorSprint}>
                Sprint {s.nomorSprint} {s.status === "aktif" ? "(Aktif)" : ""}
              </option>
            ))}
          </select>

          {/* Status Column dropdown */}
          <select
            className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0F5132] shadow-2xs"
            value={card.statusKolom}
            onChange={(e) => onMoveCard(card.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            title="Ubah status kolom"
          >
            {columns.map((c) => (
              <option key={c.namaKolom} value={c.namaKolom}>
                {c.namaKolom}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Drag Overlay Presentation
// ─────────────────────────────────────────────────────────────────────────────

function DraggingCardOverlay({ card }: { card: any }) {
  if (!card) return null;

  return (
    <div className="bg-white rounded-xl p-3.5 border-2 border-[#0F5132] shadow-2xl space-y-2 opacity-95 rotate-2 scale-105 ring-4 ring-[#0F5132]/10 cursor-grabbing w-72">
      {card.label && (
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F5132]/10 text-[#0F5132]">
          {card.label}
        </span>
      )}
      <h4 className="text-xs font-bold text-gray-900 leading-tight">
        {card.judul}
      </h4>
      {card.deskripsi && (
        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
          {card.deskripsi}
        </p>
      )}
      {(Boolean(card.attachmentsCount) || Boolean(card.linksCount)) && (
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-gray-600 font-medium">
          {Boolean(card.attachmentsCount) && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              <Paperclip className="h-3 w-3 text-gray-500" />
              <span>{card.attachmentsCount}</span>
            </span>
          )}
          {Boolean(card.linksCount) && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              <Link2 className="h-3 w-3 text-gray-500" />
              <span>{card.linksCount}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Droppable Container
// ─────────────────────────────────────────────────────────────────────────────

function KanbanColumnDroppable({
  columnId,
  columnTitle,
  cards,
  columns,
  sprints,
  isBacklogArea = false,
  columnIndex = 0,
  onAddCard,
  onMoveCard,
  onAssignSprint,
  onSelectCard,
}: {
  columnId: string;
  columnTitle: string;
  cards: any[];
  columns: any[];
  sprints: any[];
  isBacklogArea?: boolean;
  columnIndex?: number;
  onAddCard: (colName: string) => void;
  onMoveCard: (cardId: string, newCol: string) => void;
  onAssignSprint: (cardId: string, sprintNum: number | null) => void;
  onSelectCard: (card: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: "Column",
      columnId,
      isBacklogArea,
    },
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const pillStyle = useMemo(
    () => getColumnPillStyle(columnTitle, columnIndex),
    [columnTitle, columnIndex]
  );

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-3.5 border transition-all flex flex-col space-y-3 min-h-[360px] ${
        isOver
          ? "bg-green-50/70 border-[#0F5132]/60 ring-2 ring-[#0F5132]/20"
          : isBacklogArea
          ? "bg-slate-50/90 border-slate-200 shadow-2xs"
          : "bg-gray-50/80 border-gray-200 shadow-2xs"
      }`}
    >
      {/* Column Header: Pill Berwarna Solid */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm text-white border border-white/20"
            style={{ backgroundColor: isBacklogArea ? "#5142D6" : pillStyle.hex }}
          >
            {isBacklogArea ? (
              <Inbox className="h-3.5 w-3.5 text-white" />
            ) : (
              <span className={`h-2 w-2 rounded-full ${pillStyle.dot}`} />
            )}
            <span className="tracking-wide text-white drop-shadow-2xs">{columnTitle}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-white/25 text-white ml-0.5 shadow-2xs">
              {cards.length}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddCard(isBacklogArea ? "To Do" : columnTitle)}
          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200/70 transition-colors"
          title={`Tambah kartu ke ${columnTitle}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards List with Sortable Context */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 flex-1">
          {cards.map((card, idx) => (
            <SortableCard
              key={card.id}
              card={card}
              columns={columns}
              sprints={sprints}
              isBacklog={isBacklogArea}
              cardIndex={idx}
              onMoveCard={onMoveCard}
              onAssignSprint={onAssignSprint}
              onSelectCard={onSelectCard}
            />
          ))}

          {cards.length === 0 && (
            <div className="h-28 border-2 border-dashed border-gray-300/70 rounded-xl flex items-center justify-center text-[11px] text-gray-400 italic">
              {isBacklogArea ? "Tarik kartu ke Backlog" : "Tarik kartu ke sini"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Kanban Client Component
// ─────────────────────────────────────────────────────────────────────────────

export function KanbanClient({
  timId,
  initialColumns,
  initialCards,
  initialSprints = [],
  anggotaTim,
  canEdit = true,
  canManageSprintCount = false,
  currentUser,
  phaseGateStatus,
  tahapScope = "innovation_setup",
}: {
  timId: string;
  initialColumns: any[];
  initialCards: any[];
  initialSprints?: any[];
  anggotaTim: any[];
  canEdit?: boolean;
  canManageSprintCount?: boolean;
  currentUser?: any;
  phaseGateStatus?: any;
  tahapScope?: string;
}) {
  const router = useRouter();
  const isAdmin = Boolean(
    currentUser?.globalRoles?.some((r: string) =>
      ["super_admin", "admin_ic", "admin"].includes(r)
    ) || currentUser?.hasGlobalScope
  );

  const isCoach = Boolean(
    currentUser?.timRoles?.some((r: any) => r.timId === timId && r.roleCode === "coach")
  );
  const isCoachOrAdmin = isAdmin || isCoach;

  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");
  const [cards, setCards] = useState<any[]>(initialCards);
  const [sprints, setSprints] = useState<any[]>(initialSprints);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  useEffect(() => {
    setSprints(initialSprints);
  }, [initialSprints]);
  const [columns] = useState<any[]>(
    initialColumns.length > 0
      ? initialColumns.filter((c: any) => c.namaKolom !== "Review")
      : [
          { id: "1", namaKolom: "To Do" },
          { id: "2", namaKolom: "In Progress" },
          { id: "4", namaKolom: "Done" },
        ]
  );

  // Selected Sprint Filter: 'all' | 'backlog' | number
  const initialActiveSprint = sprints.find((s) => s.status === "aktif");
  const [selectedSprintTab, setSelectedSprintTab] = useState<string>(
    initialActiveSprint
      ? String(initialActiveSprint.nomorSprint)
      : sprints.length > 0
      ? String(sprints[0].nomorSprint)
      : "all"
  );

  const [tahapFilter, setTahapFilter] = useState("all");
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState("To Do");
  const [targetSprintForNewCard, setTargetSprintForNewCard] = useState<number | null>(
    selectedSprintTab !== "all" && selectedSprintTab !== "backlog"
      ? parseInt(selectedSprintTab)
      : null
  );

  // Issue Card Modal State (Paket 24c - Coach & Admin only)
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false);
  const [issueJudul, setIssueJudul] = useState("");
  const [issueDeskripsi, setIssueDeskripsi] = useState("");
  const [issueDampak, setIssueDampak] = useState<"Rendah" | "Sedang" | "Tinggi" | "Kritis">("Sedang");
  const [issueOwnerAnggotaId, setIssueOwnerAnggotaId] = useState<string | null>(null);
  const [issueMenit, setIssueMenit] = useState<number | "">(180);
  const [savingIssue, setSavingIssue] = useState(false);

  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Sprint Complete Dialog State & AI Review Generator
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isGeneratingAiReview, setIsGeneratingAiReview] = useState(false);
  const [incompleteCardsDestinations, setIncompleteCardsDestinations] = useState<
    Record<string, "backlog" | "next_sprint">
  >({});
  const [reviewDemo, setReviewDemo] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewValue, setReviewValue] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState("");
  const [reviewContinue, setReviewContinue] = useState("");
  const [reviewStop, setReviewStop] = useState("");
  const [reviewStart, setReviewStart] = useState("");
  const [reviewOwnerTarget, setReviewOwnerTarget] = useState("");

  // Sprint Count Dialog State
  const [isSprintCountModalOpen, setIsSprintCountModalOpen] = useState(false);
  const [targetSprintCount, setTargetSprintCount] = useState(sprints.length);
  const [sprintCountReason, setSprintCountReason] = useState("");

  // Card Detail Modal State
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<any | null>(null);
  const [selectedRefCardId, setSelectedRefCardId] = useState<string>("");
  const [detailJudul, setDetailJudul] = useState("");
  const [detailDeskripsi, setDetailDeskripsi] = useState("");
  const [detailTahap, setDetailTahap] = useState("umum");
  const [detailSprintNumber, setDetailSprintNumber] = useState<number | null>(null);
  const [detailStatusKolom, setDetailStatusKolom] = useState("To Do");
  const [detailOwnerAnggotaId, setDetailOwnerAnggotaId] = useState<string | null>(null);
  const [detailEstimasiJam, setDetailEstimasiJam] = useState<number | null>(null);
  const [detailStoryPoint, setDetailStoryPoint] = useState<number | null>(3);
  const [detailLabel, setDetailLabel] = useState("");
  const [detailTanggalMulai, setDetailTanggalMulai] = useState("");
  const [detailTanggalSelesai, setDetailTanggalSelesai] = useState("");
  const [detailAcceptanceCriteria, setDetailAcceptanceCriteria] = useState("");
  const [detailDependencyRisiko, setDetailDependencyRisiko] = useState("");
  const [detailCustomDocumentData, setDetailCustomDocumentData] = useState<any>({});
  const [savingDetailCard, setSavingDetailCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);

  // Master Container (Daftar Sprint & Roadmap) & Sub-Accordion Sections State
  const [isDaftarSprintOpen, setIsDaftarSprintOpen] = useState<boolean>(true);
  const [activeSubSection, setActiveSubSection] = useState<1 | 2 | 0>(0);
  const [selectedSprintNum, setSelectedSprintNum] = useState<number>(() =>
    initialActiveSprint
      ? initialActiveSprint.nomorSprint
      : sprints.length > 0
      ? sprints[0].nomorSprint
      : 1
  );
  const [capacities, setCapacities] = useState<MemberCapacityInfo[]>([]);
  const [startingSprint, setStartingSprint] = useState(false);

  // AI Reference Adoption State
  const [adoptingCardId, setAdoptingCardId] = useState<string | null>(null);

  // Fetch capacities when selectedSprintNum changes
  const fetchCapacities = async (sprintNum: number) => {
    try {
      const data = await getTeamCapacityForSprint(timId, sprintNum);
      setCapacities(data);
    } catch (err) {
      console.error("Error fetching capacities:", err);
    }
  };

  useEffect(() => {
    fetchCapacities(selectedSprintNum);
  }, [timId, selectedSprintNum]);

  // Task Attachments & Links State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  const fetchTaskAttachments = async (taskId: string) => {
    setLoadingAttachments(true);
    const res = await getTaskAttachmentsAction(taskId);
    if (res.success && res.data) {
      setAttachments(res.data);
      setCards((prev) =>
        prev.map((c) => (c.id === taskId ? { ...c, attachmentsCount: res.data.length } : c))
      );
    }
    setLoadingAttachments(false);
  };

  const fetchTaskLinks = async (taskId: string) => {
    setLoadingLinks(true);
    const res = await getTaskLinksAction(taskId);
    if (res.success && res.data) {
      setLinks(res.data);
      setCards((prev) =>
        prev.map((c) => (c.id === taskId ? { ...c, linksCount: res.data.length } : c))
      );
    }
    setLoadingLinks(false);
  };

  // Subtasks State
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskHours, setNewSubtaskHours] = useState<number | "">("");
  const [newSubtaskAssigneeUserId, setNewSubtaskAssigneeUserId] = useState<string | null>(null);
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [togglingSubtaskId, setTogglingSubtaskId] = useState<string | null>(null);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  // Edit inline state
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskField, setEditingSubtaskField] = useState<'title' | 'hours' | null>(null);
  const [editTitleDraft, setEditTitleDraft] = useState("");
  const [editHoursDraft, setEditHoursDraft] = useState<number | "">("");
  // Mandatory Subtask Modal State
  const [selectedMandatorySubtask, setSelectedMandatorySubtask] = useState<any | null>(null);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);

  const fetchTaskSubtasks = async (taskId: string) => {
    setLoadingSubtasks(true);
    const res = await getTaskSubtasksAction(taskId);
    if (res.success && res.data) {
      setSubtasks(res.data);
    }
    setLoadingSubtasks(false);
  };

  const handleQuickAssignSprint = async (cardId: string, sprintNum: number | null) => {
    setDetailSprintNumber(sprintNum);
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              sprintNumber: sprintNum,
              statusKolom: sprintNum ? (c.statusKolom === 'Backlog' ? 'To Do' : c.statusKolom) : 'Backlog',
            }
          : c
      )
    );
    const res = await updateKanbanCardSprintAction(timId, cardId, sprintNum);
    if (res.success) {
      toast.success(
        sprintNum ? `Kartu berhasil di-assign ke Sprint ${sprintNum}.` : 'Kartu dikembalikan ke Backlog.',
        'Sprint Diperbarui'
      );
    } else {
      toast.error(res.error || 'Gagal update sprint kartu.');
    }
  };

  const handleCreateSubtask = async () => {
    if (!selectedCardForDetail || !newSubtaskTitle.trim()) return;
    if (selectedCardForDetail.isNewBacklog) {
      toast.error("Simpan kartu terlebih dahulu untuk menambah subtask.", "Kartu Belum Disimpan");
      return;
    }
    setCreatingSubtask(true);
    const parsedHours = newSubtaskHours === "" ? null : Math.max(0, Number(newSubtaskHours));
    const res = await createTaskSubtaskAction(
      selectedCardForDetail.id,
      timId,
      newSubtaskTitle.trim(),
      parsedHours,
      newSubtaskAssigneeUserId
    );
    if (res.success && res.data) {
      setSubtasks((prev) => [...prev, res.data]);
      setNewSubtaskTitle("");
      setNewSubtaskHours("");
      setNewSubtaskAssigneeUserId(null);
      toast.success("Subtask berhasil ditambahkan.");
    } else {
      toast.error(res.error || "Gagal membuat subtask.", "Gagal Menambah Subtask");
    }
    setCreatingSubtask(false);
  };

  const handleUpdateSubtaskAssignee = async (subtaskId: string, newUserId: string | null) => {
    const original = subtasks.find((s) => s.id === subtaskId);
    const oldUserId = original?.assigneeUserId ?? null;
    if (newUserId === oldUserId) return;

    // Optimistic update
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, assigneeUserId: newUserId } : s))
    );

    const res = await updateSubtaskAssigneeAction(
      subtaskId,
      timId,
      newUserId,
      detailSprintNumber || selectedCardForDetail?.sprintNumber
    );

    if (!res.success) {
      // Rollback
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, assigneeUserId: oldUserId } : s))
      );
      toast.error(res.error || "Gagal memperbarui PIC subtask.", "Kapasitas Terlampaui");
    } else {
      toast.success("PIC subtask berhasil diperbarui.");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    if (!selectedCardForDetail || selectedCardForDetail.isNewBacklog) return;
    setTogglingSubtaskId(subtaskId);
    const newStatus = !currentStatus;
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, isDone: newStatus } : st))
    );
    const res = await toggleTaskSubtaskAction(subtaskId, timId, newStatus);
    if (!res.success) {
      setSubtasks((prev) =>
        prev.map((st) => (st.id === subtaskId ? { ...st, isDone: currentStatus } : st))
      );
      toast.error(res.error || "Gagal mengubah status subtask.");
    }
    setTogglingSubtaskId(null);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedCardForDetail || selectedCardForDetail.isNewBacklog) return;
    setDeletingSubtaskId(subtaskId);
    const res = await deleteTaskSubtaskAction(subtaskId, timId);
    if (res.success) {
      setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
      toast.success("Subtask berhasil dihapus.");
    } else {
      toast.error(res.error || "Gagal menghapus subtask.");
    }
    setDeletingSubtaskId(null);
  };

  const handleStartEditTitle = (st: any) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskField('title');
    setEditTitleDraft(st.title);
  };

  const handleStartEditHours = (st: any) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskField('hours');
    setEditHoursDraft(st.estimatedHours === null || st.estimatedHours === undefined ? "" : Math.max(0, Math.round(Number(st.estimatedHours) || 0)));
  };

  const handleCancelEdit = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskField(null);
    setEditTitleDraft("");
    setEditHoursDraft("");
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    const trimmed = editTitleDraft.trim();
    // Temukan subtask asli untuk rollback kalau gagal
    const original = subtasks.find((s) => s.id === subtaskId);
    if (!trimmed || !original || trimmed === original.title) {
      handleCancelEdit();
      return;
    }
    // Optimistic update
    setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, title: trimmed } : s));
    handleCancelEdit();
    const res = await updateTaskSubtaskTitleAction(subtaskId, timId, trimmed);
    if (!res.success) {
      // Rollback
      setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, title: original.title } : s));
      toast.error(res.error || "Gagal memperbarui judul subtask.");
    }
  };

  const handleSaveSubtaskHours = async (subtaskId: string) => {
    const original = subtasks.find((s) => s.id === subtaskId);
    const newHours = editHoursDraft === "" ? null : Math.max(0, Number(editHoursDraft));
    const oldHours = original?.estimatedHours ?? null;
    if (newHours === oldHours) {
      handleCancelEdit();
      return;
    }
    // Optimistic update
    setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, estimatedHours: newHours } : s));
    handleCancelEdit();
    const res = await updateTaskSubtaskHoursAction(subtaskId, timId, newHours);
    if (!res.success) {
      // Rollback
      setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, estimatedHours: oldHours } : s));
      toast.error(res.error || "Gagal memperbarui jam subtask.");
    }
  };

  // Subtask Attachments State & Handlers (Bagian D & E)
  const [activeSubtaskPopoverId, setActiveSubtaskPopoverId] = useState<string | null>(null);
  const [subtaskUploadingId, setSubtaskUploadingId] = useState<string | null>(null);
  const [subtaskLinkUrl, setSubtaskLinkUrl] = useState("");
  const [subtaskLinkLabel, setSubtaskLinkLabel] = useState("");
  const [addingSubtaskLink, setAddingSubtaskLink] = useState(false);
  const [deletingSubtaskAttId, setDeletingSubtaskAttId] = useState<string | null>(null);

  const handleUploadSubtaskFile = async (subtaskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubtaskUploadingId(subtaskId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timId", timId);
      formData.append("contextType", "subtask");

      const res = await fetch("/api/tasks/upload-attachment", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.publicUrl) {
        const attPayload = {
          type: "file" as const,
          name: file.name,
          url: json.publicUrl,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        const dbRes = await addSubtaskAttachmentAction(subtaskId, timId, attPayload);
        if (dbRes.success && dbRes.data) {
          setSubtasks((prev) =>
            prev.map((s) =>
              s.id === subtaskId ? { ...s, attachmentData: dbRes.data.attachmentData } : s
            )
          );
          toast.success(`Bukti kerja "${file.name}" berhasil diunggah!`, "Bukti Tersimpan");
        } else {
          toast.error(dbRes.error || "Gagal menyimpan lampiran subtask.");
        }
      } else {
        toast.error(json.message || "Gagal mengunggah berkas.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengunggah.");
    } finally {
      setSubtaskUploadingId(null);
      e.target.value = "";
    }
  };

  const handleAddSubtaskLink = async (subtaskId: string) => {
    if (!subtaskLinkUrl.trim()) return;
    setAddingSubtaskLink(true);
    try {
      const attPayload = {
        type: "link" as const,
        name: subtaskLinkLabel.trim() || subtaskLinkUrl.trim(),
        url: subtaskLinkUrl.trim(),
        uploadedAt: new Date().toISOString(),
      };
      const dbRes = await addSubtaskAttachmentAction(subtaskId, timId, attPayload);
      if (dbRes.success && dbRes.data) {
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtaskId ? { ...s, attachmentData: dbRes.data.attachmentData } : s
          )
        );
        setSubtaskLinkUrl("");
        setSubtaskLinkLabel("");
        toast.success("Tautan bukti kerja berhasil ditambahkan!", "Tautan Tersimpan");
      } else {
        toast.error(dbRes.error || "Gagal menambah tautan subtask.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setAddingSubtaskLink(false);
    }
  };

  const handleDeleteSubtaskAttachment = async (subtaskId: string, attId: string) => {
    setDeletingSubtaskAttId(attId);
    try {
      const dbRes = await deleteSubtaskAttachmentAction(subtaskId, timId, attId);
      if (dbRes.success && dbRes.data) {
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subtaskId
              ? { ...s, attachmentData: dbRes.data.attachmentData, isDone: dbRes.data.isDone }
              : s
          )
        );
        toast.success("Bukti kerja berhasil dihapus.");
      } else {
        toast.error(dbRes.error || "Gagal menghapus bukti kerja.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setDeletingSubtaskAttId(null);
    }
  };

  // Warning Nudge: Auto-Assign Koordinator dari Subtasks (Bagian F)
  const subtasksWithPic = useMemo(
    () => subtasks.filter((st) => Boolean(st.assigneeUserId)),
    [subtasks]
  );
  const showCoordinatorWarning = subtasksWithPic.length > 0 && !detailOwnerAnggotaId;

  const handleAutoAssignCoordinatorFromSubtasks = () => {
    if (subtasksWithPic.length === 0) return;
    const counts: Record<string, number> = {};
    const firstSeenIndex: Record<string, number> = {};
    subtasksWithPic.forEach((st, idx) => {
      const uId = st.assigneeUserId!;
      counts[uId] = (counts[uId] || 0) + 1;
      if (firstSeenIndex[uId] === undefined) {
        firstSeenIndex[uId] = idx;
      }
    });

    let topUserId = subtasksWithPic[0].assigneeUserId!;
    let maxCount = 0;
    for (const uId of Object.keys(counts)) {
      const c = counts[uId];
      if (c > maxCount) {
        maxCount = c;
        topUserId = uId;
      } else if (c === maxCount) {
        if (firstSeenIndex[uId] < firstSeenIndex[topUserId]) {
          topUserId = uId;
        }
      }
    }

    const targetMember = anggotaTim.find(
      (a) => a.userId === topUserId || a.id === topUserId
    );
    if (targetMember) {
      setDetailOwnerAnggotaId(targetMember.id);
      toast.success(
        `Koordinator otomatis diatur ke ${targetMember.nama}.`,
        "Koordinator Ditetapkan"
      );
    }
  };


  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [creatingComment, setCreatingComment] = useState(false);

  const fetchTaskComments = async (taskId: string) => {
    setLoadingComments(true);
    const res = await getTaskCommentsAction(taskId);
    if (res.success && res.data) {
      setComments(res.data);
    }
    setLoadingComments(false);
  };

  const handleCreateComment = async () => {
    if (!selectedCardForDetail || !newCommentText.trim()) return;
    if (selectedCardForDetail.isNewBacklog) {
      toast.error("Simpan kartu terlebih dahulu untuk menulis komentar.", "Kartu Belum Disimpan");
      return;
    }
    setCreatingComment(true);
    const res = await createTaskCommentAction(selectedCardForDetail.id, timId, newCommentText.trim());
    if (res.success && res.data) {
      setComments((prev) => [...prev, res.data]);
      setNewCommentText("");
      toast.success("Komentar berhasil dikirim.");
    } else {
      toast.error(res.error || "Gagal mengirim komentar.");
    }
    setCreatingComment(false);
  };

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [activityTab, setActivityTab] = useState<"komentar" | "riwayat">("komentar");

  const fetchTaskActivityLogs = async (taskId: string) => {
    setLoadingActivityLogs(true);
    const res = await getTaskActivityLogsAction(taskId);
    if (res.success && res.data) {
      setActivityLogs(res.data);
    }
    setLoadingActivityLogs(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedCardForDetail) return;
    if (selectedCardForDetail.isNewBacklog) {
      toast.error("Simpan kartu terlebih dahulu untuk mengunggah lampiran file.", "Kartu Belum Disimpan");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx"];
    if (!allowed.includes(ext)) {
      toast.error(
        `Format file .${ext} tidak diizinkan. Tipe yang didukung: Gambar (jpg, jpeg, png, webp), PDF, Word (doc, docx), dan Excel (xls, xlsx).`,
        "Format Ditolak"
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        `Ukuran file melebihi batas 10MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        "File Terlalu Besar"
      );
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("taskId", selectedCardForDetail.id);
      formData.append("timId", timId);
      formData.append("file", file);

      const res = await fetch("/api/tasks/upload-attachment", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengunggah lampiran.");
      }

      const addRes = await addTaskAttachmentAction(selectedCardForDetail.id, timId, {
        fileName: data.fileName,
        fileUrl: data.publicUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        source: "upload",
      });

      if (addRes.success && addRes.data) {
        setAttachments((prev) => [...prev, addRes.data]);
        setCards((prev) =>
          prev.map((c) =>
            c.id === selectedCardForDetail.id
              ? { ...c, attachmentsCount: (c.attachmentsCount || 0) + 1 }
              : c
          )
        );
        toast.success(`Lampiran "${data.fileName}" berhasil diunggah.`, "Lampiran Ditambahkan");
      } else {
        throw new Error(addRes.error || "Gagal menyimpan data lampiran.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah file.", "Upload Gagal");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (att: any) => {
    if (!selectedCardForDetail || selectedCardForDetail.isNewBacklog) return;
    const isProposal = att.source === "proposal_dossier";
    const confirmMsg = isProposal
      ? `Hapus referensi dokumen "${att.fileName}" dari kartu ini? (Dokumen asli di Proposal tetap aman)`
      : `Hapus lampiran "${att.fileName}" secara permanen?`;

    if (!confirm(confirmMsg)) return;

    setDeletingAttachmentId(att.id);
    const res = await deleteTaskAttachmentAction(att.id, timId);
    if (res.success) {
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCardForDetail.id
            ? { ...c, attachmentsCount: Math.max(0, (c.attachmentsCount || 1) - 1) }
            : c
        )
      );
      toast.success(
        isProposal
          ? `Referensi proposal berhasil dihapus dari kartu.`
          : `Lampiran file berhasil dihapus.`,
        "Lampiran Dihapus"
      );
    } else {
      toast.error(res.error || "Gagal menghapus lampiran.", "Gagal Menghapus");
    }
    setDeletingAttachmentId(null);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForDetail) return;
    if (selectedCardForDetail.isNewBacklog) {
      toast.error("Simpan kartu terlebih dahulu untuk menambah tautan terkait.", "Kartu Belum Disimpan");
      return;
    }

    let url = newLinkUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("Format URL harus diawali dengan http:// atau https://", "URL Tidak Valid");
      return;
    }

    setAddingLink(true);
    const res = await addTaskLinkAction(selectedCardForDetail.id, timId, {
      url,
      label: newLinkLabel.trim() || undefined,
    });

    if (res.success && res.data) {
      setLinks((prev) => [...prev, res.data]);
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCardForDetail.id
            ? { ...c, linksCount: (c.linksCount || 0) + 1 }
            : c
        )
      );
      setNewLinkUrl("");
      setNewLinkLabel("");
      toast.success("Tautan terkait berhasil ditambahkan.", "Tautan Ditambahkan");
    } else {
      toast.error(res.error || "Gagal menambahkan tautan.", "Gagal Menambahkan");
    }
    setAddingLink(false);
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!selectedCardForDetail) return;
    if (!confirm("Hapus tautan ini?")) return;

    setDeletingLinkId(linkId);
    const res = await deleteTaskLinkAction(linkId, timId);
    if (res.success) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCardForDetail.id
            ? { ...c, linksCount: Math.max(0, (c.linksCount || 1) - 1) }
            : c
        )
      );
      toast.success("Tautan berhasil dihapus.", "Tautan Dihapus");
    } else {
      toast.error(res.error || "Gagal menghapus tautan.", "Gagal Menghapus");
    }
    setDeletingLinkId(null);
  };

  // New Card Form State
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tahap, setTahap] = useState("innovation_setup");
  const [label, setLabel] = useState("Backlog Charter");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // dnd-kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Currently viewed sprint object (if viewing a specific sprint)
  const currentSprintObj = useMemo(() => {
    if (selectedSprintTab === "all" || selectedSprintTab === "backlog") return null;
    const num = parseInt(selectedSprintTab);
    return sprints.find((s) => s.nomorSprint === num) || null;
  }, [sprints, selectedSprintTab]);

  // Filtered Cards for display
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchTahap = tahapFilter === "all" || c.tahap === tahapFilter;
      return matchTahap;
    });
  }, [cards, tahapFilter]);

  // Backlog Cards yang sudah terdaftar untuk Sprint Terpilih (bukan AI Reference yang belum diadopsi)
  const plannedCardsForSelectedSprint = useMemo(() => {
    return cards.filter(
      (c) =>
        c.sprintNumber === selectedSprintNum &&
        c.reviewStatus !== 'ai_reference'
    );
  }, [cards, selectedSprintNum]);

  // Backlog Cards umum (tanpa sprint)
  const backlogCards = useMemo(() => {
    return filteredCards.filter(
      (c) =>
        (c.sprintNumber === null || c.sprintNumber === undefined) &&
        c.reviewStatus !== 'ai_reference'
    );
  }, [filteredCards]);

  // AI Reference Cards — seluruh kartu referensi backlog tim yang belum diadopsi
  const aiReferenceCards = useMemo(() => {
    return cards.filter(
      (c) => c.reviewStatus === 'ai_reference'
    );
  }, [cards]);

  // Selected Planning Sprint Object
  const currentPlanningSprintObj = useMemo(() => {
    return sprints.find((s) => s.nomorSprint === selectedSprintNum) || sprints[0] || null;
  }, [sprints, selectedSprintNum]);

  // Sprint Cards for currently selected sprint
  const activeSprintCards = useMemo(() => {
    return filteredCards.filter((c) => c.sprintNumber === selectedSprintNum);
  }, [filteredCards, selectedSprintNum]);

  // Incomplete cards for completion dialog
  const incompleteCardsInCurrentSprint = useMemo(() => {
    if (!currentPlanningSprintObj) return [];
    return activeSprintCards.filter((c) => c.statusKolom !== "Done");
  }, [activeSprintCards, currentPlanningSprintObj]);

  // ───────────────────────────────────────────────────────────────────────────
  // Card Detail Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const isCvUnlocked = Boolean(phaseGateStatus?.gates?.customerValidation?.unlocked);
  const isMvUnlocked = Boolean(phaseGateStatus?.gates?.marketValidation?.unlocked);
  const currentModalSprintNum = detailSprintNumber !== null ? detailSprintNumber : selectedSprintNum;

  const availableRefCardsForDropdown = useMemo(() => {
    return cards.filter((c) => {
      if (c.reviewStatus !== "ai_reference") return false;
      const cardSuggestedSprint = c.suggestedSprintNumber || 1;
      const isCurrentlySelected = selectedRefCardId === c.id || selectedCardForDetail?.id === c.id;
      if (cardSuggestedSprint !== currentModalSprintNum && !isCurrentlySelected) return false;
      return true;
    });
  }, [cards, currentModalSprintNum, selectedRefCardId, selectedCardForDetail]);

  const handleSelectReferenceCardInModal = (refCardId: string) => {
    setSelectedRefCardId(refCardId);
    if (!refCardId) {
      setAttachments([]);
      setLinks([]);
      return;
    }

    const ref = cards.find((c) => c.id === refCardId);
    if (ref) {
      setDetailJudul(ref.judul || "");
      setDetailDeskripsi(ref.deskripsi || "");
      setDetailAcceptanceCriteria(ref.acceptanceCriteria || "");
      setDetailTahap(ref.tahap || "innovation_setup");
      setDetailLabel(ref.label || "Draf Roadmap");
      // Fetch attachments & links from selected reference card
      fetchTaskAttachments(ref.id);
      fetchTaskLinks(ref.id);
    }
  };

  const handleOpenCardDetail = (card: any, forceSprintNum?: number) => {
    setSelectedCardForDetail(card);
    setDetailJudul(card.judul || "");
    setDetailDeskripsi(card.deskripsi || "");
    setDetailTahap(card.tahap || "umum");
    setDetailSprintNumber(
      forceSprintNum !== undefined
        ? forceSprintNum
        : card.sprintNumber !== undefined
        ? card.sprintNumber
        : null
    );
    setDetailStatusKolom(card.statusKolom || "To Do");
    setDetailOwnerAnggotaId(card.ownerAnggotaId || null);
    setDetailEstimasiJam(card.estimasiJam !== undefined ? card.estimasiJam : null);
    setDetailStoryPoint(card.storyPoint !== undefined && card.storyPoint !== null ? card.storyPoint : 3);
    setDetailLabel(card.label || "");
    setDetailTanggalMulai(
      card.tanggalMulai ? new Date(card.tanggalMulai).toISOString().split("T")[0] : ""
    );
    setDetailTanggalSelesai(
      card.tanggalSelesai ? new Date(card.tanggalSelesai).toISOString().split("T")[0] : ""
    );
    setDetailAcceptanceCriteria(card.acceptanceCriteria || "");
    setDetailDependencyRisiko(card.dependencyRisiko || "");
    setDetailCustomDocumentData(card.customDocumentData || {});

    if (card.reviewStatus === "ai_reference") {
      setSelectedRefCardId(card.id);
    } else {
      setSelectedRefCardId("");
    }

    // Fetch attachments, links, subtasks, comments, and activity logs
    setAttachments([]);
    setLinks([]);
    setSubtasks([]);
    setComments([]);
    setActivityLogs([]);
    setNewLinkUrl("");
    setNewLinkLabel("");
    setNewSubtaskTitle("");
    setNewSubtaskHours("");
    setNewCommentText("");
    setActivityTab("komentar");
    if (card.id && !card.isNewBacklog) {
      fetchTaskAttachments(card.id);
      fetchTaskLinks(card.id);
      fetchTaskSubtasks(card.id);
      fetchTaskComments(card.id);
      fetchTaskActivityLogs(card.id);
    }
  };

  const handleOpenCreateBacklogModal = (sprintNum: number) => {
    const dummyCard = {
      id: `new-backlog-${Date.now()}`,
      isNewBacklog: true,
      reviewStatus: "adopted",
      sprintNumber: sprintNum,
      statusKolom: "To Do",
      tahap: "innovation_setup",
    };
    setSelectedCardForDetail(dummyCard);
    setSelectedRefCardId("");
    setDetailJudul("");
    setDetailDeskripsi("");
    setDetailTahap("innovation_setup");
    setDetailSprintNumber(sprintNum);
    setDetailStatusKolom("To Do");
    setDetailOwnerAnggotaId(null);
    setDetailEstimasiJam(null);
    setDetailStoryPoint(3);
    setDetailLabel("");
    setDetailTanggalMulai("");
    setDetailTanggalSelesai("");
    setDetailAcceptanceCriteria("");
    setDetailDependencyRisiko("");
    setDetailCustomDocumentData({});
    setAttachments([]);
    setLinks([]);
    setSubtasks([]);
    setComments([]);
    setActivityLogs([]);
    setNewLinkUrl("");
    setNewLinkLabel("");
    setNewSubtaskTitle("");
    setNewSubtaskHours("");
    setNewCommentText("");
    setActivityTab("komentar");
  };

  const handleSaveCardDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForDetail) return;
    setSavingDetailCard(true);
    setErrorMessage(null);

    const targetSprint =
      detailSprintNumber !== null ? detailSprintNumber : selectedSprintNum;

    const totalSubtaskMinutes = subtasks.reduce(
      (sum, st) => sum + (st.estimatedHours || 0),
      0
    );
    const effectiveStoryPoint =
      subtasks.length > 0
        ? Math.max(1, Math.round(totalSubtaskMinutes / 60))
        : Math.max(1, Math.round(detailStoryPoint ?? 3));
    const effectiveEstimasiJam = effectiveStoryPoint;

    // Case 1: Created from "+ Tambah Backlog"
    if (selectedCardForDetail.isNewBacklog) {
      if (selectedRefCardId) {
        // Adopt selected reference card
        const res = await adoptAiCardAction(
          timId,
          selectedRefCardId,
          targetSprint,
          {
            judul: detailJudul,
            deskripsi: detailDeskripsi,
            acceptanceCriteria: detailAcceptanceCriteria,
            estimasiJam: effectiveEstimasiJam,
            storyPoint: effectiveStoryPoint,
            ownerAnggotaId: detailOwnerAnggotaId,
          }
        );
        if (res.success && res.data) {
          setCards((prev) =>
            prev.map((c) => (c.id === selectedRefCardId ? { ...c, ...res.data } : c))
          );
          toast.success(
            `Backlog referensi "${detailJudul}" berhasil diadopsi ke Sprint ${targetSprint}!`,
            "Backlog Ditambahkan ✓"
          );
          setSelectedCardForDetail(null);
        } else {
          const errMsg = res.error || "Gagal mengadopsi backlog.";
          toast.error(errMsg, "Gagal");
          setErrorMessage(errMsg);
        }
      } else {
        // Create manual card
        const res = await createKanbanCardAction(timId, {
          judul: detailJudul,
          deskripsi: detailDeskripsi,
          tahap: detailTahap,
          sprintNumber: targetSprint,
          statusKolom: detailStatusKolom || "To Do",
          ownerAnggotaId: detailOwnerAnggotaId,
          estimasiJam: effectiveEstimasiJam,
          storyPoint: effectiveStoryPoint,
          label: detailLabel,
          tanggalMulai: detailTanggalMulai ? new Date(detailTanggalMulai) : null,
          tanggalSelesai: detailTanggalSelesai ? new Date(detailTanggalSelesai) : null,
          acceptanceCriteria: detailAcceptanceCriteria,
          dependencyRisiko: detailDependencyRisiko,
          reviewStatus: "adopted",
        });
        if (res.success && res.data) {
          setCards((prev) => [...prev, res.data]);
          toast.success(
            `Backlog "${detailJudul}" berhasil ditambahkan ke Sprint ${targetSprint}!`,
            "Backlog Dibuat ✓"
          );
          setSelectedCardForDetail(null);
        } else {
          const errMsg = res.error || "Gagal membuat backlog.";
          toast.error(errMsg, "Gagal");
          setErrorMessage(errMsg);
        }
      }
    }
    // Case 2: Regular update of existing card
    else {
      const payload = {
        judul: detailJudul,
        deskripsi: detailDeskripsi,
        tahap: detailTahap,
        sprintNumber: detailSprintNumber,
        statusKolom: detailStatusKolom,
        ownerAnggotaId: detailOwnerAnggotaId,
        estimasiJam: effectiveEstimasiJam,
        storyPoint: effectiveStoryPoint,
        label: detailLabel,
        tanggalMulai: detailTanggalMulai ? new Date(detailTanggalMulai) : null,
        tanggalSelesai: detailTanggalSelesai ? new Date(detailTanggalSelesai) : null,
        acceptanceCriteria: detailAcceptanceCriteria,
        dependencyRisiko: detailDependencyRisiko,
        customDocumentData: detailCustomDocumentData,
      };

      const res = await updateKanbanCardFullAction(timId, selectedCardForDetail.id, payload);
      if (res.success && res.data) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === selectedCardForDetail.id
              ? { ...c, ...res.data, customDocumentData: detailCustomDocumentData }
              : c
          )
        );
        toast.success("Perubahan detail kartu berhasil disimpan!", "Kartu Diperbarui");
        setSelectedCardForDetail(null);
      } else {
        const errMsg = res.error || "Gagal menyimpan perubahan kartu.";
        toast.error(errMsg, "Gagal Menyimpan Kartu");
        setErrorMessage(errMsg);
      }
    }
    setSavingDetailCard(false);
  };

  const handleDeleteCard = async () => {
    if (!selectedCardForDetail) return;
    if (selectedCardForDetail.isNewBacklog) {
      setSelectedCardForDetail(null);
      return;
    }
    const isBakuCv =
      detectCvBakuCardType(selectedCardForDetail.judul, selectedCardForDetail.tahap) !== null ||
      selectedCardForDetail.label === "Template Baku CV" ||
      detailLabel === "Template Baku CV";
    const isMandatoryMv = isMvMandatoryCard(
      detailJudul || selectedCardForDetail.judul,
      detailTahap || selectedCardForDetail.tahap
    );

    if (isBakuCv || isMandatoryMv) {
      toast.error(`Kartu ${isBakuCv ? "Template Baku CV" : "WAJIB Market Validation"} tidak dapat dihapus karena merupakan struktur baku resmi Juklak.`);
      return;
    }

    if (!confirm(`Hapus kartu "${selectedCardForDetail.judul}" secara permanen?`)) return;
    setDeletingCard(true);
    setErrorMessage(null);

    const res = await deleteKanbanCardAction(timId, selectedCardForDetail.id);
    if (res.success) {
      setCards((prev) => prev.filter((c) => c.id !== selectedCardForDetail.id));
      toast.success(
        `Kartu "${selectedCardForDetail.judul}" berhasil dihapus dari Board Sprint.`,
        "Kartu Dihapus"
      );
      setSelectedCardForDetail(null);
    } else {
      const errMsg = res.error || "Gagal menghapus kartu.";
      toast.error(errMsg, "Gagal Menghapus Kartu");
      setErrorMessage(errMsg);
    }
    setDeletingCard(false);
  };

  const handleAdoptAiCard = async () => {
    if (!selectedCardForDetail) return;
    setAdoptingCardId(selectedCardForDetail.id);
    setErrorMessage(null);

    const targetSprint =
      detailSprintNumber !== null ? detailSprintNumber : selectedSprintNum;

    const res = await adoptAiCardAction(
      timId,
      selectedCardForDetail.id,
      targetSprint,
      {
        judul: detailJudul,
        deskripsi: detailDeskripsi,
        acceptanceCriteria: detailAcceptanceCriteria,
        estimasiJam: detailEstimasiJam !== null && detailEstimasiJam !== undefined ? Math.max(0, Math.round(Number(detailEstimasiJam))) : null,
        storyPoint: Math.max(1, Math.round(detailStoryPoint ?? 3)),
        ownerAnggotaId: detailOwnerAnggotaId,
      }
    );
    if (res.success && res.data) {
      setCards((prev) =>
        prev.map((c) => (c.id === selectedCardForDetail.id ? { ...c, ...res.data } : c))
      );
      toast.success(
        `Kartu "${detailJudul}" berhasil diadopsi ke Sprint ${targetSprint}!`,
        "Adopsi Berhasil ✓"
      );
      setSelectedCardForDetail(null);
    } else {
      const errMsg = res.error || "Gagal mengadopsi kartu.";
      toast.error(errMsg, "Gagal Adopsi");
      setErrorMessage(errMsg);
    }
    setAdoptingCardId(null);
  };

  // Section Navigation Handlers
  const handleSprintTabClick = (sprintNum: number) => {
    setSelectedSprintNum(sprintNum);
    setSelectedSprintTab(String(sprintNum));
    const targetSprint = sprints.find((s) => s.nomorSprint === sprintNum);
    if (targetSprint?.status === "aktif" || targetSprint?.status === "selesai") {
      setActiveSubSection(2);
    } else {
      setActiveSubSection(1);
    }
  };

  const handleSelectSprintForPlanning = (sprintNum: number) => {
    setSelectedSprintNum(sprintNum);
    setSelectedSprintTab(String(sprintNum));
    setIsDaftarSprintOpen(true);
    setActiveSubSection(1);
  };

  const handleSelectSprintForBoard = (sprintNum: number) => {
    setSelectedSprintNum(sprintNum);
    setSelectedSprintTab(String(sprintNum));
    setIsDaftarSprintOpen(true);
    setActiveSubSection(2);
  };

  const handleStartSprintFromPlanning = async (
    sprintId: string,
    assignments: Array<{
      cardId: string;
      storyPoint?: number | null;
      estimasiJam?: number | null;
      ownerAnggotaId?: string | null;
    }>
  ) => {
    setStartingSprint(true);
    setErrorMessage(null);

    const res = await startSprintAction(timId, sprintId, assignments);
    if (res.success) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === sprintId
            ? { ...s, status: "aktif", tanggalMulaiAktual: new Date() }
            : s
        )
      );

      setCards((prev) =>
        prev.map((c) => {
          const asg = assignments.find((a) => a.cardId === c.id);
          if (asg) {
            return {
              ...c,
              sprintNumber: selectedSprintNum,
              storyPoint: asg.storyPoint !== undefined ? asg.storyPoint : c.storyPoint,
              estimasiJam: asg.estimasiJam !== undefined ? asg.estimasiJam : c.estimasiJam,
              ownerAnggotaId: asg.ownerAnggotaId !== undefined ? asg.ownerAnggotaId : c.ownerAnggotaId,
            };
          }
          return c;
        })
      );

      setSelectedSprintTab(String(selectedSprintNum));
      setIsDaftarSprintOpen(true);
      setActiveSubSection(2);
      toast.success(
        `Sprint ${selectedSprintNum} resmi dimulai! Melanjutkan ke Board Sprint.`,
        "Sprint Aktif 🚀"
      );
    } else {
      const err = res.error || "Gagal memulai sprint.";
      toast.error(err, "Gagal Memulai Sprint");
      setErrorMessage(err);
    }
    setStartingSprint(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Card Actions
  // ───────────────────────────────────────────────────────────────────────────

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCard(true);
    setErrorMessage(null);

    const res = await createKanbanCardAction(timId, {
      judul,
      deskripsi,
      statusKolom: targetColumn,
      tahap,
      label,
      sprintNumber: targetSprintForNewCard,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
      urutan: cards.length + 1,
    });

    if (res.success && res.data) {
      setCards((prev) => [...prev, res.data]);
      toast.success("Kartu task baru berhasil dibuat!", "Task Dibuat");
      setIsNewCardOpen(false);
      setJudul("");
      setDeskripsi("");
    } else if (res.error) {
      toast.error(res.error, "Gagal Membuat Task");
      setErrorMessage(res.error);
    }
    setSavingCard(false);
  };

  const handleMoveCardDropdown = async (cardId: string, newCol: string) => {
    const previousCards = [...cards];
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, statusKolom: newCol } : c))
    );

    const res = await updateKanbanCardStatusAction(timId, cardId, newCol, 0);
    if (!res.success) {
      setCards(previousCards);
      const errMsg = res.error || "Gagal memindahkan kartu.";
      toast.error(errMsg, "Gagal Pindah Kolom");
      setErrorMessage(errMsg);
    }
  };

  const handleAssignSprint = async (cardId: string, sprintNum: number | null) => {
    const previousCards = [...cards];
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, sprintNumber: sprintNum } : c))
    );

    const res = await updateKanbanCardSprintAction(timId, cardId, sprintNum);
    if (!res.success) {
      setCards(previousCards);
      const errMsg = res.error || "Gagal memindahkan kartu ke sprint.";
      toast.error(errMsg, "Gagal Ubah Sprint");
      setErrorMessage(errMsg);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Sprint Lifecycle Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleStartSprint = async (sprintId: string) => {
    setActionLoading(true);
    setErrorMessage(null);

    const res = await startSprintAction(timId, sprintId);
    if (res.success) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === sprintId
            ? { ...s, status: "aktif", tanggalMulaiAktual: new Date() }
            : s.status === "aktif"
            ? { ...s, status: "belum_dimulai" }
            : s
        )
      );
      toast.success(`Sprint berhasil dimulai!`, "Sprint Aktif");
    } else {
      const errMsg = res.error || "Gagal memulai sprint.";
      toast.error(errMsg, "Gagal Memulai Sprint");
      setErrorMessage(errMsg);
    }
    setActionLoading(false);
  };

  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueJudul.trim()) return;
    setSavingIssue(true);
    try {
      const activeSprintObj = sprints.find((s) => s.status === "aktif");
      const targetSprintNum = activeSprintObj ? activeSprintObj.nomorSprint : selectedSprintNum;

      const effectiveMenit = typeof issueMenit === "number" && issueMenit > 0 ? issueMenit : 180;
      const effectiveStoryPoint = Math.max(1, Math.round(effectiveMenit / 60));
      const effectiveEstimasiJam = effectiveStoryPoint;

      const res = await createKanbanCardAction(timId, {
        judul: issueJudul.trim(),
        deskripsi: issueDampak ? `[Urgensi/Dampak: ${issueDampak}]\n\n${issueDeskripsi.trim()}` : issueDeskripsi.trim(),
        statusKolom: "To Do",
        tahap: targetSprintNum <= 3 ? "customer_validation" : "market_validation",
        sprintNumber: targetSprintNum,
        ownerAnggotaId: issueOwnerAnggotaId || null,
        storyPoint: effectiveStoryPoint,
        estimasiJam: effectiveEstimasiJam,
        tipeKartu: "issue",
        label: "Issue",
      });

      if (res.success && res.data) {
        setCards((prev) => [...prev, res.data]);
        toast.success(
          `Kartu Issue "${issueJudul}" berhasil dibuat di Sprint ${targetSprintNum}!`,
          "Issue Ditambahkan ✓"
        );
        setIsNewIssueOpen(false);
        setIssueJudul("");
        setIssueDeskripsi("");
        setIssueOwnerAnggotaId(null);
        setIssueMenit(180);
      } else {
        toast.error(res.error || "Gagal membuat kartu Issue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setSavingIssue(false);
    }
  };

  const handleGenerateAiReview = async (sprintId?: string) => {
    const targetId = sprintId || currentSprintObj?.id;
    if (!targetId) return;

    setIsGeneratingAiReview(true);
    try {
      const res = await generateSprintReviewDraftAction(timId, targetId);
      if (res.success && res.data) {
        setReviewDemo(res.data.demo || "");
        setReviewFeedback(res.data.feedback || "");
        setReviewValue(res.data.value || "");
        setReviewQuestions(res.data.questions || "");
        setReviewContinue(res.data.continueItems || "");
        setReviewStop(res.data.stopItems || "");
        setReviewStart(res.data.startItems || "");
        setReviewOwnerTarget(res.data.ownerTargetSprint || "");
        toast.success("Draf AI Sprint Review & Retrospective berhasil disusun!", "Draf AI Siap ✓");
      } else {
        console.warn("[AI Sprint Review] Gagal generate:", res.error);
      }
    } catch (err: any) {
      console.error("[AI Sprint Review] Error:", err);
    } finally {
      setIsGeneratingAiReview(false);
    }
  };

  const handleOpenCompleteDialog = () => {
    if (!currentSprintObj) return;

    // Initialize destinations for incomplete cards
    const initialDestinations: Record<string, "backlog" | "next_sprint"> = {};
    for (const card of incompleteCardsInCurrentSprint) {
      initialDestinations[card.id] = "backlog";
    }
    setIncompleteCardsDestinations(initialDestinations);
    setIsCompleteModalOpen(true);

    // Auto-generate AI Sprint Review draft if form is empty
    if (!reviewDemo && !reviewFeedback && !reviewValue) {
      handleGenerateAiReview(currentSprintObj.id);
    }
  };

  const handleConfirmCompleteSprint = async () => {
    if (!currentSprintObj) return;
    setActionLoading(true);
    setErrorMessage(null);

    const nextSprintNum = currentSprintObj.nomorSprint + 1;
    const cardMovements = incompleteCardsInCurrentSprint.map((card) => {
      const dest = incompleteCardsDestinations[card.id] || "backlog";
      return {
        cardId: card.id,
        destination: dest,
        nextSprintNumber: dest === "next_sprint" ? nextSprintNum : null,
      };
    });

    const reviewPayload = {
      demo: reviewDemo || null,
      feedback: reviewFeedback || null,
      value: reviewValue || null,
      questions: reviewQuestions || null,
      continueItems: reviewContinue || null,
      stopItems: reviewStop || null,
      startItems: reviewStart || null,
      ownerTargetSprint: reviewOwnerTarget || null,
    };

    const res = await completeSprintAction(timId, currentSprintObj.id, cardMovements, reviewPayload);
    if (res.success) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === currentSprintObj.id
            ? { ...s, status: "selesai", tanggalSelesaiAktual: new Date() }
            : s
        )
      );

      // Update local card sprint numbers & reviewStatus
      setCards((prev) =>
        prev.map((card) => {
          const mov = cardMovements.find((m) => m.cardId === card.id);
          if (mov) {
            if (mov.destination === "backlog") {
              return {
                ...card,
                sprintNumber: null,
                reviewStatus: "ai_reference",
                statusKolom: "To Do",
              };
            }
            return {
              ...card,
              sprintNumber: mov.destination === "next_sprint" ? nextSprintNum : null,
            };
          }
          return card;
        })
      );

      toast.success(`Sprint ${currentSprintObj.nomorSprint} berhasil diselesaikan!`, "Sprint Selesai");
      setIsCompleteModalOpen(false);
      router.refresh();
    } else {
      const errMsg = res.error || "Gagal menyelesaikan sprint.";
      toast.error(errMsg, "Gagal Menyelesaikan Sprint");
      setErrorMessage(errMsg);
    }
    setActionLoading(false);
  };

  const handleApplySprintCountChange = async () => {
    if (!sprintCountReason.trim()) {
      toast.error("Alasan perubahan jumlah sprint wajib diisi.", "Validasi Diperlukan");
      return;
    }
    setActionLoading(true);
    const res = await updateSprintCountAction(timId, targetSprintCount, sprintCountReason);
    if (res.success) {
      setIsSprintCountModalOpen(false);
      setSprintCountReason("");
      toast.success(`Jumlah sprint berhasil diubah menjadi ${targetSprintCount} sprint!`, "Konfigurasi Sprint");
      if (targetSprintCount > sprints.length) {
        const added = [];
        for (let i = sprints.length + 1; i <= targetSprintCount; i++) {
          added.push({
            id: `temp-${i}`,
            timInovatorId: timId,
            nomorSprint: i,
            status: "belum_dimulai",
            tujuan: `Sprint ${i}`,
          });
        }
        setSprints([...sprints, ...added]);
      } else {
        setSprints(sprints.slice(0, targetSprintCount));
      }
    } else {
      toast.error(res.error || "Gagal mengubah jumlah sprint.", "Gagal Mengubah Sprint");
    }
    setActionLoading(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // dnd-kit Drag Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const foundCard = cards.find((c) => c.id === active.id);
    if (foundCard) {
      setActiveCard(foundCard);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const activeCardItem = cards.find((c) => c.id === activeId);
    if (!activeCardItem) return;

    const isDroppingOnBacklog = overId === "column-backlog";
    const overColumn = columns.find((col) => col.namaKolom === overId);

    if (isDroppingOnBacklog && activeCardItem.sprintNumber !== null) {
      setCards((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, sprintNumber: null } : c))
      );
    } else if (overColumn && activeCardItem.statusKolom !== overColumn.namaKolom) {
      const targetSprintNum = currentSprintObj ? currentSprintObj.nomorSprint : activeCardItem.sprintNumber;
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, statusKolom: overColumn.namaKolom, sprintNumber: targetSprintNum }
            : c
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const currentCard = cards.find((c) => c.id === activeId);
    if (!currentCard) return;

    const isBacklog = overId === "column-backlog";
    const overColumn = columns.find((col) => col.namaKolom === overId);

    const newColName = overColumn ? overColumn.namaKolom : currentCard.statusKolom;
    const newSprintNumber = isBacklog
      ? null
      : currentSprintObj
      ? currentSprintObj.nomorSprint
      : currentCard.sprintNumber;

    const previousCards = [...cards];

    const res = await updateKanbanCardStatusAction(
      timId,
      activeId,
      newColName,
      0,
      newSprintNumber
    );

    if (!res.success) {
      setCards(previousCards);
      setErrorMessage(res.error || "Gagal memindahkan kartu.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-800 shadow-xs">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 font-bold ml-2 hover:underline"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* DAFTAR SPRINT, PLANNING & KANBAN BOARD (UNIFIED) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MASTER CONTAINER: DAFTAR SPRINT & ROADMAP */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all">
        {/* Section 1 Header: Daftar Sprint & Roadmap */}
        <div
          className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
            isDaftarSprintOpen ? "bg-slate-50 border-b border-gray-200" : "hover:bg-gray-50/80"
          }`}
          onClick={() => setIsDaftarSprintOpen(!isDaftarSprintOpen)}
        >
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>Daftar Sprint &amp; Roadmap</span>
                <Badge variant="secondary" className="text-[10px]">
                  Sprint {selectedSprintNum} Terpilih
                </Badge>
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">
                Pilih sprint untuk melakukan perencanaan kapasitas atau melihat eksekusi board.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-200/60 cursor-pointer"
            >
              {isDaftarSprintOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Master Content (Semua Bar & Panel Termasuk Planning & Board Berada di Dalamnya) */}
        {isDaftarSprintOpen && (
          <div className="p-5 space-y-6">
            {/* Baris Tab Sprint Selector + Tombol Kelola Jumlah Sprint */}
            <div className="border-b border-gray-200 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
                {sprints.map((s) => {
                  const isTabSelected = selectedSprintNum === s.nomorSprint;
                  const isAktif = s.status === "aktif";
                  const isSelesai = s.status === "selesai";

                  return (
                    <button
                      key={s.id || s.nomorSprint}
                      type="button"
                      onClick={() => handleSprintTabClick(s.nomorSprint)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isTabSelected
                          ? "bg-[#0F5132] text-white shadow-xs"
                          : "bg-gray-100/90 text-gray-700 hover:bg-gray-200 border border-gray-200/80"
                      }`}
                    >
                      <span>Sprint {s.nomorSprint}</span>
                      {isAktif && (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      {isSelesai && (
                        <Check className={`h-3.5 w-3.5 ${isTabSelected ? "text-white" : "text-emerald-600"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {canManageSprintCount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTargetSprintCount(sprints.length);
                    setSprintCountReason("");
                    setIsSprintCountModalOpen(true);
                  }}
                  className="text-xs font-semibold gap-1.5 text-gray-700 hover:text-[#0F5132] rounded-xl shrink-0 cursor-pointer"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Kelola Jumlah Sprint ({sprints.length})</span>
                </Button>
              )}
            </div>

            {/* Selected Sprint Summary Card */}
            {(() => {
              const selectedSection1Sprint =
                sprints.find((s) => s.nomorSprint === selectedSprintNum) || sprints[0];
              if (!selectedSection1Sprint) return null;

              const isAktif = selectedSection1Sprint.status === "aktif";
              const isSelesai = selectedSection1Sprint.status === "selesai";
              const isBelum = selectedSection1Sprint.status === "belum_dimulai";
              const sprintCards = cards.filter(
                (c) => c.sprintNumber === selectedSection1Sprint.nomorSprint
              );
              const totalSp = sprintCards.reduce((acc, c) => acc + (c.storyPoint || 3), 0);

              return (
                <div
                  className={`rounded-2xl border p-5 transition-all ${
                    isAktif
                      ? "border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-400/50"
                      : isSelesai
                      ? "border-blue-200 bg-blue-50/20"
                      : "border-gray-200 bg-gray-50/60"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-extrabold text-gray-900">
                          Sprint {selectedSection1Sprint.nomorSprint}
                          {selectedSection1Sprint.sprintGoal
                            ? `: ${selectedSection1Sprint.sprintGoal}`
                            : selectedSection1Sprint.tujuan
                            ? `: ${selectedSection1Sprint.tujuan.replace(
                                new RegExp(`^Sprint\\s*${selectedSection1Sprint.nomorSprint}\\s*:\\s*`, "i"),
                                ""
                              )}`
                            : ""}
                        </h3>
                        <Badge
                          variant={isAktif ? "success" : isSelesai ? "secondary" : "outline"}
                          className="text-[10px] font-bold"
                        >
                          {isAktif
                            ? "🟢 Aktif — Sedang Berjalan"
                            : isSelesai
                            ? "🔵 Selesai"
                            : "⚪ Belum Direncanakan"}
                        </Badge>
                      </div>

                      {selectedSection1Sprint.sprintGoal && (
                        <p className="text-xs text-purple-950 bg-purple-50/80 border border-purple-200/80 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span><strong>Sprint Goal:</strong> {selectedSection1Sprint.sprintGoal}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-gray-500" />
                          <strong>{sprintCards.length}</strong> kartu kerja
                        </span>
                        {totalSp > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                            <strong>{totalSp}</strong> Story Point
                          </span>
                        )}
                        {selectedSection1Sprint.tanggalMulaiRencana && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {formatDateIndo(selectedSection1Sprint.tanggalMulaiRencana)} –{" "}
                            {formatDateIndo(selectedSection1Sprint.tanggalSelesaiRencana)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {isBelum && (
                        <Button
                          size="sm"
                          onClick={() => handleSelectSprintForPlanning(selectedSection1Sprint.nomorSprint)}
                          className="w-full md:w-auto text-xs font-bold bg-[#0F5132] hover:bg-[#1B7A4D] text-white px-5 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer"
                        >
                          <span>Buka Planning</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}

                      {isAktif && (
                        <Button
                          size="sm"
                          onClick={() => handleSelectSprintForBoard(selectedSection1Sprint.nomorSprint)}
                          className="w-full md:w-auto text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer"
                        >
                          <PlayCircle className="h-4 w-4" />
                          <span>Lanjut ke Board</span>
                        </Button>
                      )}

                      {isSelesai && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectSprintForBoard(selectedSection1Sprint.nomorSprint)}
                          className="w-full md:w-auto text-xs font-bold text-gray-700 hover:bg-gray-100 px-5 py-2.5 rounded-xl gap-2 cursor-pointer"
                        >
                          <FolderKanban className="h-4 w-4" />
                          <span>Lihat Board</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* BAR 1: SPRINT PLANNING — SPRINT [N] */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all">
              {/* Bar 1 Header */}
              <div
                className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
                  activeSubSection === 1 ? "bg-amber-50/50 border-b border-gray-200" : "hover:bg-gray-50/80"
                }`}
                onClick={() => setActiveSubSection(activeSubSection === 1 ? 0 : 1)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-black shadow-xs">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span>Sprint Planning — Sprint {selectedSprintNum}</span>
                      {currentPlanningSprintObj && (
                        <Badge
                          variant={
                            currentPlanningSprintObj.status === "aktif"
                              ? "success"
                              : currentPlanningSprintObj.status === "selesai"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] font-bold"
                        >
                          {currentPlanningSprintObj.status === "aktif"
                            ? "🟢 Aktif"
                            : currentPlanningSprintObj.status === "selesai"
                            ? "🔵 Selesai"
                            : "Sedang Direncanakan"}
                        </Badge>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Tinjau Backlog Referensi, pantau kapasitas jam tim, dan alokasikan backlog sebelum memulai sprint.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-200/60 cursor-pointer"
                  >
                    {activeSubSection === 1 ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Bar 1 Content */}
              {activeSubSection === 1 && currentPlanningSprintObj && (
                <div className="p-5">
                  <SprintPlanningSection
                    timId={timId}
                    sprint={currentPlanningSprintObj}
                    sprints={sprints}
                    anggotaTim={anggotaTim}
                    aiReferenceCards={aiReferenceCards}
                    backlogCards={plannedCardsForSelectedSprint}
                    capacities={capacities}
                    canEdit={canEdit}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    isCoachOrAdmin={isCoachOrAdmin}
                    phaseGateStatus={phaseGateStatus}
                    onOpenCardDetail={handleOpenCardDetail}
                    onOpenCreateBacklogModal={handleOpenCreateBacklogModal}
                    onOpenCreateIssueModal={() => setIsNewIssueOpen(true)}
                    onRefreshCapacities={() => fetchCapacities(selectedSprintNum)}
                    onStartSprint={handleStartSprintFromPlanning}
                    startingSprint={startingSprint}
                  />
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* BAR 2: KANBAN BOARD — SPRINT [N] (EKSEKUSI HARIAN) */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all">
              {/* Bar 2 Header */}
              <div
                className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
                  activeSubSection === 2 ? "bg-emerald-50/40 border-b border-gray-200" : "hover:bg-gray-50/80"
                }`}
                onClick={() => setActiveSubSection(activeSubSection === 2 ? 0 : 2)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#0F5132] text-white text-xs font-black shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span>Board Sprint — Sprint {selectedSprintNum} (Eksekusi Harian)</span>
                      {currentPlanningSprintObj && (
                        <Badge
                          variant={
                            currentPlanningSprintObj.status === "aktif"
                              ? "success"
                              : currentPlanningSprintObj.status === "selesai"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] font-bold"
                        >
                          {currentPlanningSprintObj.status === "aktif"
                            ? "🟢 Aktif"
                            : currentPlanningSprintObj.status === "selesai"
                            ? "🔵 Selesai"
                            : "Belum Dimulai"}
                        </Badge>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Papan kerja harian untuk mengeksekusi kartu kerja sprint (To Do, In Progress, Done).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-200/60 cursor-pointer"
                  >
                    {activeSubSection === 2 ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Bar 2 Content */}
              {activeSubSection === 2 && (
                <div className="p-5 space-y-6">
                  {/* If Sprint is not started yet, show locked info */}
                  {currentPlanningSprintObj && currentPlanningSprintObj.status === "belum_dimulai" ? (
                    <div className="text-center py-12 px-4 border border-dashed border-amber-300 rounded-2xl bg-amber-50/40 space-y-3">
                      <Lock className="h-8 w-8 text-amber-600 mx-auto" />
                      <h3 className="text-sm font-bold text-amber-950">
                        Sprint {selectedSprintNum} Belum Dimulai
                      </h3>
                      <p className="text-xs text-amber-800 max-w-md mx-auto">
                        Selesaikan estimasi Story Point dan penugasan anggota di <strong>Sprint Planning</strong>, lalu klik <strong>&quot;Mulai Sprint {selectedSprintNum}&quot;</strong> untuk membuka papan kerja eksekusi.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setActiveSubSection(1)}
                        className="text-xs font-bold bg-[#0F5132] hover:bg-[#1B7A4D] text-white rounded-xl shadow-sm gap-1.5 cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Buka Sprint Planning</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Sprint Details Header & Complete Action */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                          <h3 className="text-base font-extrabold text-gray-900">
                            Sprint {currentPlanningSprintObj?.nomorSprint}: {currentPlanningSprintObj?.tujuan || `Sprint ${selectedSprintNum}`}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {activeSprintCards.length} kartu aktif di sprint ini
                          </p>
                        </div>

                        {canEdit && currentPlanningSprintObj?.status === "aktif" && (
                          <Button
                            size="sm"
                            disabled={actionLoading}
                            onClick={handleOpenCompleteDialog}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 px-4 h-9 shadow-sm cursor-pointer"
                          >
                            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span>Selesaikan Sprint</span>
                          </Button>
                        )}
                      </div>

                      {/* Filter & View Switcher Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
                            <button
                              onClick={() => setViewMode("board")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                viewMode === "board"
                                  ? "bg-[#0F5132] text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              <KanbanIcon className="h-3.5 w-3.5" />
                              <span>Board View</span>
                            </button>
                            <button
                              onClick={() => setViewMode("timeline")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                viewMode === "timeline"
                                  ? "bg-[#0F5132] text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Timeline Roadmap</span>
                            </button>
                          </div>

                          <div className="h-5 w-px bg-gray-200" />

                          {/* Filter Tahap */}
                          <select
                            className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-semibold focus:ring-1 focus:ring-[#0F5132]"
                            value={tahapFilter}
                            onChange={(e) => setTahapFilter(e.target.value)}
                          >
                            <option value="all">Semua Tahap Inkubasi</option>
                            <option value="innovation_setup">Innovation Setup</option>
                            <option value="customer_validation">Customer Validation</option>
                            <option value="market_validation">Market Validation</option>
                            <option value="umum">Umum</option>
                          </select>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2">
                            {isCoachOrAdmin && (
                              <Button
                                onClick={() => {
                                  setIsNewIssueOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5 font-bold border-orange-300 bg-orange-50/80 hover:bg-orange-100 text-orange-950 rounded-xl shadow-2xs cursor-pointer"
                              >
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <span>+ Tambah Issue</span>
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setTargetColumn("To Do");
                                setTargetSprintForNewCard(selectedSprintNum);
                                setIsNewCardOpen(true);
                              }}
                              variant="default"
                              size="sm"
                              className="text-xs gap-1.5 font-bold bg-[#0F5132] hover:bg-[#1B7A4D] text-white rounded-xl shadow-xs cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Tambah Kartu Task</span>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* View Mode 1: Board Columns (3 Columns: To Do, In Progress, Done) */}
                      {viewMode === "board" && (
                        isMounted ? (
                          <DndContext
                            id="kanban-board-dnd-context"
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                              {columns.map((col, colIdx) => {
                                const colCards = activeSprintCards.filter(
                                  (c) => c.statusKolom === col.namaKolom
                                );

                                return (
                                  <KanbanColumnDroppable
                                    key={col.id || col.namaKolom}
                                    columnId={col.namaKolom}
                                    columnTitle={col.namaKolom}
                                    columnIndex={colIdx}
                                    isBacklogArea={false}
                                    cards={colCards}
                                    columns={columns}
                                    sprints={sprints}
                                    onAddCard={(colName) => {
                                      setTargetColumn(colName);
                                      setTargetSprintForNewCard(selectedSprintNum);
                                      setIsNewCardOpen(true);
                                    }}
                                    onMoveCard={handleMoveCardDropdown}
                                    onAssignSprint={handleAssignSprint}
                                    onSelectCard={handleOpenCardDetail}
                                  />
                                );
                              })}
                            </div>

                            {/* Floating Drag Overlay */}
                            <DragOverlay
                              dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({
                                  styles: {
                                    active: {
                                      opacity: "0.4",
                                    },
                                  },
                                }),
                              }}
                            >
                              {activeCard ? <DraggingCardOverlay card={activeCard} /> : null}
                            </DragOverlay>
                          </DndContext>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                            {columns.map((col) => (
                              <div
                                key={col.id || col.namaKolom}
                                className="rounded-2xl p-3.5 border bg-gray-50/80 border-gray-200 min-h-[360px] animate-pulse"
                              />
                            ))}
                          </div>
                        )
                      )}

                      {/* View Mode 2: Timeline Roadmap */}
                      {viewMode === "timeline" && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
                          <div className="border-b border-gray-100 pb-4">
                            <h3 className="text-sm font-bold text-gray-900">
                              Timeline &amp; Roadmap Visualisasi Keterlambatan — Sprint {selectedSprintNum}
                            </h3>
                            <p className="text-xs text-gray-500">
                              Visualisasi jadwal rencana dan segmen merah otomatis untuk kartu kerja yang melewati batas waktu.
                            </p>
                          </div>

                          {/* Render Timeline Cards */}
                          {activeSprintCards.length === 0 ? (
                            <div className="text-center py-10 text-xs text-gray-500">
                              Belum ada kartu kerja dengan jadwal di sprint ini.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {activeSprintCards.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => handleOpenCardDetail(c)}
                                  className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-2xs cursor-pointer flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-gray-900 block truncate">
                                      {c.judul}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                      {c.statusKolom} &bull; {c.storyPoint ? `${c.storyPoint} SP` : "3 SP"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    {c.statusKolom}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Modal / Dialog Detail Kartu Lengkap (View & Edit) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedCardForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardForDetail(null);
        }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 bg-[#F0F7F1] border-2 border-[#C9E4D0] shadow-2xl">
          {(() => {
            const isCardPersisted = Boolean(selectedCardForDetail?.id && !selectedCardForDetail?.isNewBacklog);
            const currentPhaseToken = getPhaseTokenBySlug(detailTahap);
            const modalColumnName = detailStatusKolom || (selectedCardForDetail?.sprintNumber ? "To Do" : "Backlog");
            const modalPillStyle = getColumnPillStyle(modalColumnName);

            return (
              <>
                <DialogHeader className="pb-3 border-b border-[#C9E4D0]">
                  <div className="flex items-center justify-between gap-3 pr-4">
                    <DialogTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
                      <KanbanIcon className="h-4 w-4 text-[#3E9463]" />
                      <span>Detail &amp; Sunting Kartu Task</span>
                    </DialogTitle>
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold text-white shadow-2xs border border-white/20"
                      style={{ backgroundColor: modalPillStyle.hex }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      <span>{modalColumnName}</span>
                    </div>
                  </div>
                </DialogHeader>

                <form onSubmit={handleSaveCardDetail} className="space-y-5 py-3 text-xs">
                  {/* Dropdown Referensi: Muncul saat tambah backlog baru atau meninjau kartu referensi */}
                  {(selectedCardForDetail?.isNewBacklog || selectedCardForDetail?.reviewStatus === "ai_reference") && (
                    <div className="space-y-1.5 bg-[#FBF3DD] p-3.5 rounded-xl border-2 border-[#D4AF37] shadow-2xs">
                      <label className="text-xs font-bold text-[#8A6300] flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#B8860B]" />
                        <span>Pilih dari Backlog Referensi (opsional)</span>
                      </label>
                      <select
                        value={selectedRefCardId}
                        disabled={!canEdit}
                        onChange={(e) => handleSelectReferenceCardInModal(e.target.value)}
                        className="w-full text-xs bg-white border border-[#D4AF37] rounded-lg p-2 text-gray-800 font-semibold focus:ring-2 focus:ring-[#D4AF37] focus:border-[#B8860B] focus:outline-hidden"
                      >
                        <option value="">-- Kosongkan untuk buat backlog sendiri --</option>
                        {availableRefCardsForDropdown.map((rc) => (
                          <option key={rc.id} value={rc.id}>
                            {rc.judul} ({rc.label || "Referensi"})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[#8A6300] leading-tight font-medium">
                        Memilih kartu referensi akan otomatis mengisi Judul, Deskripsi, Acceptance Criteria, dan Tahap Inkubasi.
                      </p>
                    </div>
                  )}

                  {/* Judul Kartu / Task di Header Modal — Full Width */}
                  <div>
                    <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                      Judul Kartu / Task *
                    </label>
                    <Input
                      value={detailJudul || ""}
                      disabled={!canEdit}
                      placeholder="Contoh: Susun materi pengujian awal..."
                      onChange={(e) => setDetailJudul(e.target.value)}
                      required
                      className="text-sm font-bold transition-all shadow-2xs h-10 border-2 border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] bg-white text-gray-900"
                    />
                  </div>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* Grid 2 Kolom ala Jira: Kiri ~60% (7 cols), Kanan ~40% (5 cols) */}
                  {/* ───────────────────────────────────────────────────────── */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* KOLOM KIRI (Konten Kerja) */}
                    {/* ═══════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* 1. Deskripsi Lengkap */}
                      <div>
                        <label className="text-xs font-bold text-gray-800 block mb-1">
                          Deskripsi Lengkap
                        </label>
                        <Textarea
                          rows={4}
                          value={detailDeskripsi}
                          disabled={!canEdit}
                          placeholder="Rincian lengkap aktivitas, acceptance criteria, atau langkah implementasi..."
                          onChange={(e) => setDetailDeskripsi(e.target.value)}
                          className="text-xs leading-relaxed font-normal bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463]"
                        />
                      </div>

                      {/* 2. Subtasks (BARU) */}
                      {!isCardPersisted ? (
                        <div className="space-y-2 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <ListTodo className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Subtasks</span>
                            </label>
                          </div>
                          <div className="p-3 bg-[#FBF3DD] rounded-lg border border-[#D4AF37] text-center">
                            <p className="text-[11px] font-medium text-[#8A6300]">
                              💡 Simpan kartu terlebih dahulu untuk menambah dan mengelola subtask.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <ListTodo className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Subtasks</span>
                              <span className="text-[11px] font-semibold text-gray-600">
                                · {subtasks.filter((st) => st.isDone).length}/{subtasks.length} selesai
                                {" · "}
                                <span className="text-[#3E9463] font-bold">
                                  Total estimasi: {subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0)} menit ({(() => {
                                    const totalMin = subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
                                    const h = totalMin / 60;
                                    return Number.isInteger(h) ? `${h} jam` : `${h.toFixed(1)} jam`;
                                  })()})
                                </span>
                              </span>
                            </label>
                            {subtasks.length > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F0E6] text-[#0B3D2E] border border-[#C9E4D0]">
                                {Math.round((subtasks.filter((st) => st.isDone).length / subtasks.length) * 100)}%
                              </span>
                            )}
                          </div>

                          {/* Daftar Subtask */}
                          {loadingSubtasks ? (
                            <div className="flex items-center justify-center py-3 text-xs text-gray-400 gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                              <span>Memuat subtask...</span>
                            </div>
                          ) : subtasks.length === 0 ? (
                            <p className="text-[11px] text-gray-400 italic py-1">
                              Belum ada subtask pada kartu ini.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {subtasks.map((st) => {
                                const isEditingTitle = editingSubtaskId === st.id && editingSubtaskField === 'title';
                                const isEditingHours = editingSubtaskId === st.id && editingSubtaskField === 'hours';
                                const attachments = Array.isArray(st.attachmentData) ? st.attachmentData : [];
                                const hasProof = attachments.length > 0;
                                const isPopoverOpen = activeSubtaskPopoverId === st.id;
                                const isMandatory = st.subtaskType === 'mandatory_simple' || st.subtaskType === 'mandatory_complex';

                                return (
                                  <div
                                    key={st.id}
                                    className={`p-2.5 rounded-xl bg-white border transition-all space-y-2 group shadow-2xs ${
                                      isMandatory
                                        ? "border-emerald-300/80 bg-emerald-50/10 hover:border-emerald-500"
                                        : "border-[#C9E4D0] hover:border-[#3E9463]/60"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2.5">
                                      <div className="flex items-start gap-2 min-w-0 flex-1">
                                        {/* Checkbox or Lock */}
                                        {isMandatory ? (
                                          st.isDone ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedMandatorySubtask(st);
                                                setIsMandatoryModalOpen(true);
                                              }}
                                              className="text-[#3E9463] focus:outline-none shrink-0 mt-0.5 cursor-pointer"
                                              title="Subtask wajib telah terisi di Laporan CV. Klik untuk melihat / mengubah data."
                                            >
                                              <CheckSquare className="h-4 w-4 text-[#3E9463]" />
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedMandatorySubtask(st);
                                                setIsMandatoryModalOpen(true);
                                              }}
                                              className="p-1 text-amber-700 bg-amber-50 rounded-md border border-amber-200 shrink-0 mt-0.5 cursor-pointer hover:bg-amber-100 transition-colors"
                                              title="Checklist terkunci: Klik untuk mengisi data subtask wajib ini"
                                            >
                                              <Lock className="h-3.5 w-3.5 text-amber-600" />
                                            </button>
                                          )
                                        ) : !hasProof ? (
                                          <div
                                            className="p-1 text-amber-700 bg-amber-50 rounded-md border border-amber-200 shrink-0 mt-0.5 cursor-help"
                                            title="Checklist terkunci: Harap lampirkan bukti kerja terlebih dahulu"
                                          >
                                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={!canEdit || togglingSubtaskId === st.id || isEditingTitle}
                                            onClick={() => !isEditingTitle && canEdit && handleToggleSubtask(st.id, st.isDone)}
                                            className={`text-[#3E9463] focus:outline-none shrink-0 mt-0.5 ${canEdit && !isEditingTitle ? 'cursor-pointer' : 'cursor-default'}`}
                                            title={st.isDone ? "Tandai belum selesai" : "Tandai selesai"}
                                          >
                                            {st.isDone ? (
                                              <CheckSquare className="h-4 w-4 text-[#3E9463]" />
                                            ) : (
                                              <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                            )}
                                          </button>
                                        )}

                                        <div className="flex-1 min-w-0">
                                          {isEditingTitle ? (
                                            <input
                                              autoFocus
                                              type="text"
                                              value={editTitleDraft}
                                              onChange={(e) => setEditTitleDraft(e.target.value)}
                                              onBlur={() => handleSaveSubtaskTitle(st.id)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); handleSaveSubtaskTitle(st.id); }
                                                if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
                                              }}
                                              className="text-xs leading-relaxed font-medium text-gray-900 w-full border border-[#3E9463] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#3E9463] bg-white"
                                            />
                                          ) : (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span
                                                onClick={() => { if (canEdit && !isMandatory) handleStartEditTitle(st); }}
                                                title={canEdit && !isMandatory ? 'Klik untuk mengedit judul subtask' : undefined}
                                                className={`text-xs break-words leading-relaxed whitespace-normal ${
                                                  st.isDone
                                                    ? 'line-through text-gray-400 font-normal'
                                                    : 'text-gray-900 font-semibold'
                                                } ${canEdit && !isMandatory ? 'cursor-text hover:text-[#0B3D2E]' : ''} transition-colors`}
                                              >
                                                {st.title}
                                              </span>
                                              {isMandatory && (
                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-[#0B3D2E] border border-emerald-300 shrink-0">
                                                  Wajib
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                        {/* Mandatory Action Button ("Isi Data" / "Ubah Data") */}
                                        {isMandatory && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedMandatorySubtask(st);
                                              setIsMandatoryModalOpen(true);
                                            }}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                                              st.isDone
                                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                                : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs"
                                            }`}
                                          >
                                            <FileText className="h-3 w-3" />
                                            <span>{st.isDone ? "Ubah Data" : "Isi Data"}</span>
                                          </button>
                                        )}

                                        {/* PIC Subtask Dropdown (Lebar ~170px) */}
                                        <select
                                          value={st.assigneeUserId || ""}
                                          disabled={!canEdit}
                                          onChange={(e) => handleUpdateSubtaskAssignee(st.id, e.target.value || null)}
                                          className="text-[10px] font-semibold bg-[#F0F7F1] border border-[#C9E4D0] hover:border-[#3E9463] rounded-md px-2 py-0.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3E9463] w-[170px] min-w-[170px] max-w-[170px] truncate"
                                          title={st.assigneeUserId ? `PIC: ${anggotaTim.find(a => a.userId === st.assigneeUserId)?.nama || "Ditugaskan"}` : "Pilih PIC Subtask"}
                                        >
                                          <option value="">👤 Pilih PIC...</option>
                                          {anggotaTim.filter(a => !!a.userId).map((a) => (
                                            <option key={a.id} value={a.userId!}>
                                              {a.nama}
                                            </option>
                                          ))}
                                        </select>

                                        {/* Edit / View Menit Subtask */}
                                        {isEditingHours ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              autoFocus
                                              type="number"
                                              min={0}
                                              max={9999}
                                              value={editHoursDraft}
                                              onChange={(e) => setEditHoursDraft(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                              onBlur={() => handleSaveSubtaskHours(st.id)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); handleSaveSubtaskHours(st.id); }
                                                if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
                                              }}
                                              className="text-[10px] font-bold w-16 text-center border border-[#3E9463] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#3E9463] bg-white text-[#8A6300]"
                                            />
                                            <span className="text-[10px] text-gray-500 font-semibold">menit</span>
                                          </div>
                                        ) : (
                                          <span
                                            onClick={() => { if (canEdit) handleStartEditHours(st); }}
                                            title={canEdit ? 'Klik untuk mengedit estimasi durasi menit' : undefined}
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF3DD] text-[#8A6300] border border-[#D4AF37] ${
                                              canEdit ? 'cursor-text hover:bg-[#F5E9B8] hover:border-[#B8922B]' : ''
                                            } transition-colors`}
                                          >
                                            {st.estimatedHours !== null && st.estimatedHours !== undefined && st.estimatedHours > 0
                                              ? `${st.estimatedHours} menit`
                                              : canEdit ? '— menit' : ''}
                                          </span>
                                        )}

                                        {/* Tombol Lampiran Bukti Kerja (📎) */}
                                        {!isMandatory && (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => setActiveSubtaskPopoverId(isPopoverOpen ? null : st.id)}
                                              className={`p-1 rounded-md border transition-colors relative cursor-pointer ${
                                                isPopoverOpen
                                                  ? "bg-[#0B3D2E] text-white border-[#0B3D2E]"
                                                  : hasProof
                                                  ? "bg-emerald-50 text-[#0B3D2E] border-emerald-300 hover:bg-emerald-100"
                                                  : "bg-white text-gray-400 border-gray-200 hover:text-gray-700 hover:bg-gray-50"
                                              }`}
                                              title={`Lampiran Bukti Kerja (${attachments.length} terunggah)`}
                                            >
                                              <Paperclip className="h-3.5 w-3.5" />
                                              {hasProof && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                                              )}
                                            </button>
                                          </div>
                                        )}

                                        {/* Tombol Hapus Subtask (hanya untuk subtask non-wajib pada kartu non-Baku / non-Wajib) */}
                                        {canEdit && !isMandatory && (
                                          <button
                                            type="button"
                                            disabled={deletingSubtaskId === st.id}
                                            onClick={() => handleDeleteSubtask(st.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                                            title="Hapus subtask"
                                          >
                                            {deletingSubtaskId === st.id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                                            ) : (
                                              <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* ── Popover / Panel Lampiran Bukti Kerja Subtask (Bagian D) ── */}
                                    {isPopoverOpen && (
                                      <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#C9E4D0] space-y-2.5 mt-2 transition-all">
                                        <div className="flex items-center justify-between border-b border-[#C9E4D0] pb-1.5">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D2E]">
                                            <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                                            <span>Lampiran Bukti Kerja Subtask</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setActiveSubtaskPopoverId(null)}
                                            className="text-[10px] text-gray-400 hover:text-gray-600 font-semibold px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
                                          >
                                            Tutup ✕
                                          </button>
                                        </div>

                                        {/* Daftar Lampiran yang Ada */}
                                        {attachments.length > 0 ? (
                                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                            {attachments.map((att: any, attIdx: number) => (
                                              <div
                                                key={att.id || attIdx}
                                                className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200 text-xs shadow-2xs"
                                              >
                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                  {att.type === 'link' ? (
                                                    <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                  ) : (
                                                    <FileText className="h-3.5 w-3.5 text-[#3E9463] shrink-0" />
                                                  )}
                                                  <a
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] font-semibold text-gray-800 hover:text-[#0B3D2E] truncate block hover:underline"
                                                  >
                                                    {att.name}
                                                  </a>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <a
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50"
                                                    title="Buka lampiran"
                                                  >
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                  {canEdit && (
                                                    <button
                                                      type="button"
                                                      disabled={deletingSubtaskAttId === (att.id || att.url)}
                                                      onClick={() => handleDeleteSubtaskAttachment(st.id, att.id || att.url)}
                                                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                                      title="Hapus bukti kerja"
                                                    >
                                                      {deletingSubtaskAttId === (att.id || att.url) ? (
                                                        <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                                                      ) : (
                                                        <Trash2 className="h-3 w-3" />
                                                      )}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-[10px] text-gray-400 italic">
                                            Belum ada bukti kerja. Unggah dokumen atau masukkan tautan untuk membuka kunci checklist.
                                          </p>
                                        )}

                                        {/* Upload File & Input Link */}
                                        {canEdit && (
                                          <div className="space-y-2 pt-1.5 border-t border-[#C9E4D0]">
                                            {/* File Upload Button */}
                                            <div>
                                              <input
                                                type="file"
                                                id={`subtask-file-${st.id}`}
                                                className="sr-only"
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                                                disabled={subtaskUploadingId === st.id}
                                                onChange={(e) => handleUploadSubtaskFile(st.id, e)}
                                              />
                                              <label
                                                htmlFor={`subtask-file-${st.id}`}
                                                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-[#3E9463] bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors cursor-pointer text-[11px] font-bold text-[#0B3D2E] ${
                                                  subtaskUploadingId === st.id ? "opacity-60 cursor-not-allowed" : ""
                                                }`}
                                              >
                                                {subtaskUploadingId === st.id ? (
                                                  <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                                                    <span>Mengunggah dokumen...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <UploadCloud className="h-3.5 w-3.5 text-[#3E9463]" />
                                                    <span>Unggah Dokumen Bukti (Maks 10MB)</span>
                                                  </>
                                                )}
                                              </label>
                                            </div>

                                            {/* Input Tautan Bukti */}
                                            <div className="flex items-center gap-1.5">
                                              <Input
                                                placeholder="https://drive.google.com/..."
                                                value={activeSubtaskPopoverId === st.id ? subtaskLinkUrl : ""}
                                                onChange={(e) => setSubtaskLinkUrl(e.target.value)}
                                                className="text-[11px] h-7 bg-white flex-1"
                                              />
                                              <Input
                                                placeholder="Label tautan (opsi)"
                                                value={activeSubtaskPopoverId === st.id ? subtaskLinkLabel : ""}
                                                onChange={(e) => setSubtaskLinkLabel(e.target.value)}
                                                className="text-[11px] h-7 bg-white w-28"
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                disabled={addingSubtaskLink || !subtaskLinkUrl.trim()}
                                                onClick={() => handleAddSubtaskLink(st.id)}
                                                className="text-[10px] h-7 px-2.5 bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-bold cursor-pointer"
                                              >
                                                {addingSubtaskLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                                <span>Tambah</span>
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Inline Tambah Subtask */}
                          {canEdit && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <Input
                                placeholder="+ Tambah subtask baru..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateSubtask();
                                  }
                                }}
                                className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] h-8 flex-1 min-w-[150px] text-gray-900"
                              />
                              <select
                                value={newSubtaskAssigneeUserId || ""}
                                onChange={(e) => setNewSubtaskAssigneeUserId(e.target.value || null)}
                                className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] h-8 rounded-lg px-2 text-gray-800 font-semibold w-[170px] min-w-[170px] max-w-[170px] truncate"
                              >
                                <option value="">👤 PIC (opsi)</option>
                                {anggotaTim.filter(a => !!a.userId).map((a) => (
                                  <option key={a.id} value={a.userId!}>
                                    {a.nama}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  max={9999}
                                  placeholder="Menit"
                                  value={newSubtaskHours}
                                  onChange={(e) =>
                                    setNewSubtaskHours(
                                      e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleCreateSubtask();
                                    }
                                  }}
                                  className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] h-8 w-16 px-1.5 text-center text-gray-900"
                                />
                                <span className="text-[10px] text-gray-500 font-semibold">menit</span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                disabled={creatingSubtask || !newSubtaskTitle.trim()}
                                onClick={handleCreateSubtask}
                                className="text-xs h-8 px-3 bg-[#3E9463] hover:bg-[#0B3D2E] text-white shrink-0 font-semibold gap-1 shadow-xs"
                              >
                                {creatingSubtask ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                                <span>Tambah</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Lampiran & Tautan (GABUNGAN) */}
                      {!isCardPersisted ? (
                        <div className="space-y-2 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex items-center justify-between border-b border-[#C9E4D0] pb-2">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Lampiran &amp; Tautan</span>
                            </label>
                          </div>
                          <div className="p-3 bg-[#FBF3DD] rounded-lg border border-[#D4AF37] text-center">
                            <p className="text-[11px] font-medium text-[#8A6300]">
                              💡 Simpan kartu terlebih dahulu untuk mengunggah lampiran file atau menambah tautan.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex items-center justify-between border-b border-[#C9E4D0] pb-2">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Paperclip className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Lampiran &amp; Tautan</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                              {attachments.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#E3F0E6] text-[#0B3D2E] border border-[#C9E4D0]">
                                  {attachments.length} Lampiran
                                </Badge>
                              )}
                              {links.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#E3F0E6] text-[#0B3D2E] border border-[#C9E4D0]">
                                  {links.length} Tautan
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Sub-bagian A: Lampiran File */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-gray-700 block">
                              Lampiran File
                            </span>

                            {canEdit && (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsDragOverDropzone(true);
                                }}
                                onDragLeave={() => setIsDragOverDropzone(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragOverDropzone(false);
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleFileUpload(e.dataTransfer.files[0]);
                                  }
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                                  isDragOverDropzone
                                    ? "border-[#3E9463] bg-[#E3F0E6]"
                                    : "border-[#C9E4D0] bg-white hover:border-[#3E9463] hover:bg-[#F0F7F1]"
                                }`}
                              >
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(e.target.files[0]);
                                    }
                                  }}
                                />
                                <div className="flex flex-col items-center justify-center gap-1">
                                  {uploadingAttachment ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-[#3E9463]">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Mengunggah lampiran file...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                        <UploadCloud className="h-4 w-4 text-[#3E9463]" />
                                        <span>Klik atau seret file ke sini untuk mengunggah</span>
                                      </div>
                                      <p className="text-[10px] text-gray-400">
                                        Maks 10MB • Gambar (JPG, PNG, WEBP), Dokumen (PDF, DOCX, XLSX)
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {loadingAttachments ? (
                              <div className="flex items-center justify-center py-2 text-xs text-gray-400 gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                                <span>Memuat daftar lampiran...</span>
                              </div>
                            ) : attachments.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">
                                Belum ada lampiran file pada kartu ini.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {attachments.map((att) => {
                                  const isProposal = att.source === "proposal_dossier";
                                  return (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#C9E4D0] hover:bg-[#E3F0E6] transition-colors"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {getFileIcon(att.fileName, att.fileType)}
                                        <div className="min-w-0 flex-1">
                                          <a
                                            href={att.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-gray-800 hover:text-[#3E9463] hover:underline truncate block"
                                            title={att.fileName}
                                          >
                                            {att.fileName}
                                          </a>
                                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <span>{formatFileSize(att.fileSize)}</span>
                                            {isProposal && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[9px] px-1.5 py-0 h-4 bg-[#E3F0E6] text-[#0B3D2E] border border-[#C9E4D0] font-semibold"
                                              >
                                                ✨ Dari Proposal
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <a
                                          href={att.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                                          title="Buka / Unduh file"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            disabled={deletingAttachmentId === att.id}
                                            onClick={() => handleDeleteAttachment(att)}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                            title={isProposal ? "Hapus referensi dari kartu" : "Hapus lampiran"}
                                          >
                                            {deletingAttachmentId === att.id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                                            ) : (
                                              <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Sub-bagian B: Tautan Terkait */}
                          <div className="space-y-2 pt-2.5 border-t border-[#C9E4D0]">
                            <span className="text-[11px] font-bold text-gray-700 block">
                              Tautan Terkait
                            </span>

                            {canEdit && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#F0F7F1] p-2 rounded-xl border border-[#C9E4D0]">
                                <Input
                                  placeholder="https://drive.google.com/... atau https://youtube.com/..."
                                  value={newLinkUrl}
                                  onChange={(e) => setNewLinkUrl(e.target.value)}
                                  className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] h-8 flex-1 text-gray-900"
                                />
                                <Input
                                  placeholder="Label (opsional)"
                                  value={newLinkLabel}
                                  onChange={(e) => setNewLinkLabel(e.target.value)}
                                  className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] h-8 sm:w-36 text-gray-900"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={addingLink || !newLinkUrl.trim()}
                                  onClick={handleAddLink}
                                  className="text-xs h-8 px-3 bg-[#3E9463] hover:bg-[#1B7A4D] text-white shrink-0 font-semibold gap-1"
                                >
                                  {addingLink ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Plus className="h-3 w-3" />
                                  )}
                                  <span>Tambah</span>
                                </Button>
                              </div>
                            )}

                            {loadingLinks ? (
                              <div className="flex items-center justify-center py-2 text-xs text-gray-400 gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                                <span>Memuat daftar tautan...</span>
                              </div>
                            ) : links.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">
                                Belum ada tautan terkait pada kartu ini.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {links.map((link) => (
                                  <div
                                    key={link.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#C9E4D0] hover:bg-[#E3F0E6] transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {getDomainIcon(link.url)}
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-semibold text-gray-800 hover:text-[#3E9463] hover:underline truncate block"
                                        >
                                          {link.label || link.url}
                                        </a>
                                        {link.label && (
                                          <p className="text-[10px] text-gray-400 truncate">{link.url}</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                                        title="Buka tautan di tab baru"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          disabled={deletingLinkId === link.id}
                                          onClick={() => handleDeleteLink(link.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                          title="Hapus tautan"
                                        >
                                          {deletingLinkId === link.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                                          ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Acceptance Criteria / Tolok Ukur Keberhasilan */}
                      <div>
                        <label className="text-xs font-bold text-[#0B3D2E] block mb-1 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-[#3E9463]" />
                          <span>Acceptance Criteria / Tolok Ukur Keberhasilan</span>
                        </label>
                        <Textarea
                          rows={3}
                          value={detailAcceptanceCriteria}
                          disabled={!canEdit}
                          placeholder="Kriteria task dianggap tuntas..."
                          onChange={(e) => setDetailAcceptanceCriteria(e.target.value)}
                          className="text-xs font-medium bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463]"
                        />
                      </div>

                      {/* 5. Tanggal Mulai & Target Selesai */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                            Tanggal Mulai
                          </label>
                          <Input
                            type="date"
                            value={detailTanggalMulai}
                            disabled={!canEdit}
                            onChange={(e) => setDetailTanggalMulai(e.target.value)}
                            className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] text-gray-900 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                            Target Selesai
                          </label>
                          <Input
                            type="date"
                            value={detailTanggalSelesai}
                            disabled={!canEdit}
                            onChange={(e) => setDetailTanggalSelesai(e.target.value)}
                            className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] text-gray-900 font-semibold"
                          />
                        </div>
                      </div>

                      {/* 6. Ketergantungan / Risiko */}
                      <div>
                        <label className="text-xs font-bold text-[#0B3D2E] block mb-1">
                          Ketergantungan / Risiko
                        </label>
                        <Textarea
                          rows={2}
                          value={detailDependencyRisiko}
                          disabled={!canEdit}
                          placeholder="Ketergantungan terhadap divisi lain, SME, akses sistem..."
                          onChange={(e) => setDetailDependencyRisiko(e.target.value)}
                          className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] text-gray-900 leading-relaxed font-normal"
                        />
                      </div>

                      {/* 7. Aktivitas (BARU) */}
                      {!isCardPersisted ? (
                        <div className="space-y-2 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex items-center justify-between border-b border-[#C9E4D0] pb-2">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Aktivitas</span>
                            </label>
                          </div>
                          <div className="p-3 bg-[#FBF3DD] rounded-lg border border-[#D4AF37] text-center">
                            <p className="text-[11px] font-medium text-[#8A6300]">
                              💡 Simpan kartu terlebih dahulu untuk menulis komentar dan melihat riwayat aktivitas.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0]">
                          <div className="flex items-center justify-between border-b border-[#C9E4D0] pb-2">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-[#3E9463]" />
                              <span>Aktivitas</span>
                            </label>
                            {/* Tab Switcher */}
                            <div className="flex items-center bg-[#E3F0E6] p-0.5 rounded-lg text-xs font-semibold border border-[#C9E4D0]">
                              <button
                                type="button"
                                onClick={() => setActivityTab("komentar")}
                                className={`px-2.5 py-1 rounded-md transition-colors ${
                                  activityTab === "komentar"
                                    ? "bg-[#3E9463] text-white shadow-2xs font-bold"
                                    : "text-[#0B3D2E] hover:text-[#3E9463]"
                                }`}
                              >
                                Komentar {comments.length > 0 && `(${comments.length})`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActivityTab("riwayat")}
                                className={`px-2.5 py-1 rounded-md transition-colors ${
                                  activityTab === "riwayat"
                                    ? "bg-[#3E9463] text-white shadow-2xs font-bold"
                                    : "text-[#0B3D2E] hover:text-[#3E9463]"
                                }`}
                              >
                                Riwayat {activityLogs.length > 0 && `(${activityLogs.length})`}
                              </button>
                            </div>
                          </div>

                          {/* Tab 1: Komentar */}
                          {activityTab === "komentar" && (
                            <div className="space-y-3">
                              {loadingComments ? (
                                <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                                  <span>Memuat komentar...</span>
                                </div>
                              ) : comments.length === 0 ? (
                                <p className="text-[11px] text-gray-400 italic py-1">
                                  Belum ada komentar pada kartu ini.
                                </p>
                              ) : (
                                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                  {comments.map((comm) => (
                                    <div
                                      key={comm.id}
                                      className="p-2.5 rounded-xl bg-white border border-[#C9E4D0] space-y-1 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                          <User className="h-3 w-3 text-gray-500" />
                                          <span>{comm.userNama || "Pengguna"}</span>
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          {formatDateTimeIndo(comm.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pl-4.5">
                                        {comm.content}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Input Komentar Baru */}
                              {canEdit && (
                                <div className="space-y-1.5 pt-1">
                                  <Textarea
                                    rows={2}
                                    placeholder="Tulis komentar atau catatan untuk kartu ini..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    className="text-xs bg-white border border-[#C9E4D0] focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] text-gray-900"
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={creatingComment || !newCommentText.trim()}
                                      onClick={handleCreateComment}
                                      className="text-xs h-7 px-3 bg-[#3E9463] hover:bg-[#0B3D2E] text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
                                    >
                                      {creatingComment ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Send className="h-3 w-3" />
                                      )}
                                      <span>Kirim</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tab 2: Riwayat Activity Log */}
                          {activityTab === "riwayat" && (
                            <div className="space-y-2">
                              {loadingActivityLogs ? (
                                <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                                  <span>Memuat riwayat aktivitas...</span>
                                </div>
                              ) : activityLogs.length === 0 ? (
                                <p className="text-[11px] text-gray-400 italic py-1">
                                  Belum ada riwayat aktivitas pada kartu ini.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {activityLogs.map((log) => (
                                    <div
                                      key={log.id}
                                      className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C9E4D0] text-xs"
                                    >
                                      <History className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 leading-snug">
                                          {formatActivityLogText(log)}
                                        </p>
                                        <span className="text-[10px] text-gray-400 block mt-0.5">
                                          {formatDateTimeIndo(log.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* KOLOM KANAN (Metadata & Status Ringkas) */}
                    {/* ═══════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* 1. Status Kolom — Akses Cepat di Atas */}
                      <div className="p-3.5 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0] space-y-1.5">
                        <label className="text-xs font-bold text-gray-800 block flex items-center gap-1.5">
                          <KanbanIcon className="h-4 w-4 text-[#3E9463]" />
                          <span>Status Kolom</span>
                        </label>
                        <select
                          value={detailStatusKolom}
                          disabled={!canEdit}
                          onChange={(e) => setDetailStatusKolom(e.target.value)}
                          className="w-full text-xs bg-white border border-[#C9E4D0] rounded-lg p-2 text-gray-900 font-bold focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] focus:outline-hidden shadow-2xs"
                        >
                          {columns.map((c) => (
                            <option key={c.namaKolom} value={c.namaKolom}>
                              {c.namaKolom}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Detail — Format Ringkas Label:Value */}
                      <div className="p-4 bg-[#F0F7F1] rounded-xl border border-[#C9E4D0] space-y-3.5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B3D2E] border-b border-[#C9E4D0] pb-1.5">
                          Detail Kartu
                        </h4>

                        {/* Assignee / Koordinator Utama (Bagian A & F) */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-800 block flex items-center gap-1.5">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>Koordinator / Penanggung Jawab Utama</span>
                          </label>
                          <select
                            value={detailOwnerAnggotaId || ""}
                            disabled={!canEdit}
                            onChange={(e) => setDetailOwnerAnggotaId(e.target.value || null)}
                            className="w-full text-xs bg-white border border-[#C9E4D0] rounded-lg p-2 text-gray-900 font-semibold focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463]"
                          >
                            <option value="">-- Belum Ditugaskan --</option>
                            {anggotaTim.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nama} ({a.jabatan || a.unitKerja || "Anggota"})
                              </option>
                            ))}
                          </select>

                          {/* Warning Nudge: Subtask punya PIC tapi kartu belum ada Koordinator (Bagian F) */}
                          {showCoordinatorWarning && (
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-1.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 font-medium min-w-0">
                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>Beberapa subtask sudah punya PIC, tapi kartu ini belum ada koordinator.</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleAutoAssignCoordinatorFromSubtasks}
                                className="text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer transition-colors shadow-2xs"
                              >
                                Isi otomatis dari PIC terbanyak
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Estimasi Waktu (Menit) & Konversi Jam (Bagian B) */}
                        {(() => {
                          const hasSubtasks = subtasks.length > 0;
                          const subtaskTotalMinutes = subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
                          const currentMinutes = hasSubtasks
                            ? subtaskTotalMinutes
                            : Math.round((detailStoryPoint ?? 3) * 60);
                          const safeMinutes = Number.isFinite(currentMinutes) ? Math.max(1, Math.round(currentMinutes)) : 60;

                          const hoursVal = safeMinutes / 60;
                          const hoursDisplay = Number.isInteger(hoursVal) ? `${hoursVal} jam` : `${hoursVal.toFixed(1)} jam`;

                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#8A6300] flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-[#B8860B]" />
                                  <span>Estimasi Waktu (menit)</span>
                                </label>
                                <span className="text-[11px] font-black text-[#8A6300] bg-[#FBF3DD] px-2 py-0.5 rounded-md border border-[#D4AF37] shadow-2xs">
                                  {safeMinutes} menit ({hoursDisplay})
                                </span>
                              </div>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                disabled={!canEdit || hasSubtasks}
                                value={safeMinutes}
                                onChange={(e) => {
                                  if (hasSubtasks) return;
                                  const min = Math.max(1, parseInt(e.target.value, 10) || 60);
                                  setDetailStoryPoint(Math.max(1, Math.round(min / 60)));
                                }}
                                className={`w-full text-xs bg-white border-2 border-[#D4AF37] hover:border-[#B8860B] rounded-lg p-2 text-[#8A6300] font-extrabold focus:border-[#B8860B] focus:ring-1 focus:ring-[#D4AF37] ${
                                  hasSubtasks ? "opacity-80 bg-gray-50 cursor-not-allowed" : ""
                                }`}
                                placeholder="Contoh: 120"
                              />
                              {hasSubtasks && (
                                <p className="text-[10px] text-gray-500 italic mt-0.5">
                                  (read-only, mengikuti total subtask)
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Penugasan Sprint */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Layers className="h-4 w-4 text-gray-500" />
                              <span>Sprint</span>
                            </label>

                            {/* Tombol Cepat: Assign ke Sprint (Direct 1-Click Commit) */}
                            {canEdit && isCardPersisted && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] font-bold text-[#0F5132] hover:bg-[#E3F0E6] gap-1 cursor-pointer"
                                    title="Assign langsung ke Sprint (1-klik commit)"
                                  >
                                    <Zap className="h-3 w-3 fill-[#3E9463] text-[#3E9463]" />
                                    <span>Assign ke Sprint ⚡</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2 bg-white rounded-xl shadow-xl border border-[#C9E4D0]" align="end">
                                  <span className="text-[11px] font-bold text-[#0B3D2E] block mb-1.5">
                                    Pilih Target Sprint:
                                  </span>
                                  <div className="space-y-1">
                                    {sprints.map((s) => (
                                      <button
                                        key={s.nomorSprint}
                                        type="button"
                                        onClick={async () => {
                                          await handleQuickAssignSprint(selectedCardForDetail.id, s.nomorSprint);
                                        }}
                                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#F0F7F1] text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors cursor-pointer border border-transparent hover:border-[#C9E4D0]"
                                      >
                                        <span>Sprint {s.nomorSprint} {s.status === "aktif" ? "(Aktif)" : ""}</span>
                                        <ArrowRight className="h-3 w-3 text-[#3E9463]" />
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleQuickAssignSprint(selectedCardForDetail.id, null);
                                      }}
                                      className="w-full text-left p-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-between transition-colors cursor-pointer border border-transparent"
                                    >
                                      <span>📦 Kembalikan ke Backlog</span>
                                      <ArrowRight className="h-3 w-3 text-gray-400" />
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>

                          <select
                            value={detailSprintNumber === null ? "backlog" : String(detailSprintNumber)}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const val = e.target.value === "backlog" ? null : parseInt(e.target.value);
                              setDetailSprintNumber(val);
                            }}
                            className="w-full text-xs bg-white border border-[#C9E4D0] rounded-lg p-2 text-gray-900 font-bold focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463]"
                          >
                            <option value="backlog">📦 Backlog (Tanpa Sprint)</option>
                            {sprints.map((s) => (
                              <option key={s.nomorSprint} value={s.nomorSprint}>
                                Sprint {s.nomorSprint} {s.status === "aktif" ? "(Aktif)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Label / Tag */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-800 block flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <span>Label / Tag</span>
                          </label>
                          <Input
                            placeholder="Draf Roadmap, Template Baku CV, MVP, SME, dll"
                            value={detailLabel}
                            disabled={!canEdit}
                            onChange={(e) => setDetailLabel(e.target.value)}
                            className="text-xs bg-white border border-[#C9E4D0] text-gray-900 font-medium focus:border-[#3E9463] focus:ring-1 focus:ring-[#3E9463]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────── */}
                  {/* Modal Footer */}
                  {/* ───────────────────────────────────────────────────────── */}
                  <DialogFooter className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#C9E4D0]">
                    {canEdit &&
                    !selectedCardForDetail?.isNewBacklog &&
                    !(
                      detectCvBakuCardType(
                        detailJudul || selectedCardForDetail?.judul,
                        detailTahap || selectedCardForDetail?.tahap
                      ) !== null ||
                      detailLabel === "Template Baku CV" ||
                      selectedCardForDetail?.label === "Template Baku CV" ||
                      isMvMandatoryCard(
                        detailJudul || selectedCardForDetail?.judul,
                        detailTahap || selectedCardForDetail?.tahap
                      )
                    ) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deletingCard || savingDetailCard || Boolean(adoptingCardId)}
                        onClick={handleDeleteCard}
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5 cursor-pointer"
                      >
                        {deletingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span>Hapus Kartu</span>
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {/* Tombol Adopsi — hanya muncul kalau kartu masih ai_reference */}
                      {canEdit && selectedCardForDetail?.reviewStatus === 'ai_reference' && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(adoptingCardId) || savingDetailCard || !detailJudul.trim()}
                          onClick={handleAdoptAiCard}
                          className="text-xs font-bold gap-1.5 bg-[#B8860B] hover:bg-[#8A6300] text-white shadow-sm cursor-pointer"
                        >
                          {adoptingCardId === selectedCardForDetail?.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BrainCircuit className="h-3.5 w-3.5" />
                          )}
                          <span>Adopsi Backlog ke Tim</span>
                        </Button>
                      )}

                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingDetailCard || Boolean(adoptingCardId) || !detailJudul.trim()}
                        className="text-xs font-bold bg-[#3E9463] hover:bg-[#0B3D2E] text-white shadow-sm transition-all cursor-pointer px-5"
                      >
                        {savingDetailCard ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </div>
                        ) : (
                          <span>Simpan</span>
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Modal / Dialog Tambah Kartu Baru */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isNewCardOpen} onOpenChange={setIsNewCardOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Tambah Kartu ke Kolom: {targetColumn}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCard} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Judul Kartu / Task *
              </label>
              <Input
                placeholder="Contoh: FGD dengan early adopters"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Deskripsi
              </label>
              <Textarea
                placeholder="Rincian aktivitas atau acceptance criteria..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="text-xs min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Penugasan Sprint
                </label>
                <select
                  value={targetSprintForNewCard === null ? "backlog" : String(targetSprintForNewCard)}
                  onChange={(e) => {
                    const val = e.target.value === "backlog" ? null : parseInt(e.target.value);
                    setTargetSprintForNewCard(val);
                  }}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700 font-semibold"
                >
                  <option value="backlog">📦 Backlog (Tanpa Sprint)</option>
                  {sprints.map((s) => (
                    <option key={s.nomorSprint} value={s.nomorSprint}>
                      Sprint {s.nomorSprint} {s.status === "aktif" ? "(Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Tahap Inkubasi
                </label>
                <select
                  value={tahap}
                  onChange={(e) => setTahap(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700"
                >
                  <option value="innovation_setup">Innovation Setup</option>
                  <option value="customer_validation">Customer Validation</option>
                  <option value="market_validation">Market Validation</option>
                  <option value="umum">Umum</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Label / Tag
              </label>
              <Input
                placeholder="Backlog Charter, SME, MVP, dll"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Target Selesai
                </label>
                <Input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewCardOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingCard || !judul.trim()}
                className="text-xs bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingCard ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Buat Kartu</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Dialog Buat Kartu Issue (Paket 24c - Coach & Admin Only) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isNewIssueOpen} onOpenChange={setIsNewIssueOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-950 border border-orange-300">
                <AlertCircle className="h-3 w-3 text-orange-700" />
                <span>ISSUE SPRINT</span>
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 mt-1">
              Buat Kartu Issue Sprint {currentPlanningSprintObj?.nomorSprint || selectedSprintNum}
            </DialogTitle>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Catat kendala, blocker, atau isu mendadak yang muncul selama sprint berjalan. Kartu ini akan otomatis dialokasikan ke sprint aktif dan dianalisis oleh AI saat Sprint Review.
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveIssue} className="space-y-3.5 py-1 text-xs">
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Judul Issue <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Error timeout integrasi API payment gateway"
                value={issueJudul}
                onChange={(e) => setIssueJudul(e.target.value)}
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                Deskripsi &amp; Kronologi Hambatan
              </label>
              <Textarea
                placeholder="Jelaskan detail masalah, dampak ke target sprint, dan langkah penanganan awal..."
                value={issueDeskripsi}
                onChange={(e) => setIssueDeskripsi(e.target.value)}
                className="text-xs min-h-[75px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">
                  Tingkat Urgensi / Dampak
                </label>
                <select
                  value={issueDampak}
                  onChange={(e) => setIssueDampak(e.target.value as any)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700 font-semibold"
                >
                  <option value="Rendah">🟡 Rendah (Minor)</option>
                  <option value="Sedang">🟠 Sedang (Moderat)</option>
                  <option value="Tinggi">🔴 Tinggi (Major Blocker)</option>
                  <option value="Kritis">🔥 Kritis (Stop Sprint)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-800">
                    Estimasi Waktu (menit)
                  </label>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    ≈ {typeof issueMenit === "number" && issueMenit > 0 ? (issueMenit / 60).toFixed(1) : "0"} SP
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Contoh: 180"
                  value={issueMenit === "" ? "" : issueMenit}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1);
                    setIssueMenit(val);
                  }}
                  className="text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1">
                PIC Penanggung Jawab Issue (Opsional)
              </label>
              <select
                value={issueOwnerAnggotaId || ""}
                onChange={(e) => setIssueOwnerAnggotaId(e.target.value || null)}
                className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700"
              >
                <option value="">-- Pilih Anggota Tim (Opsional) --</option>
                {anggotaTim.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama} ({a.jabatan || a.role || "Anggota"})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewIssueOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingIssue || !issueJudul.trim()}
                className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {savingIssue ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Simpan Kartu Issue</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Dialog Selesaikan Sprint (Penyelesaian Task Belum Selesai) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 shrink-0">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Selesaikan Sprint {currentSprintObj?.nomorSprint}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {incompleteCardsInCurrentSprint.length === 0 ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <p className="font-bold">🎉 Luar Biasa!</p>
                <p className="text-[11px] text-emerald-800">
                  Semua kartu kerja pada Sprint {currentSprintObj?.nomorSprint} telah berstatus <strong>Done</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    Terdapat {incompleteCardsInCurrentSprint.length} kartu yang belum "Done"
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Pilih tujuan pemindahan untuk masing-masing kartu yang belum selesai:
                  </p>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {incompleteCardsInCurrentSprint.map((card) => (
                    <div
                      key={card.id}
                      className="p-2 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="font-bold text-gray-900 truncate">{card.judul}</p>
                        <span className="text-[10px] text-gray-400">
                          Status saat ini: {card.statusKolom}
                        </span>
                      </div>

                      <select
                        className="text-xs bg-white border border-gray-200 rounded-lg p-1 font-semibold text-gray-700 shrink-0"
                        value={incompleteCardsDestinations[card.id] || "backlog"}
                        onChange={(e) => {
                          const val = e.target.value as "backlog" | "next_sprint";
                          setIncompleteCardsDestinations((prev) => ({
                            ...prev,
                            [card.id]: val,
                          }));
                        }}
                      >
                        <option value="backlog">Pindahkan ke Backlog</option>
                        <option value="next_sprint">
                          Pindahkan ke Sprint {currentSprintObj ? currentSprintObj.nomorSprint + 1 : "Berikutnya"}
                        </option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ Sprint Review & Retrospective Form (Template 3.2) ══ */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Sprint Review &amp; Retrospective (Template 3.2)</span>
                  </h4>
                  <p className="text-[10px] text-blue-700">
                    Draf disusun otomatis oleh AI dari kartu Done &amp; Issue, tetap bisa Anda edit.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingAiReview}
                  onClick={() => handleGenerateAiReview(currentSprintObj?.id)}
                  className="h-7 text-[11px] font-bold border-blue-300 bg-white hover:bg-blue-50 text-blue-800 gap-1 shadow-2xs cursor-pointer"
                >
                  {isGeneratingAiReview ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      <span>Menyusun...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      <span>Saran Ulang AI</span>
                    </>
                  )}
                </Button>
              </div>

              {isGeneratingAiReview && (
                <div className="p-2.5 rounded-lg bg-blue-100/60 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs animate-pulse">
                  <Sparkles className="h-4 w-4 text-blue-600 shrink-0 animate-spin" />
                  <span>AI sedang menganalisis kartu Done &amp; Issue untuk menyusun draf...</span>
                </div>
              )}

              {/* Review Section */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-800 block">
                    Demo / Fitur yang Didemonstrasikan
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Apa saja luaran/fitur yang didemokan ke stakeholder..."
                    value={reviewDemo}
                    onChange={(e) => setReviewDemo(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-800 block">
                      Feedback Reviewer
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Umpan balik dari Coach / SME / User..."
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-800 block">
                      Value / Dampak yang Dihasilkan
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Nilai tambah atau capaian sprint ini..."
                      value={reviewValue}
                      onChange={(e) => setReviewValue(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-800 block">
                    Questions (Pertanyaan Terbuka untuk Sprint Berikutnya)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Pertanyaan strategis atau hal yang masih perlu dijawab..."
                    value={reviewQuestions}
                    onChange={(e) => setReviewQuestions(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>

              {/* Retrospective Section */}
              <div className="pt-2.5 border-t border-blue-200 space-y-2.5">
                <span className="text-[11px] font-extrabold text-blue-900 block uppercase tracking-wide">
                  Retrospective (Continue / Stop / Start)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-800 block">
                      Continue (Pertahankan)
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Praktik baik yang dilanjutkan..."
                      value={reviewContinue}
                      onChange={(e) => setReviewContinue(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-red-800 block">
                      Stop (Hentikan)
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Hambatan/kebiasaan yang dihentikan..."
                      value={reviewStop}
                      onChange={(e) => setReviewStop(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 block">
                      Start (Mulai Baru)
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Inisiatif baru di sprint depan..."
                      value={reviewStart}
                      onChange={(e) => setReviewStart(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 block">
                    Owner / Target Sprint Tindak Lanjut
                  </label>
                  <Input
                    placeholder="PIC / Target sprint berikutnya..."
                    value={reviewOwnerTarget}
                    onChange={(e) => setReviewOwnerTarget(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/80 shrink-0 sticky bottom-0 z-10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompleteModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading}
              onClick={handleConfirmCompleteSprint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Konfirmasi &amp; Simpan Sprint Review</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Dialog Kelola Jumlah Sprint */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isSprintCountModalOpen} onOpenChange={setIsSprintCountModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#0F5132]" />
              Kelola Jumlah Iterasi Sprint
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p className="font-semibold">Audit Trail Perubahan Sprint</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Setiap perubahan jumlah sprint akan dicatat ke dalam <strong>sprint_log</strong> dengan alasan yang Anda masukkan.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Target Jumlah Sprint Baru *
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={targetSprintCount}
                onChange={(e) => setTargetSprintCount(parseInt(e.target.value) || 1)}
                className="text-xs font-bold"
              />
              <span className="text-[10px] text-gray-400">
                Jumlah sprint saat ini: {sprints.length} sprint
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Alasan Perubahan Jumlah Sprint *
              </label>
              <Textarea
                rows={3}
                placeholder="Contoh: Menambah 2 sprint untuk fase pilot regional..."
                value={sprintCountReason}
                onChange={(e) => setSprintCountReason(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSprintCountModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoading || !sprintCountReason.trim() || targetSprintCount === sprints.length}
              onClick={handleApplySprintCountChange}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />}
              <span>Simpan Perubahan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Modal Subtask Wajib (Customer Validation Report Integration) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {selectedCardForDetail && (
        <MandatorySubtaskModal
          isOpen={isMandatoryModalOpen}
          onClose={() => {
            setIsMandatoryModalOpen(false);
            setSelectedMandatorySubtask(null);
          }}
          timId={timId}
          cardId={selectedCardForDetail.id}
          cardTitle={detailJudul || selectedCardForDetail.judul}
          subtask={selectedMandatorySubtask}
          onSuccess={(subtaskId) => {
            setSubtasks((prev) =>
              prev.map((s) => (s.id === subtaskId ? { ...s, isDone: true } : s))
            );
          }}
        />
      )}
    </div>
  );
}
