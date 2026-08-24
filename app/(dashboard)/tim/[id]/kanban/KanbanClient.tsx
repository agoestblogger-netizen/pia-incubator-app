"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
} from "@/app/actions/kanban";
import {
  startSprintAction,
  completeSprintAction,
  updateSprintCountAction,
} from "@/app/actions/sprint";
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
} from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

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
  onMoveCard,
  onAssignSprint,
  onSelectCard,
}: {
  card: any;
  columns: any[];
  sprints: any[];
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative rounded-xl p-3.5 border transition-all select-none shadow-2xs ${
        isDragging
          ? "border-[#0F5132] bg-green-50/20 shadow-lg"
          : isOverdue
          ? "border-red-400 bg-red-50/25 hover:border-red-500 hover:shadow-sm ring-1 ring-red-300"
          : "border-gray-200 bg-white hover:border-[#0F5132]/60 hover:shadow-sm"
      }`}
    >
      {/* Top Tag & Drag handle */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div
          onClick={() => onSelectCard(card)}
          className="flex flex-wrap items-center gap-1.5 cursor-pointer"
        >
          {card.label && (
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F5132]/10 text-[#0F5132]">
              {card.label}
            </span>
          )}

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
            isOverdue ? "text-red-950" : "text-gray-900 group-hover:text-[#0F5132]"
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
                className="inline-flex items-center gap-1 bg-gray-100/90 hover:bg-gray-200/90 border border-gray-200/60 px-1.5 py-0.5 rounded text-gray-700 transition-colors"
                title={`${card.attachmentsCount} Lampiran`}
              >
                <Paperclip className="h-3 w-3 text-gray-500" />
                <span>{card.attachmentsCount}</span>
              </span>
            )}
            {Boolean(card.linksCount) && (
              <span
                className="inline-flex items-center gap-1 bg-gray-100/90 hover:bg-gray-200/90 border border-gray-200/60 px-1.5 py-0.5 rounded text-gray-700 transition-colors"
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
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-gray-100 text-[10px] text-gray-400">
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
            className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
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
            className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
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

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-3.5 border transition-all flex flex-col space-y-3 min-h-[360px] ${
        isOver
          ? "bg-green-50/70 border-[#0F5132]/60 ring-2 ring-[#0F5132]/20"
          : isBacklogArea
          ? "bg-slate-50/90 border-slate-200"
          : "bg-gray-50/80 border-gray-200"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1">
        <h3
          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${
            isBacklogArea ? "text-slate-800" : "text-gray-700"
          }`}
        >
          {isBacklogArea && <Inbox className="h-3.5 w-3.5 text-slate-600" />}
          <span>{columnTitle}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${
              isBacklogArea
                ? "bg-slate-200 text-slate-800 border-slate-300"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {cards.length}
          </span>
        </h3>

        <button
          type="button"
          onClick={() => onAddCard(isBacklogArea ? "To Do" : columnTitle)}
          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200/60 transition-colors"
          title={`Tambah kartu ke ${columnTitle}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards List with Sortable Context */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 flex-1">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              columns={columns}
              sprints={sprints}
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
  currentUser,
}: {
  timId: string;
  initialColumns: any[];
  initialCards: any[];
  initialSprints?: any[];
  anggotaTim: any[];
  canEdit?: boolean;
  currentUser?: any;
}) {
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");
  const [cards, setCards] = useState<any[]>(initialCards);
  const [sprints, setSprints] = useState<any[]>(initialSprints);
  const [columns] = useState<any[]>(
    initialColumns.length > 0
      ? initialColumns
      : [
          { id: "1", namaKolom: "To Do" },
          { id: "2", namaKolom: "In Progress" },
          { id: "3", namaKolom: "Review" },
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

  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Sprint Complete Dialog State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [incompleteCardsDestinations, setIncompleteCardsDestinations] = useState<
    Record<string, "backlog" | "next_sprint">
  >({});

  // Sprint Count Dialog State
  const [isSprintCountModalOpen, setIsSprintCountModalOpen] = useState(false);
  const [targetSprintCount, setTargetSprintCount] = useState(sprints.length);
  const [sprintCountReason, setSprintCountReason] = useState("");

  // Card Detail Modal State
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<any | null>(null);
  const [detailJudul, setDetailJudul] = useState("");
  const [detailDeskripsi, setDetailDeskripsi] = useState("");
  const [detailTahap, setDetailTahap] = useState("umum");
  const [detailSprintNumber, setDetailSprintNumber] = useState<number | null>(null);
  const [detailStatusKolom, setDetailStatusKolom] = useState("To Do");
  const [detailOwnerAnggotaId, setDetailOwnerAnggotaId] = useState<string | null>(null);
  const [detailLabel, setDetailLabel] = useState("");
  const [detailTanggalMulai, setDetailTanggalMulai] = useState("");
  const [detailTanggalSelesai, setDetailTanggalSelesai] = useState("");
  const [detailAcceptanceCriteria, setDetailAcceptanceCriteria] = useState("");
  const [detailDependencyRisiko, setDetailDependencyRisiko] = useState("");
  const [savingDetailCard, setSavingDetailCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);

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

  const handleFileUpload = async (file: File) => {
    if (!selectedCardForDetail) return;

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
    if (!selectedCardForDetail) return;
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

  // Backlog Cards
  const backlogCards = useMemo(() => {
    return filteredCards.filter((c) => c.sprintNumber === null || c.sprintNumber === undefined);
  }, [filteredCards]);

  // Sprint Cards for currently selected sprint
  const activeSprintCards = useMemo(() => {
    if (!currentSprintObj) return [];
    return filteredCards.filter((c) => c.sprintNumber === currentSprintObj.nomorSprint);
  }, [filteredCards, currentSprintObj]);

  // Incomplete cards for completion dialog
  const incompleteCardsInCurrentSprint = useMemo(() => {
    if (!currentSprintObj) return [];
    return activeSprintCards.filter((c) => c.statusKolom !== "Done");
  }, [activeSprintCards, currentSprintObj]);

  // ───────────────────────────────────────────────────────────────────────────
  // Card Detail Handlers
  // ───────────────────────────────────────────────────────────────────────────

  const handleOpenCardDetail = (card: any) => {
    setSelectedCardForDetail(card);
    setDetailJudul(card.judul || "");
    setDetailDeskripsi(card.deskripsi || "");
    setDetailTahap(card.tahap || "umum");
    setDetailSprintNumber(card.sprintNumber !== undefined ? card.sprintNumber : null);
    setDetailStatusKolom(card.statusKolom || "To Do");
    setDetailOwnerAnggotaId(card.ownerAnggotaId || null);
    setDetailLabel(card.label || "");
    setDetailTanggalMulai(
      card.tanggalMulai ? new Date(card.tanggalMulai).toISOString().split("T")[0] : ""
    );
    setDetailTanggalSelesai(
      card.tanggalSelesai ? new Date(card.tanggalSelesai).toISOString().split("T")[0] : ""
    );
    setDetailAcceptanceCriteria(card.acceptanceCriteria || "");
    setDetailDependencyRisiko(card.dependencyRisiko || "");

    // Fetch attachments and links
    setAttachments([]);
    setLinks([]);
    setNewLinkUrl("");
    setNewLinkLabel("");
    fetchTaskAttachments(card.id);
    fetchTaskLinks(card.id);
  };

  const handleSaveCardDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForDetail) return;
    setSavingDetailCard(true);
    setErrorMessage(null);

    const payload = {
      judul: detailJudul,
      deskripsi: detailDeskripsi,
      tahap: detailTahap,
      sprintNumber: detailSprintNumber,
      statusKolom: detailStatusKolom,
      ownerAnggotaId: detailOwnerAnggotaId,
      label: detailLabel,
      tanggalMulai: detailTanggalMulai ? new Date(detailTanggalMulai) : null,
      tanggalSelesai: detailTanggalSelesai ? new Date(detailTanggalSelesai) : null,
      acceptanceCriteria: detailAcceptanceCriteria,
      dependencyRisiko: detailDependencyRisiko,
    };

    const res = await updateKanbanCardFullAction(timId, selectedCardForDetail.id, payload);
    if (res.success && res.data) {
      setCards((prev) =>
        prev.map((c) => (c.id === selectedCardForDetail.id ? { ...c, ...res.data } : c))
      );
      toast.success("Perubahan detail kartu berhasil disimpan!", "Kartu Diperbarui");
      setSelectedCardForDetail(null);
    } else {
      const errMsg = res.error || "Gagal menyimpan perubahan kartu.";
      toast.error(errMsg, "Gagal Menyimpan Kartu");
      setErrorMessage(errMsg);
    }
    setSavingDetailCard(false);
  };

  const handleDeleteCard = async () => {
    if (!selectedCardForDetail) return;
    if (!confirm(`Hapus kartu "${selectedCardForDetail.judul}" secara permanen?`)) return;
    setDeletingCard(true);
    setErrorMessage(null);

    const res = await deleteKanbanCardAction(timId, selectedCardForDetail.id);
    if (res.success) {
      setCards((prev) => prev.filter((c) => c.id !== selectedCardForDetail.id));
      toast.success("Kartu task berhasil dihapus.", "Kartu Dihapus");
      setSelectedCardForDetail(null);
    } else {
      const errMsg = res.error || "Gagal menghapus kartu.";
      toast.error(errMsg, "Gagal Menghapus");
      setErrorMessage(errMsg);
    }
    setDeletingCard(false);
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

  const handleOpenCompleteDialog = () => {
    if (!currentSprintObj) return;

    // Initialize destinations for incomplete cards
    const initialDestinations: Record<string, "backlog" | "next_sprint"> = {};
    for (const card of incompleteCardsInCurrentSprint) {
      initialDestinations[card.id] = "backlog";
    }
    setIncompleteCardsDestinations(initialDestinations);
    setIsCompleteModalOpen(true);
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

    const res = await completeSprintAction(timId, currentSprintObj.id, cardMovements);
    if (res.success) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === currentSprintObj.id
            ? { ...s, status: "selesai", tanggalSelesaiAktual: new Date() }
            : s
        )
      );

      // Update local card sprint numbers
      setCards((prev) =>
        prev.map((card) => {
          const mov = cardMovements.find((m) => m.cardId === card.id);
          if (mov) {
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

      {/* Sprint Header & Controller Bar (ala Jira) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        {/* Top Sprint Tabs Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-2 shrink-0">
              Pilih Sprint:
            </span>

            {sprints.map((s) => {
              const isSelected = selectedSprintTab === String(s.nomorSprint);
              const isAktif = s.status === "aktif";
              const isSelesai = s.status === "selesai";

              return (
                <button
                  key={s.nomorSprint}
                  onClick={() => setSelectedSprintTab(String(s.nomorSprint))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-[#0F5132] text-white shadow-xs"
                      : "bg-gray-100/90 text-gray-700 hover:bg-gray-200 border border-gray-200/80"
                  }`}
                >
                  <span>Sprint {s.nomorSprint}</span>
                  {isAktif && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {isSelesai && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setSelectedSprintTab("backlog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSprintTab === "backlog"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Semua Backlog ({backlogCards.length})</span>
            </button>
          </div>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTargetSprintCount(sprints.length);
                setSprintCountReason("");
                setIsSprintCountModalOpen(true);
              }}
              className="text-xs font-semibold gap-1.5 text-gray-700 hover:text-[#0F5132]"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Kelola Jumlah Sprint ({sprints.length})</span>
            </Button>
          )}
        </div>

        {/* Selected Sprint Details & Start/Complete Action Buttons */}
        {currentSprintObj ? (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Sprint {currentSprintObj.nomorSprint}
                  {currentSprintObj.tujuan
                    ? `: ${currentSprintObj.tujuan.replace(new RegExp(`^Sprint\\s*${currentSprintObj.nomorSprint}\\s*:\\s*`, 'i'), '')}`
                    : ''}
                </h2>
                <Badge
                  variant={
                    currentSprintObj.status === "aktif"
                      ? "success"
                      : currentSprintObj.status === "selesai"
                      ? "gold"
                      : "secondary"
                  }
                  className="text-[10px] capitalize font-bold"
                >
                  {currentSprintObj.status === "aktif"
                    ? "🟢 Sedang Aktif"
                    : currentSprintObj.status === "selesai"
                    ? "🔵 Selesai"
                    : "⚪ Belum Dimulai"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {currentSprintObj.tanggalMulaiRencana && (
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3" />
                    Target: {formatDateIndo(currentSprintObj.tanggalMulaiRencana)} – {formatDateIndo(currentSprintObj.tanggalSelesaiRencana)}
                  </span>
                )}
                {currentSprintObj.tanggalMulaiAktual && (
                  <span className="text-[11px] text-emerald-700 font-medium">
                    &bull; Dimulai: {formatDateIndo(currentSprintObj.tanggalMulaiAktual)}
                  </span>
                )}
              </div>
            </div>

            {/* Sprint Action Controls */}
            {canEdit && (
              <div className="flex items-center gap-2">
                {currentSprintObj.status === "belum_dimulai" && (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleStartSprint(currentSprintObj.id)}
                    className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 px-4 h-9 shadow-sm"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                    <span>Mulai Sprint</span>
                  </Button>
                )}

                {currentSprintObj.status === "aktif" && (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={handleOpenCompleteDialog}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 px-4 h-9 shadow-sm"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>Selesaikan Sprint</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Inbox className="h-4 w-4 text-slate-600" />
                Area Backlog Tim
              </h2>
              <p className="text-xs text-gray-500">
                Daftar kartu kerja yang belum di-assign ke Sprint manapun.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "board"
                  ? "bg-white text-[#0F5132] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              <span>Board View</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "timeline"
                  ? "bg-white text-[#0F5132] shadow-xs"
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
            className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 font-semibold focus:ring-1 focus:ring-[#0F5132]"
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
          <Button
            onClick={() => {
              setTargetColumn("To Do");
              setTargetSprintForNewCard(
                currentSprintObj ? currentSprintObj.nomorSprint : null
              );
              setIsNewCardOpen(true);
            }}
            variant="default"
            size="sm"
            className="text-xs gap-1.5 font-bold bg-[#0F5132] hover:bg-[#1B7A4D] text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kartu Task</span>
          </Button>
        )}
      </div>

      {/* View Mode 1: Board Columns with Backlog Column & Drag & Drop */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {/* 1. Kolom Khusus Backlog */}
              <KanbanColumnDroppable
                columnId="column-backlog"
                columnTitle="Backlog"
                isBacklogArea={true}
                cards={backlogCards}
                columns={columns}
                sprints={sprints}
                onAddCard={() => {
                  setTargetColumn("To Do");
                  setTargetSprintForNewCard(null);
                  setIsNewCardOpen(true);
                }}
                onMoveCard={handleMoveCardDropdown}
                onAssignSprint={handleAssignSprint}
                onSelectCard={handleOpenCardDetail}
              />

              {/* 2-5. Kolom Kerja Sprint (To Do, In Progress, Review, Done) */}
              {columns.map((col) => {
                const colCards = activeSprintCards.filter(
                  (c) => c.statusKolom === col.namaKolom
                );

                return (
                  <KanbanColumnDroppable
                    key={col.id || col.namaKolom}
                    columnId={col.namaKolom}
                    columnTitle={col.namaKolom}
                    isBacklogArea={false}
                    cards={colCards}
                    columns={columns}
                    sprints={sprints}
                    onAddCard={(colName) => {
                      setTargetColumn(colName);
                      setTargetSprintForNewCard(
                        currentSprintObj ? currentSprintObj.nomorSprint : null
                      );
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
            <div className="rounded-2xl p-3.5 border bg-slate-50/90 border-slate-200 min-h-[360px] animate-pulse" />
            {columns.map((col) => (
              <div
                key={col.id || col.namaKolom}
                className="rounded-2xl p-3.5 border bg-gray-50/80 border-gray-200 min-h-[360px] animate-pulse"
              />
            ))}
          </div>
        )
      )}

      {/* View Mode 2: Timeline Roadmap with 2-segment Overdue Visualization */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-gray-900">
              Timeline & Roadmap Visualisasi Keterlambatan
            </h3>
            <p className="text-xs text-gray-500">
              Visualisasi jadwal rencana dan segmen merah otomatis untuk kartu kerja yang melewati batas waktu.
            </p>
          </div>

          <div className="space-y-4">
            {filteredCards.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">
                Belum ada kartu kerja untuk filter ini.
              </p>
            ) : (
              filteredCards.map((c) => {
                const now = new Date();
                const isDone = c.statusKolom === "Done";
                const isOverdue =
                  Boolean(c.tanggalSelesai) &&
                  new Date(c.tanggalSelesai) < now &&
                  !isDone;

                const overdueDays = isOverdue
                  ? Math.ceil(
                      (now.getTime() - new Date(c.tanggalSelesai).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleOpenCardDetail(c)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isOverdue
                        ? "border-red-300 bg-red-50/30 hover:border-red-400"
                        : "border-gray-100 bg-gray-50/60 hover:border-[#0F5132]/60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">
                          {c.judul}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {c.statusKolom}
                        </Badge>
                        {c.sprintNumber ? (
                          <Badge variant="secondary" className="text-[9px]">
                            Sprint {c.sprintNumber}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-slate-500">
                            Backlog
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                        <span>
                          {c.tanggalMulai
                            ? formatDateIndo(c.tanggalMulai)
                            : "Start -"}{" "}
                          s/d{" "}
                          {c.tanggalSelesai
                            ? formatDateIndo(c.tanggalSelesai)
                            : "End -"}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Segment Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden flex items-center">
                        {/* Normal Planned Segment */}
                        <div className="h-3 bg-[#0F5132] rounded-l-full w-2/3" />

                        {/* Overdue Red Extended Segment */}
                        {isOverdue && (
                          <div className="h-3 bg-red-500 rounded-r-full w-1/3 animate-pulse relative">
                            {/* Thin vertical marker */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white shadow-xs" />
                          </div>
                        )}
                      </div>

                      {isOverdue && (
                        <div className="flex items-center justify-between text-[10px] text-red-700 font-bold pt-0.5">
                          <span>Target Rencana: {formatDateIndo(c.tanggalSelesai)}</span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Molor {overdueDays} hari dari jadwal
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Modal / Dialog Detail Kartu Lengkap (View & Edit) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedCardForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardForDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-4">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <KanbanIcon className="h-4 w-4 text-[#0F5132]" />
                Detail & Sunting Kartu Task
              </DialogTitle>
              {selectedCardForDetail?.sprintNumber ? (
                <Badge variant="secondary" className="text-[10px]">
                  Sprint {selectedCardForDetail.sprintNumber}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-slate-500">
                  📦 Backlog
                </Badge>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveCardDetail} className="space-y-4 py-2 text-xs">
            {/* Judul */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Judul Kartu / Task *
              </label>
              <Input
                value={detailJudul}
                disabled={!canEdit}
                onChange={(e) => setDetailJudul(e.target.value)}
                required
                className="text-xs font-semibold"
              />
            </div>

            {/* Deskripsi Lengkap */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Deskripsi Lengkap
              </label>
              <Textarea
                rows={5}
                value={detailDeskripsi}
                disabled={!canEdit}
                placeholder="Rincian lengkap aktivitas, acceptance criteria, atau langkah implementasi..."
                onChange={(e) => setDetailDeskripsi(e.target.value)}
                className="text-xs leading-relaxed font-normal"
              />
            </div>

            {/* Grid 1: Tahap Inkubasi & Penugasan Sprint */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Tahap Inkubasi
                </label>
                <select
                  value={detailTahap}
                  disabled={!canEdit}
                  onChange={(e) => setDetailTahap(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700"
                >
                  <option value="innovation_setup">Innovation Setup</option>
                  <option value="customer_validation">Customer Validation</option>
                  <option value="market_validation">Market Validation</option>
                  <option value="umum">Umum</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Penugasan Sprint
                </label>
                <select
                  value={detailSprintNumber === null ? "backlog" : String(detailSprintNumber)}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const val = e.target.value === "backlog" ? null : parseInt(e.target.value);
                    setDetailSprintNumber(val);
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
            </div>

            {/* Grid 2: Status Kolom & PIC Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Status Kolom
                </label>
                <select
                  value={detailStatusKolom}
                  disabled={!canEdit}
                  onChange={(e) => setDetailStatusKolom(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700 font-semibold"
                >
                  {columns.map((c) => (
                    <option key={c.namaKolom} value={c.namaKolom}>
                      {c.namaKolom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Owner / PIC Anggota Tim
                </label>
                <select
                  value={detailOwnerAnggotaId || ""}
                  disabled={!canEdit}
                  onChange={(e) => setDetailOwnerAnggotaId(e.target.value || null)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-md p-2 text-gray-700"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {anggotaTim.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama} ({a.jabatan || a.unitKerja || "Anggota"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Label / Tag */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Label / Tag
              </label>
              <Input
                placeholder="Draf Roadmap, Template Baku CV, MVP, SME, dll"
                value={detailLabel}
                disabled={!canEdit}
                onChange={(e) => setDetailLabel(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Dates: Mulai & Selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={detailTanggalMulai}
                  disabled={!canEdit}
                  onChange={(e) => setDetailTanggalMulai(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Target Selesai
                </label>
                <Input
                  type="date"
                  value={detailTanggalSelesai}
                  disabled={!canEdit}
                  onChange={(e) => setDetailTanggalSelesai(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Acceptance Criteria / Tolok Ukur Keberhasilan
              </label>
              <Textarea
                rows={2}
                value={detailAcceptanceCriteria}
                disabled={!canEdit}
                placeholder="Kriteria task dianggap tuntas..."
                onChange={(e) => setDetailAcceptanceCriteria(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Dependency & Risiko */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Ketergantungan / Risiko
              </label>
              <Textarea
                rows={2}
                value={detailDependencyRisiko}
                disabled={!canEdit}
                placeholder="Ketergantungan terhadap divisi lain, SME, akses sistem..."
                onChange={(e) => setDetailDependencyRisiko(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* Section 1: Lampiran File (Upload & Dari Proposal) */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-[#0F5132]" />
                  <span>Lampiran File</span>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {attachments.length}
                    </Badge>
                  )}
                </label>
              </div>

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
                      ? "border-[#0F5132] bg-[#0F5132]/5"
                      : "border-gray-200 hover:border-[#0F5132]/60 hover:bg-gray-50/80"
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
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0F5132]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengunggah lampiran file...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <UploadCloud className="h-4 w-4 text-[#0F5132]" />
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
                <div className="flex items-center justify-center py-3 text-xs text-gray-400 gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0F5132]" />
                  <span>Memuat daftar lampiran...</span>
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic py-1">
                  Belum ada lampiran file pada kartu ini.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {attachments.map((att) => {
                    const isProposal = att.source === "proposal_dossier";
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-gray-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(att.fileName, att.fileType)}
                          <div className="min-w-0 flex-1">
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-gray-800 hover:text-[#0F5132] hover:underline truncate block"
                              title={att.fileName}
                            >
                              {att.fileName}
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>{formatFileSize(att.fileSize)}</span>
                              {isProposal && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
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
                            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200/60 transition-colors"
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

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* Section 2: Tautan Terkait (External Web Links) */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-[#0F5132]" />
                  <span>Tautan Terkait</span>
                  {links.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {links.length}
                    </Badge>
                  )}
                </label>
              </div>

              {canEdit && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-gray-50/80 p-2 rounded-xl border border-gray-200">
                  <Input
                    placeholder="https://drive.google.com/... atau https://youtube.com/..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="text-xs bg-white h-8 flex-1"
                  />
                  <Input
                    placeholder="Label (opsional)"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    className="text-xs bg-white h-8 sm:w-40"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={addingLink || !newLinkUrl.trim()}
                    onClick={handleAddLink}
                    className="text-xs h-8 px-3 bg-[#0F5132] hover:bg-[#1B7A4D] text-white shrink-0 font-semibold gap-1"
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
                <div className="flex items-center justify-center py-3 text-xs text-gray-400 gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0F5132]" />
                  <span>Memuat daftar tautan...</span>
                </div>
              ) : links.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic py-1">
                  Belum ada tautan terkait pada kartu ini.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-gray-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getDomainIcon(link.url)}
                        <div className="min-w-0 flex-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-gray-800 hover:text-[#0F5132] hover:underline truncate block"
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
                          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200/60 transition-colors"
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

            <DialogFooter className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-100">
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletingCard || savingDetailCard}
                  onClick={handleDeleteCard}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                >
                  {deletingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  <span>Hapus Kartu</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCardForDetail(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>
                {canEdit && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingDetailCard || !detailJudul.trim()}
                    className="text-xs bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold gap-1.5 shadow-sm"
                  >
                    {savingDetailCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>Simpan Perubahan</span>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Modal / Dialog Tambah Kartu Baru */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isNewCardOpen} onOpenChange={setIsNewCardOpen}>
        <DialogContent className="sm:max-w-md">
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
      {/* Dialog Selesaikan Sprint (Penyelesaian Task Belum Selesai) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Selesaikan Sprint {currentSprintObj?.nomorSprint}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {incompleteCardsInCurrentSprint.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <p className="font-bold">🎉 Luar Biasa!</p>
                <p className="text-[11px] text-emerald-800">
                  Semua kartu kerja pada Sprint {currentSprintObj?.nomorSprint} telah berstatus <strong>Done</strong>. Anda dapat langsung menyelesaikan sprint ini.
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

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {incompleteCardsInCurrentSprint.map((card) => (
                    <div
                      key={card.id}
                      className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="font-bold text-gray-900 truncate">{card.judul}</p>
                        <span className="text-[10px] text-gray-400">
                          Status saat ini: {card.statusKolom}
                        </span>
                      </div>

                      <select
                        className="text-xs bg-white border border-gray-200 rounded-lg p-1.5 font-semibold text-gray-700 shrink-0"
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
          </div>

          <DialogFooter className="pt-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Konfirmasi Selesaikan Sprint</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* Dialog Kelola Jumlah Sprint */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={isSprintCountModalOpen} onOpenChange={setIsSprintCountModalOpen}>
        <DialogContent className="sm:max-w-md">
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
    </div>
  );
}
