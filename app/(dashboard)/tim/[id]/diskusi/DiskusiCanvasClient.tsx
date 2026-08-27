'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createDiskusiStickyNoteAction,
  createDiskusiPinAction,
  updateDiskusiNoteContentAction,
  updateDiskusiNotePositionAction,
  deleteDiskusiNoteAction,
  createDiskusiFrameAction,
  updateDiskusiFrameAction,
  deleteDiskusiFrameAction,
  assignStickyToCardSubtaskAction,
  compileFrameNotesAction,
  markNotesConvertedToCardAction,
  addDiskusiDocumentAction,
  deleteDiskusiDocumentAction,
} from '@/app/actions/diskusi';

import {
  createKanbanCardAction,
  updateKanbanCardSprintAction,
  getTaskSubtasksAction,
  createTaskSubtaskAction,
  toggleTaskSubtaskAction,
  deleteTaskSubtaskAction,
  updateTaskSubtaskTitleAction,
  updateTaskSubtaskHoursAction,
  getTaskCommentsAction,
  createTaskCommentAction,
  getTaskAttachmentsAction,
  addTaskAttachmentAction,
  deleteTaskAttachmentAction,
} from '@/app/actions/kanban';
import { toast } from '@/components/ui/ToastProvider';
import { detectCvBakuCardType } from '@/lib/utils/cv-cards';
import { isMvMandatoryCard } from '@/lib/utils/mv-cards';
import Link from 'next/link';
import {
  StickyNote,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Pin,
  FileText,
  Upload,
  Download,
  ExternalLink,
  X,
  Layers,
  ChevronRight,
  ChevronLeft,
  Users,
  Eye,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  Paperclip,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Zap,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  PEGADAIAN_HEADER_GRADIENT_STYLE,
  PHASE_TOKENS,
  getPhaseTokenBySlug,
} from '@/lib/theme/tokens';
import type { CompiledBacklogDraft } from '@/lib/ai/diskusi-compiler';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type DiskusiNoteItem = {
  id: string;
  boardId: string;
  type: string; // 'sticky' | 'pin'
  content: string | null;
  kanbanCardId: string | null;
  posX: number;
  posY: number;
  color: string;
  frameId: string | null;
  convertedToSubtaskId: string | null;
  convertedToCardId: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  cardJudul?: string | null;
  cardStoryPoint?: number | null;
  cardTahap?: string | null;
  cardLabel?: string | null;
  cardReviewStatus?: string | null;
};

export type DiskusiFrameItem = {
  id: string;
  boardId: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  color: string;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DiskusiDocumentItem = {
  id: string;
  boardId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  source: string; // 'proposal_dossier' | 'upload'
  uploadedBy: string | null;
  uploadedAt: Date | string;
};

export type KanbanCardItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  acceptanceCriteria: string | null;
  storyPoint: number | null;
  tahap: string;
  label: string | null;
  reviewStatus: string | null;
  statusKolom: string;
  sprintNumber: number | null;
  suggestedSprintNumber: number | null;
};

type PresenceUser = {
  clientId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  focusedNoteId?: string | null;
};

type CurrentUser = {
  id: string;
  nama: string;
  email: string;
  avatarUrl: string | null;
};

const PRESENCE_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function colorForUser(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

const PASTEL_COLORS = [
  '#FEF3C7', // Amber / Yellow
  '#DBEAFE', // Blue
  '#D1FAE5', // Emerald / Green
  '#FCE7F3', // Pink
  '#EDE9FE', // Violet / Purple
  '#FEE2E2', // Rose / Red
  '#E0F2FE', // Sky
  '#FFEDD5', // Orange
];

function getRandomPastelColor(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function DiskusiCanvasClient({
  timId,
  canvasId,
  timNama,
  canvasJudul,
  currentUser,
  initialData,
  isCvUnlocked = false,
  isMvUnlocked = false,
}: {
  timId: string;
  canvasId?: string;
  timNama: string;
  canvasJudul?: string;
  currentUser: CurrentUser;
  initialData: {
    canvas?: any;
    board: any;
    notes: DiskusiNoteItem[];
    frames: DiskusiFrameItem[];
    documents: DiskusiDocumentItem[];
    cards: KanbanCardItem[];
  };
  isCvUnlocked?: boolean;
  isMvUnlocked?: boolean;
}) {
  // Helper: check if a card's phase is locked
  const isPhaseLocked = (card: KanbanCardItem): boolean => {
    if (card.tahap === 'customer_validation' && !isCvUnlocked) return true;
    if (card.tahap === 'market_validation' && !isMvUnlocked) return true;
    return false;
  };
  const [clientId] = useState(() => 'tab-' + Math.random().toString(36).slice(2, 8));
  const [notes, setNotes] = useState<DiskusiNoteItem[]>(initialData.notes);
  const [frames, setFrames] = useState<DiskusiFrameItem[]>(initialData.frames);
  const [documents, setDocuments] = useState<DiskusiDocumentItem[]>(initialData.documents);
  const [cards, setCards] = useState<KanbanCardItem[]>(initialData.cards);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});

  // Layout & View states
  const [sidebarOpen, setSidebarOpen] = useState(false); // DEFAULT: Collapsed
  const [zoom, setZoom] = useState<number>(100); // DEFAULT: 100% (Range 25% - 200%)
  const [previewDoc, setPreviewDoc] = useState<DiskusiDocumentItem | null>(null);
  const [tahapFilter, setTahapFilter] = useState<string>('all');
  const [sidebarTab, setSidebarTab] = useState<'referensi' | 'dokumen'>('referensi');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(200, Math.round((prev + 15) / 5) * 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(25, Math.round((prev - 15) / 5) * 5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(100);
  }, []);

  // Kartu yang berstatus Pin di kanvas aktif saat ini (untuk target subtask picker)
  const pinnedCards = useMemo(() => {
    const pinNotes = notes.filter((n) => n.type === 'pin' && n.kanbanCardId);
    const list: Array<{ id: string; judul: string; storyPoint: number; label: string }> = [];
    const seenIds = new Set<string>();

    for (const pn of pinNotes) {
      if (!pn.kanbanCardId || seenIds.has(pn.kanbanCardId)) continue;
      seenIds.add(pn.kanbanCardId);
      const fullCard = cards.find((c) => c.id === pn.kanbanCardId);
      list.push({
        id: pn.kanbanCardId,
        judul: fullCard?.judul || pn.cardJudul || 'Kartu Referensi',
        storyPoint: fullCard?.storyPoint || pn.cardStoryPoint || 3,
        label: fullCard?.label || pn.cardLabel || 'Referensi',
      });
    }
    return list;
  }, [notes, cards]);

  // Wheel & Trackpad Pinch-to-Zoom Listener
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 5 : -5;
        setZoom((prev) => Math.min(200, Math.max(25, prev + zoomDelta)));
      }
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Card Detail Modal state
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<KanbanCardItem | null>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // AI Compilation Modal state
  const [compilingFrameId, setCompilingFrameId] = useState<string | null>(null);
  const [compiledModalOpen, setCompiledModalOpen] = useState(false);
  const [compiledDraft, setCompiledDraft] = useState<CompiledBacklogDraft | null>(null);
  const [compiledSourceNoteIds, setCompiledSourceNoteIds] = useState<string[]>([]);
  const [savingCompiledCard, setSavingCompiledCard] = useState(false);

  // Supabase Realtime Setup
  const supabase = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);
  const myColor = colorForUser(clientId);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── Realtime Channel & Presence (Scoped per Canvas) ────────────────────────
  useEffect(() => {
    const channelName = canvasId ? `diskusi_presence_${canvasId}` : `diskusi-board-${timId}`;
    const channel = supabase.current.channel(channelName, {
      config: { presence: { key: clientId } },
    });
    channelRef.current = channel;

    const noteFilter = canvasId ? `canvas_id=eq.${canvasId}` : `board_id=eq.${initialData.board.id}`;
    const frameFilter = canvasId ? `canvas_id=eq.${canvasId}` : `board_id=eq.${initialData.board.id}`;

    // 1. Postgres Changes — Notes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'diskusi_note', filter: noteFilter },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (eventType === 'INSERT') {
          // If note is a pin, attach card details
          const cardInfo = cards.find((c) => c.id === newRow.kanban_card_id);
          const fullNote: DiskusiNoteItem = {
            id: newRow.id,
            boardId: newRow.board_id,
            type: newRow.type,
            content: newRow.content,
            kanbanCardId: newRow.kanban_card_id,
            posX: newRow.pos_x,
            posY: newRow.pos_y,
            color: newRow.color,
            frameId: newRow.frame_id,
            convertedToSubtaskId: newRow.converted_to_subtask_id,
            convertedToCardId: newRow.converted_to_card_id,
            createdBy: newRow.created_by,
            createdByName: newRow.created_by_name,
            createdAt: newRow.created_at,
            updatedAt: newRow.updated_at,
            cardJudul: cardInfo?.judul ?? null,
            cardStoryPoint: cardInfo?.storyPoint ?? null,
            cardTahap: cardInfo?.tahap ?? null,
            cardLabel: cardInfo?.label ?? null,
            cardReviewStatus: cardInfo?.reviewStatus ?? null,
          };
          setNotes((prev) => {
            if (prev.some((n) => n.id === fullNote.id)) return prev;
            return [...prev, fullNote];
          });
        } else if (eventType === 'UPDATE') {
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== newRow.id) return n;
              return {
                ...n,
                content: newRow.content,
                posX: newRow.pos_x,
                posY: newRow.pos_y,
                color: newRow.color,
                frameId: newRow.frame_id,
                convertedToSubtaskId: newRow.converted_to_subtask_id,
                convertedToCardId: newRow.converted_to_card_id,
                updatedAt: newRow.updated_at,
              };
            })
          );
        } else if (eventType === 'DELETE') {
          setNotes((prev) => prev.filter((n) => n.id !== oldRow.id));
        }
      }
    );

    // 2. Postgres Changes — Frames
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'diskusi_frame', filter: frameFilter },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (eventType === 'INSERT') {
          const fullFrame: DiskusiFrameItem = {
            id: newRow.id,
            boardId: newRow.board_id,
            label: newRow.label,
            posX: newRow.pos_x,
            posY: newRow.pos_y,
            width: newRow.width,
            height: newRow.height,
            color: newRow.color,
            createdBy: newRow.created_by,
            createdAt: newRow.created_at,
            updatedAt: newRow.updated_at,
          };
          setFrames((prev) => {
            if (prev.some((f) => f.id === fullFrame.id)) return prev;
            return [...prev, fullFrame];
          });
        } else if (eventType === 'UPDATE') {
          setFrames((prev) =>
            prev.map((f) => {
              if (f.id !== newRow.id) return f;
              return {
                ...f,
                label: newRow.label,
                posX: newRow.pos_x,
                posY: newRow.pos_y,
                width: newRow.width,
                height: newRow.height,
                color: newRow.color,
                updatedAt: newRow.updated_at,
              };
            })
          );
        } else if (eventType === 'DELETE') {
          setFrames((prev) => prev.filter((f) => f.id !== oldRow.id));
        }
      }
    );

    // 3. Presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>();
      const usersMap: Record<string, PresenceUser> = {};
      for (const [key, presences] of Object.entries(state)) {
        const p = (presences as unknown as PresenceUser[])[0];
        if (p) usersMap[key] = p;
      }
      setOnlineUsers(usersMap);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const p = (newPresences as unknown as PresenceUser[])[0];
      if (p) setOnlineUsers((prev) => ({ ...prev, [key]: p }));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          clientId,
          userId: currentUser.id,
          name: currentUser.nama,
          avatarUrl: currentUser.avatarUrl,
          color: myColor,
          focusedNoteId: null,
        } satisfies PresenceUser);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [timId, initialData.board.id, clientId, currentUser, myColor, cards]);

  const updatePresenceFocus = useCallback(
    (noteId: string | null) => {
      channelRef.current?.track({
        clientId,
        userId: currentUser.id,
        name: currentUser.nama,
        avatarUrl: currentUser.avatarUrl,
        color: myColor,
        focusedNoteId: noteId,
      });
    },
    [currentUser, myColor, clientId]
  );

  // ─── Actions: Add Sticky Note ──────────────────────────────────────────────
  const handleAddSticky = async (e?: React.MouseEvent) => {
    let posX = 120 + Math.random() * 80;
    let posY = 100 + Math.random() * 60;

    if (e && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = (zoom || 100) / 100;
      const scrollLeft = canvasRef.current.scrollLeft || 0;
      const scrollTop = canvasRef.current.scrollTop || 0;
      posX = Math.max(20, Math.round((e.clientX - rect.left + scrollLeft) / scale - 96));
      posY = Math.max(20, Math.round((e.clientY - rect.top + scrollTop) / scale - 60));
    }

    const res = await createDiskusiStickyNoteAction({
      boardId: initialData.board.id,
      canvasId,
      timId,
      content: 'Catatan ide baru...',
      posX,
      posY,
      color: getRandomPastelColor(),
    });

    if (res.success && res.data) {
      const newNote = res.data as DiskusiNoteItem;
      setNotes((prev) => {
        if (prev.some((n) => n.id === newNote.id)) return prev;
        return [...prev, newNote];
      });
      toast.success('Sticky note berhasil ditambahkan');
    } else {
      toast.error(res.error || 'Gagal membuat sticky note');
    }
  };

  // ─── Actions: Add Frame (Kelompok Ide) ───────────────────────────────────────
  const handleAddFrame = async () => {
    const posX = 80 + Math.random() * 100;
    const posY = 80 + Math.random() * 80;

    const res = await createDiskusiFrameAction({
      boardId: initialData.board.id,
      canvasId,
      timId,
      label: `Kelompok Ide #${frames.length + 1}`,
      posX,
      posY,
      width: 360,
      height: 300,
    });

    if (res.success && res.data) {
      const newFrame = res.data as DiskusiFrameItem;
      setFrames((prev) => [...prev, newFrame]);
      toast.success('Kelompok ide baru dibuat');
    } else {
      toast.error(res.error || 'Gagal membuat kelompok ide');
    }
  };

  // ─── Actions: Pin Card from Reference List ──────────────────────────────────
  const handlePinCardToCanvas = async (cardId: string, posX = 200, posY = 150) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    if (notes.some((n) => n.kanbanCardId === cardId)) {
      toast.error('Kartu ini sudah disematkan di kanvas.', 'Sudah Ada');
      return;
    }

    const res = await createDiskusiPinAction({
      boardId: initialData.board.id,
      canvasId,
      timId,
      cardId,
      posX,
      posY,
    });

    if (res.success && res.data) {
      const newPin: DiskusiNoteItem = {
        ...res.data,
        cardJudul: card.judul,
        cardStoryPoint: card.storyPoint,
        cardTahap: card.tahap,
        cardLabel: card.label,
        cardReviewStatus: card.reviewStatus,
      };
      setNotes((prev) => [...prev, newPin]);
      toast.success(`Kartu "${card.judul.substring(0, 30)}..." disematkan ke kanvas.`);
    } else {
      toast.error(res.error || 'Gagal menyematkan kartu');
    }
  };

  // ─── Drag-and-Drop Collision: Sticky to Pin ────────────────────────────────
  const checkStickyToPinCollision = async (movedSticky: DiskusiNoteItem, targetX: number, targetY: number) => {
    const stickyW = 192; // 48 tailwind
    const stickyH = 130;

    const pinNotes = notes.filter((n) => n.type === 'pin' && n.id !== movedSticky.id);

    for (const pin of pinNotes) {
      const pinX = pin.posX;
      const pinY = pin.posY;
      const pinW = 220;
      const pinH = 100;

      // Overlap check
      const isOverlap =
        targetX < pinX + pinW &&
        targetX + stickyW > pinX &&
        targetY < pinY + pinH &&
        targetY + stickyH > pinY;

      if (isOverlap && pin.kanbanCardId && !movedSticky.convertedToSubtaskId) {
        // Validate placeholder
        const PLACEHOLDERS = ['Catatan ide baru...', 'Ide / catatan baru...', 'Ketik di sini...', 'Kosong', ''];
        const trimmed = movedSticky.content?.trim() || '';
        if (!trimmed || PLACEHOLDERS.includes(trimmed)) {
          toast.error('Isi sticky note ini dulu sebelum dijadikan subtask.', 'Sticky Kosong');
          break;
        }

        // Trigger Mechanism 1: Drag sticky to pin
        const res = await assignStickyToCardSubtaskAction({
          noteId: movedSticky.id,
          cardId: pin.kanbanCardId,
          timId,
        });

        if (res.success && res.data) {
          setNotes((prev) =>
            prev.map((n) => (n.id === movedSticky.id ? { ...n, convertedToSubtaskId: res.data.subtask.id } : n))
          );
          toast.success(
            `Sticky berhasil diubah jadi subtask pada kartu "${res.data.cardTitle?.substring(0, 30)}..."`,
            '✓ Jadi Subtask'
          );
        }
        break;
      }
    }
  };

  // ─── Mechanism 2: Convert via Button -> Pick Card ──────────────────────────
  const handleConvertStickyToSubtask = async (noteId: string, targetCardId: string) => {
    const note = notes.find((n) => n.id === noteId);
    const PLACEHOLDERS = ['Catatan ide baru...', 'Ide / catatan baru...', 'Ketik di sini...', 'Kosong', ''];
    const trimmed = note?.content?.trim() || '';
    if (!trimmed || PLACEHOLDERS.includes(trimmed)) {
      toast.error('Isi sticky note ini dulu sebelum dijadikan subtask.', 'Sticky Kosong');
      return;
    }

    const res = await assignStickyToCardSubtaskAction({
      noteId,
      cardId: targetCardId,
      timId,
    });

    if (res.success && res.data) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, convertedToSubtaskId: res.data.subtask.id } : n))
      );
      toast.success(
        `Berhasil dijadikan subtask pada kartu "${res.data.cardTitle?.substring(0, 30)}..."`,
        '✓ Jadi Subtask'
      );
    } else {
      toast.error(res.error || 'Gagal menjadikan subtask');
    }
  };

  // ─── Mechanism 3: AI Compilation from Frame ────────────────────────────────
  const handleCompileFrame = async (frameId: string) => {
    setCompilingFrameId(frameId);
    try {
      const res = await compileFrameNotesAction({ frameId, timId });
      if (res.success && res.data) {
        setCompiledDraft(res.data.draft);
        setCompiledSourceNoteIds(res.data.sourceNoteIds);
        setCompiledModalOpen(true);
      } else {
        toast.error(res.error || 'Gagal mengompilasi ide frame');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memanggil AI');
    } finally {
      setCompilingFrameId(null);
    }
  };

  const handleSaveCompiledCard = async (targetSprintNumber: number | null = null) => {
    if (!compiledDraft || !compiledDraft.judul.trim()) return;
    setSavingCompiledCard(true);

    try {
      // 1. Create the new Kanban Card (timId first, cardData second)
      const res = await createKanbanCardAction(timId, {
        timInovatorId: timId,
        judul: compiledDraft.judul.trim(),
        deskripsi: compiledDraft.deskripsi,
        acceptanceCriteria: compiledDraft.acceptanceCriteria,
        storyPoint: compiledDraft.storyPoint || 3,
        statusKolom: targetSprintNumber ? 'To Do' : 'To Do',
        sprintNumber: targetSprintNumber,
        reviewStatus: 'adopted',
        tahap: compiledDraft.tahap,
        label: 'Hasil Kompilasi Diskusi',
        suggestedSprintNumber: targetSprintNumber || 1,
        _initialSubtasks: compiledDraft.subtasks,
      } as any);

      if (res.success && res.data) {
        const createdCard = res.data;
        // 2. Mark source notes as converted
        await markNotesConvertedToCardAction({
          noteIds: compiledSourceNoteIds,
          cardId: createdCard.id,
          timId,
        });

        // Update local notes state
        setNotes((prev) =>
          prev.map((n) => (compiledSourceNoteIds.includes(n.id) ? { ...n, convertedToCardId: createdCard.id } : n))
        );

        // Add to local cards
        setCards((prev) => [
          ...prev,
          {
            id: createdCard.id,
            judul: createdCard.judul,
            deskripsi: createdCard.deskripsi,
            acceptanceCriteria: createdCard.acceptanceCriteria,
            storyPoint: createdCard.storyPoint,
            tahap: createdCard.tahap,
            label: createdCard.label,
            reviewStatus: createdCard.reviewStatus,
            statusKolom: createdCard.statusKolom,
            sprintNumber: createdCard.sprintNumber,
            suggestedSprintNumber: createdCard.suggestedSprintNumber,
          },
        ]);

        setCompiledModalOpen(false);
        setCompiledDraft(null);
        setCompiledSourceNoteIds([]);
        toast.success(
          targetSprintNumber
            ? `Kartu "${createdCard.judul.substring(0, 35)}..." berhasil dibuat & di-assign ke Sprint ${targetSprintNumber}!`
            : `Kartu Backlog "${createdCard.judul.substring(0, 35)}..." berhasil disimpan ke Backlog Kerja!`,
          'Kompilasi Sukses'
        );
      } else {
        toast.error(res.error || 'Gagal menyimpan kartu backlog baru');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kartu');
    } finally {
      setSavingCompiledCard(false);
    }
  };

  // ─── Modal Detail Card Subtasks & Comments ─────────────────────────────────
  // Subtask Edit Inline State
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskField, setEditingSubtaskField] = useState<'title' | 'hours' | null>(null);
  const [editTitleDraft, setEditTitleDraft] = useState('');
  const [editHoursDraft, setEditHoursDraft] = useState<number | ''>('');
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);

  const handleStartEditTitle = (st: any) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskField('title');
    setEditTitleDraft(st.title);
  };

  const handleStartEditHours = (st: any) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskField('hours');
    setEditHoursDraft(st.estimatedHours ?? '');
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskField(null);
    setEditTitleDraft('');
    setEditHoursDraft('');
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    const trimmed = editTitleDraft.trim();
    const original = subtasks.find((s) => s.id === subtaskId);
    if (!trimmed || !original || trimmed === original.title) {
      handleCancelEditSubtask();
      return;
    }
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, title: trimmed } : s)));
    handleCancelEditSubtask();
    const res = await updateTaskSubtaskTitleAction(subtaskId, timId, trimmed);
    if (!res.success) {
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, title: original.title } : s)));
      toast.error(res.error || 'Gagal memperbarui judul subtask.');
    }
  };

  const handleSaveSubtaskHours = async (subtaskId: string) => {
    const original = subtasks.find((s) => s.id === subtaskId);
    const newHours = editHoursDraft === '' ? null : Math.max(0, Number(editHoursDraft));
    const oldHours = original?.estimatedHours ?? null;
    if (newHours === oldHours) {
      handleCancelEditSubtask();
      return;
    }
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, estimatedHours: newHours } : s)));
    handleCancelEditSubtask();
    const res = await updateTaskSubtaskHoursAction(subtaskId, timId, newHours);
    if (!res.success) {
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, estimatedHours: oldHours } : s)));
      toast.error(res.error || 'Gagal memperbarui estimasi jam subtask.');
    }
  };

  const handleDeleteSubtaskInModal = async (subtaskId: string) => {
    setDeletingSubtaskId(subtaskId);
    const res = await deleteTaskSubtaskAction(subtaskId, timId);
    if (res.success) {
      setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
      toast.success('Subtask berhasil dihapus.');
    } else {
      toast.error(res.error || 'Gagal menghapus subtask.');
    }
    setDeletingSubtaskId(null);
  };

  const handleQuickAssignSprintInModal = async (cardId: string, sprintNum: number | null) => {
    setSelectedCardForDetail((prev) => (prev && prev.id === cardId ? { ...prev, sprintNumber: sprintNum } : prev));
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, sprintNumber: sprintNum } : c))
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

  // ─── Modal Detail Card Subtasks & Comments ─────────────────────────────────
  const openCardDetailModal = async (card: KanbanCardItem) => {
    setSelectedCardForDetail(card);
    setLoadingSubtasks(true);
    const [subtaskRes, commentRes] = await Promise.all([
      getTaskSubtasksAction(card.id),
      getTaskCommentsAction(card.id),
    ]);
    if (subtaskRes.success && subtaskRes.data) setSubtasks(subtaskRes.data);
    if (commentRes.success && commentRes.data) setComments(commentRes.data);
    setLoadingSubtasks(false);
  };

  const handleAddSubtaskInModal = async () => {
    if (!selectedCardForDetail || !newSubtaskTitle.trim()) return;
    const res = await createTaskSubtaskAction(selectedCardForDetail.id, timId, newSubtaskTitle.trim(), null);
    if (res.success && res.data) {
      setSubtasks((prev) => [...prev, res.data]);
      setNewSubtaskTitle('');
      toast.success('Subtask berhasil ditambahkan');
    } else {
      toast.error(res.error || 'Gagal menambah subtask');
    }
  };

  const handleToggleSubtaskInModal = async (stId: string, currentDone: boolean) => {
    const nextDone = !currentDone;
    setSubtasks((prev) => prev.map((s) => (s.id === stId ? { ...s, isDone: nextDone } : s)));
    await toggleTaskSubtaskAction(stId, timId, nextDone);
  };

  const handleSendCommentInModal = async () => {
    if (!selectedCardForDetail || !newCommentText.trim()) return;
    setSendingComment(true);
    const res = await createTaskCommentAction(selectedCardForDetail.id, timId, newCommentText.trim());
    if (res.success && res.data) {
      setComments((prev) => [...prev, res.data]);
      setNewCommentText('');
      toast.success('Komentar terkirim');
    } else {
      toast.error(res.error || 'Gagal mengirim komentar');
    }
    setSendingComment(false);
  };

  // ─── Reference Cards (Unified with Sprint Planning aiReferenceCards) ───────
  const referenceCards = useMemo(() => {
    return cards.filter((c) => c.reviewStatus === 'ai_reference');
  }, [cards]);

  const filteredReferenceCards = useMemo(() => {
    return referenceCards.filter((c) => {
      if (tahapFilter === 'all') return true;
      return c.tahap === tahapFilter;
    });
  }, [referenceCards, tahapFilter]);

  // ─── File Upload Handler ───────────────────────────────────────────────────
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('proposalId', initialData.board.id);
      uploadFormData.append('fileName', file.name);
      uploadFormData.append('file', file, file.name);

      const uploadRes = await fetch('/api/admin/import/upload-file', {
        method: 'POST',
        body: uploadFormData,
      });

      if (uploadRes.ok) {
        const json = await uploadRes.json();
        if (json.success && json.publicUrl) {
          const docRes = await addDiskusiDocumentAction({
            boardId: initialData.board.id,
            timId,
            fileName: file.name,
            fileUrl: json.publicUrl,
            fileType: file.type || 'application/pdf',
          });

          if (docRes.success && docRes.data) {
            setDocuments((prev) => [docRes.data as DiskusiDocumentItem, ...prev]);
            toast.success(`Dokumen "${file.name}" berhasil diunggah.`);
          }
        }
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah dokumen: ' + err.message);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[620px] bg-[#F8FAF9] font-sans overflow-hidden border border-gray-200/80 rounded-2xl shadow-xs">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* HEADER BAR */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-2.5 bg-white border-b border-[#C9E4D0] shadow-2xs z-30 gap-2">
        {/* Left: Back to Team Workspace, Title & Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href={`/tim/${timId}/diskusi`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#0F5132] hover:bg-[#146C43] shadow-xs transition-all border border-[#0B3D2E] cursor-pointer shrink-0"
            title="Kembali ke Daftar Kanvas Diskusi Tim"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>Daftar Kanvas</span>
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div className="flex items-center gap-2 max-w-[280px] sm:max-w-md">
            <div className="w-8 h-8 rounded-lg bg-[#0F5132] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-[#0B3D2E] leading-tight truncate" title={canvasJudul || initialData.canvas?.judul || 'Ruang Diskusi & Ideasi'}>
                {canvasJudul || initialData.canvas?.judul || 'Ruang Diskusi & Ideasi'}
              </h1>
              <p className="text-[11px] text-gray-500 font-medium truncate">{timNama}</p>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => handleAddSticky()}
              className="bg-[#0F5132] hover:bg-[#146C43] text-white text-xs font-bold gap-1.5 h-8 px-3 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Tambah Sticky</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddFrame}
              className="border-[#C9E4D0] hover:bg-[#F0F7F1] text-[#0B3D2E] text-xs font-bold gap-1.5 h-8 px-3 rounded-lg cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-[#3E9463]" />
              <span className="hidden sm:inline">+ Tambah Kelompok</span>
            </Button>
          </div>
        </div>

        {/* Right: Presence Avatars & Panel Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#F0F7F1] px-2.5 py-1 rounded-full border border-[#C9E4D0]">
            <span className="text-[10px] font-bold text-[#0B3D2E]">
              {Object.keys(onlineUsers).length} online:
            </span>
            <div className="flex items-center -space-x-1.5">
              {Object.values(onlineUsers).map((u) => (
                <div
                  key={u.clientId}
                  title={`${u.name} (${u.clientId})`}
                  style={{ backgroundColor: u.color }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-extrabold shadow-xs border border-white"
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" alt={u.name} />
                  ) : (
                    getInitials(u.name)
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Toggle Button for Backlog Referensi & Dokumen */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`border-[#C9E4D0] text-xs font-bold gap-1.5 h-8 px-2.5 rounded-lg cursor-pointer transition-all ${
              sidebarOpen
                ? 'bg-[#0F5132] text-white hover:bg-[#146C43]'
                : 'bg-white text-[#0B3D2E] hover:bg-[#F0F7F1]'
            }`}
            title={sidebarOpen ? 'Tutup Panel Referensi & Dokumen' : 'Buka Panel Referensi & Dokumen'}
          >
            {sidebarOpen ? (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tutup Panel</span>
              </>
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Panel Referensi ({referenceCards.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA: 2 COLUMNS (COLLAPSIBLE SIDEBAR) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* KOLOM 1: KANVAS KOLABORATIF (LEFT - MAXIMIZED WITH ZOOM SUPPORT) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          ref={canvasRef}
          onDoubleClick={(e) => {
            if (
              e.target === e.currentTarget ||
              (e.target as HTMLElement).classList.contains('canvas-surface') ||
              (e.target as HTMLElement).classList.contains('canvas-grid-bg')
            ) {
              handleAddSticky(e);
            }
          }}
          className="flex-1 relative overflow-auto select-none bg-[#FAFCFB] min-w-0"
        >
          {/* Transformable Canvas Surface */}
          <div
            className="canvas-surface relative min-w-[3600px] min-h-[2600px] origin-top-left transition-transform duration-75"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Dot Grid Background */}
            <div
              className="canvas-grid-bg absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #CBD5E1 1.2px, transparent 1.2px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* 1. Frames (Grouping Boxes) */}
            {frames.map((frame) => {
              const PLACEHOLDERS = ['Catatan ide baru...', 'Ide / catatan baru...', 'Ketik di sini...', 'Kosong', ''];
              const frameNotes = notes.filter((n) => {
                if (n.type !== 'sticky') return false;
                if (n.frameId === frame.id) return true;
                const noteCenterX = (n.posX || 0) + 96;
                const noteCenterY = (n.posY || 0) + 60;
                return (
                  noteCenterX >= frame.posX &&
                  noteCenterX <= frame.posX + frame.width &&
                  noteCenterY >= frame.posY &&
                  noteCenterY <= frame.posY + frame.height
                );
              });
              const validNotesCount = frameNotes.filter(
                (n) => n.content?.trim() && !PLACEHOLDERS.includes(n.content.trim())
              ).length;

              return (
                <FrameCard
                  key={frame.id}
                  frame={frame}
                  zoom={zoom}
                  noteCount={frameNotes.length}
                  validNotesCount={validNotesCount}
                  isCompiling={compilingFrameId === frame.id}
                  onUpdate={async (fId, label, x, y, w, h) => {
                    setFrames((prev) =>
                      prev.map((f) => (f.id === fId ? { ...f, label, posX: x, posY: y, width: w, height: h } : f))
                    );
                    setNotes((prev) =>
                      prev.map((n) => {
                        if (n.type !== 'sticky') return n;
                        const noteCenterX = (n.posX || 0) + 96;
                        const noteCenterY = (n.posY || 0) + 60;
                        const isInside =
                          noteCenterX >= x &&
                          noteCenterX <= x + w &&
                          noteCenterY >= y &&
                          noteCenterY <= y + h;
                        if (isInside) return { ...n, frameId: fId };
                        if (n.frameId === fId && !isInside) return { ...n, frameId: null };
                        return n;
                      })
                    );
                    await updateDiskusiFrameAction({ frameId: fId, label, posX: x, posY: y, width: w, height: h });
                  }}
                  onDelete={async (fId) => {
                    await deleteDiskusiFrameAction(fId, timId);
                    setFrames((prev) => prev.filter((f) => f.id !== fId));
                    toast.success('Kelompok ide dihapus');
                  }}
                  onCompile={() => handleCompileFrame(frame.id)}
                />
              );
            })}

            {/* 2. Notes (Sticky Notes & Pin Cards) */}
            {notes.map((note) => {
              if (note.type === 'pin') {
                const pinCard = cards.find((c) => c.id === note.kanbanCardId);
                const pinIsLocked = pinCard ? isPhaseLocked(pinCard) : false;
                return (
                  <PinCard
                    key={note.id}
                    note={note}
                    zoom={zoom}
                    isLocked={pinIsLocked}
                    presenceUsers={onlineUsers}
                    currentClientId={clientId}
                    onUpdatePosition={async (id, x, y) => {
                      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, posX: x, posY: y } : n)));
                      await updateDiskusiNotePositionAction({ noteId: id, posX: x, posY: y });
                    }}
                    onDelete={async (id) => {
                      await deleteDiskusiNoteAction(id, timId);
                      setNotes((prev) => prev.filter((n) => n.id !== id));
                      toast.success('Pin dilepas dari kanvas');
                    }}
                    onClickDetail={() => {
                      const card = cards.find((c) => c.id === note.kanbanCardId);
                      if (card) openCardDetailModal(card);
                    }}
                    onFocusEnter={() => updatePresenceFocus(note.id)}
                    onFocusLeave={() => updatePresenceFocus(null)}
                  />
                );
              }

              return (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  zoom={zoom}
                  pinnedCards={pinnedCards}
                  presenceUsers={onlineUsers}
                  currentClientId={clientId}
                  onUpdateContent={async (id, content) => {
                    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
                    await updateDiskusiNoteContentAction(id, content, timId);
                  }}
                  onUpdatePosition={async (id, x, y) => {
                    // Check frame overlap using center point
                    const noteCenterX = x + 96;
                    const noteCenterY = y + 60;
                    const matchedFrame = frames.find(
                      (f) =>
                        noteCenterX >= f.posX &&
                        noteCenterX <= f.posX + f.width &&
                        noteCenterY >= f.posY &&
                        noteCenterY <= f.posY + f.height
                    );
                    const newFrameId = matchedFrame ? matchedFrame.id : null;

                    // Optimistic update so noteCount and Kompilasi AI button activate instantly
                    setNotes((prev) =>
                      prev.map((n) => (n.id === id ? { ...n, posX: x, posY: y, frameId: newFrameId } : n))
                    );

                    await updateDiskusiNotePositionAction({
                      noteId: id,
                      posX: x,
                      posY: y,
                      frameId: newFrameId,
                    });
                    // Check collision with Pin
                    await checkStickyToPinCollision(note, x, y);
                  }}
                  onDelete={async (id) => {
                    await deleteDiskusiNoteAction(id, timId);
                    setNotes((prev) => prev.filter((n) => n.id !== id));
                    toast.success('Sticky note dihapus');
                  }}
                  onConvertToSubtask={(targetCardId) => handleConvertStickyToSubtask(note.id, targetCardId)}
                  onFocusEnter={() => updatePresenceFocus(note.id)}
                  onFocusLeave={() => updatePresenceFocus(null)}
                />
              );
            })}
          </div>

          {/* Floating Instruction Banner (Top Center) */}
          <p className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] text-gray-400 font-medium pointer-events-none select-none bg-white/80 px-3 py-1 rounded-full border border-gray-200/70 shadow-2xs backdrop-blur-xs z-10">
            💡 Double-click kanvas untuk tambah sticky • Ctrl+Scroll untuk zoom
          </p>

          {/* Floating Zoom Controls Widget (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-xl p-1.5 border border-[#C9E4D0] shadow-md select-none">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:bg-[#F0F7F1] hover:text-[#0F5132] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold cursor-pointer"
              title="Zoom Out (-15%)"
            >
              −
            </button>

            <button
              type="button"
              onClick={handleZoomReset}
              className="px-2 h-7 flex items-center justify-center rounded-lg text-xs font-extrabold text-[#0B3D2E] hover:bg-[#F0F7F1] transition-colors min-w-[50px] text-center cursor-pointer"
              title="Klik untuk Reset Zoom ke 100%"
            >
              {zoom}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:bg-[#F0F7F1] hover:text-[#0F5132] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold cursor-pointer"
              title="Zoom In (+15%)"
            >
              +
            </button>

            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            <button
              type="button"
              onClick={handleZoomReset}
              className="px-2 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold text-gray-600 hover:text-[#0F5132] hover:bg-[#F0F7F1] transition-colors cursor-pointer"
              title="Kembali ke ukuran 100%"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* KOLOM 2: PANEL SUMBER & REFERENSI (COLLAPSIBLE RIGHT SIDEBAR) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!sidebarOpen ? (
          /* COLLAPSED STRIP: Minimal vertical bar on the right */
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="w-10 bg-white border-l border-[#C9E4D0] hover:bg-[#F0F7F1] flex flex-col items-center justify-start py-4 gap-4 cursor-pointer transition-all z-20 shadow-2xs shrink-0 group select-none"
            title="Klik untuk membuka panel Backlog Referensi & Dokumen"
          >
            <div className="p-1.5 rounded-md bg-[#0F5132]/10 text-[#0F5132] group-hover:bg-[#0F5132] group-hover:text-white transition-colors shadow-2xs">
              <ChevronLeft className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <span className="text-[10px] font-extrabold text-[#0B3D2E] [writing-mode:vertical-rl] tracking-wider uppercase flex items-center gap-1.5 group-hover:text-[#0F5132]">
                <Pin className="h-3 w-3 rotate-90 text-[#3E9463]" />
                Referensi ({referenceCards.length})
              </span>
              <span className="text-[10px] font-bold text-gray-500 [writing-mode:vertical-rl] tracking-wider uppercase flex items-center gap-1.5 group-hover:text-[#0F5132]">
                <FolderOpen className="h-3 w-3 rotate-90" />
                Dokumen ({documents.length})
              </span>
            </div>
          </button>
        ) : (
          /* EXPANDED PANEL: Full width right sidebar */
          <div className="w-80 bg-white border-l border-[#C9E4D0] flex flex-col z-20 shadow-xs shrink-0">
            {/* Tab Selector with Close Button */}
            <div className="flex items-center border-b border-[#C9E4D0] bg-[#F0F7F1]/50 p-1.5 gap-1">
              <button
                onClick={() => setSidebarTab('referensi')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'referensi'
                    ? 'bg-[#0F5132] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
                <span>Backlog ({referenceCards.length})</span>
              </button>
              <button
                onClick={() => setSidebarTab('dokumen')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'dokumen'
                    ? 'bg-[#0F5132] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Dokumen ({documents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200/80 transition-all cursor-pointer shrink-0"
                title="Tutup Panel (Collapse)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          {/* TAB 1: BACKLOG REFERENSI */}
          {sidebarTab === 'referensi' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filter Chips */}
              <div className="p-2.5 border-b border-gray-100 bg-gray-50/50 space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Filter Tahap Inkubasi
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'customer_validation', label: 'CV' },
                    { id: 'market_validation', label: 'MV' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTahapFilter(f.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        tahapFilter === f.id
                          ? 'bg-[#0F5132] text-white shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                <p className="text-[10px] text-gray-400 italic">
                  💡 Klik &quot;+ Pin&quot; pada kartu di bawah untuk menyematkannya ke kanvas diskusi.
                </p>

                {filteredReferenceCards.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Tidak ada kartu pada filter ini.</p>
                ) : (
                  filteredReferenceCards.map((card) => {
                    const isPinned = notes.some((n) => n.kanbanCardId === card.id);
                    const phaseToken = getPhaseTokenBySlug(card.tahap);
                    const cardIsLocked = isPhaseLocked(card);
                    const isMandatory =
                      detectCvBakuCardType(card.judul, card.tahap) !== null ||
                      card.label === 'Template Baku CV' ||
                      isMvMandatoryCard(card.judul, card.tahap);

                    return (
                      <div
                        key={card.id}
                        className={`p-2.5 rounded-xl border transition-all shadow-2xs space-y-1.5 ${
                          isPinned
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : cardIsLocked
                            ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:shadow-xs'
                            : 'bg-white border-[#C9E4D0] hover:border-[#0F5132] hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {isMandatory && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300">
                                Wajib
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${phaseToken.badgeClass}`}
                            >
                              {card.tahap === 'innovation_setup'
                                ? 'Setup'
                                : card.tahap === 'customer_validation'
                                ? 'CV'
                                : card.tahap === 'market_validation'
                                ? 'MV'
                                : 'Umum'}
                            </span>
                            {cardIsLocked && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                <Lock className="h-2.5 w-2.5" />
                                Terkunci
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {card.storyPoint || 3} SP
                            </span>
                            {isPinned ? (
                              <span className="text-[9px] font-bold text-gray-400">Tersemat</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePinCardToCanvas(card.id)}
                                title={cardIsLocked ? 'Sematkan ke kanvas untuk didiskusikan (bukan mengadopsi)' : '+ Pin ke kanvas'}
                                className={`h-6 px-1.5 text-[10px] font-bold gap-1 cursor-pointer ${
                                  cardIsLocked
                                    ? 'text-amber-700 hover:bg-amber-100'
                                    : 'text-[#0F5132] hover:bg-[#F0F7F1]'
                                }`}
                              >
                                <Pin className="h-3 w-3" />
                                <span>+ Pin</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        <p className={`text-xs font-bold leading-snug line-clamp-2 ${isMandatory ? 'text-rose-700 font-extrabold' : 'text-gray-800'}`}>{card.judul}</p>

                        {cardIsLocked && (
                          <p className="text-[9px] text-amber-700 font-medium">
                            💬 Bisa didiskusikan di kanvas, belum bisa diadopsi ke sprint.
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                          <span>{card.label || 'Referensi'}</span>
                          <button
                            onClick={() => openCardDetailModal(card)}
                            className="text-[#0F5132] hover:underline font-semibold"
                          >
                            Lihat Detail →
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DOKUMEN SUMBER */}
          {sidebarTab === 'dokumen' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Arsip Dosier &amp; Lampiran
                </span>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleUploadDocument} disabled={uploadingDoc} />
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#0F5132] text-white px-2 py-1 rounded-md hover:bg-[#146C43] shadow-2xs">
                    {uploadingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    <span>Unggah</span>
                  </span>
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {documents.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Belum ada dokumen terhubung.</p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      className={`p-2.5 rounded-xl border transition-all shadow-2xs space-y-1 cursor-pointer ${
                        previewDoc?.id === doc.id
                          ? 'bg-[#F0F7F1] border-[#0F5132]'
                          : 'bg-white border-gray-200 hover:border-[#0F5132]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-4 w-4 text-red-600 shrink-0" />
                          <p className="text-xs font-bold text-gray-800 truncate">{doc.fileName}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-600 shrink-0"
                        >
                          {doc.source === 'proposal_dossier' ? 'Arsip Dosier' : 'Unggahan'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                        <span>{doc.fileType.includes('pdf') ? 'PDF Document' : 'File'}</span>
                        <span className="text-[#0F5132] font-semibold flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Pratinjau
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* KOLOM 3: DOCUMENT PREVIEWER (SLIDE-OVER / IN-PAGE VIEWER) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {previewDoc && (
          <div className="w-[360px] sm:w-[420px] md:w-[480px] lg:w-[540px] max-w-[calc(100vw-40px)] min-w-[320px] shrink-0 bg-gray-900 border-l border-gray-700 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Viewer Header */}
            <div className="px-3 py-2.5 bg-gray-800 text-white flex items-center justify-between gap-2 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <FileText className="h-4 w-4 text-red-400 shrink-0" />
                <span
                  className="text-xs font-bold truncate block min-w-0 text-gray-200"
                  title={previewDoc.fileName}
                >
                  {previewDoc.fileName}
                </span>
              </div>

              {/* Action Buttons: flex-shrink-0 so they never shrink or overflow */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={previewDoc.fileUrl}
                  download={previewDoc.fileName}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
                  title="Unduh file"
                >
                  <Download className="h-4 w-4" />
                </a>
                <div className="h-4 w-px bg-gray-700 mx-0.5 shrink-0" />
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg bg-gray-700 hover:bg-red-600 text-white transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
                  title="Tutup pratinjau"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 bg-gray-950 relative overflow-hidden">
              <iframe
                src={`${previewDoc.fileUrl}#toolbar=1&navpanes=0`}
                title={previewDoc.fileName}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: PRE-FILLED AI COMPILED BACKLOG CARD */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={compiledModalOpen} onOpenChange={setCompiledModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] bg-white p-0 rounded-2xl border-2 border-[#0F5132] shadow-2xl flex flex-col overflow-hidden">
          {/* Sticky Header */}
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 shrink-0 bg-white">
            <DialogTitle className="text-sm font-extrabold text-[#0B3D2E] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Draf Kartu Backlog dari Kompilasi AI</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              AI telah mengompilasi catatan diskusi di kelompok ini. Anda dapat meninjau dan menyunting sebelum menyimpan ke Backlog Kerja.
            </DialogDescription>
          </DialogHeader>

          {compiledDraft && (
            <>
              {/* Scrollable Form Body */}
              <div className="space-y-4 p-5 py-3 text-xs overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="font-bold text-gray-800 block mb-1">Judul Kartu / Task *</label>
                  <Input
                    value={compiledDraft.judul}
                    onChange={(e) => setCompiledDraft({ ...compiledDraft, judul: e.target.value })}
                    className="text-xs font-bold border-[#C9E4D0] focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Deskripsi Lengkap</label>
                  <Textarea
                    value={compiledDraft.deskripsi}
                    rows={3}
                    onChange={(e) => setCompiledDraft({ ...compiledDraft, deskripsi: e.target.value })}
                    className="text-xs border-[#C9E4D0] focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Acceptance Criteria</label>
                  <Textarea
                    value={compiledDraft.acceptanceCriteria}
                    rows={2}
                    onChange={(e) => setCompiledDraft({ ...compiledDraft, acceptanceCriteria: e.target.value })}
                    className="text-xs border-[#C9E4D0] focus:border-[#0F5132]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-800 block mb-1">Tahap Inkubasi</label>
                    <select
                      value={['customer_validation', 'market_validation'].includes(compiledDraft.tahap) ? compiledDraft.tahap : 'customer_validation'}
                      onChange={(e) => setCompiledDraft({ ...compiledDraft, tahap: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-[#0F5132] font-semibold text-gray-800"
                    >
                      <option value="customer_validation">Customer Validation (CV)</option>
                      <option value="market_validation">Market Validation (MV)</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-800">Estimasi Waktu</label>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ≈ {Number((compiledDraft.storyPoint || 3).toFixed(2))} SP
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      step={15}
                      value={Math.round((compiledDraft.storyPoint || 3) * 60)}
                      onChange={(e) => {
                        const min = Math.max(1, parseInt(e.target.value, 10) || 60);
                        setCompiledDraft({ ...compiledDraft, storyPoint: Number((min / 60).toFixed(2)) });
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-[#0F5132]"
                      placeholder="Menit (contoh: 120)"
                    />
                  </div>
                </div>

                {/* Subtasks List */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#F0F7F1] border border-[#C9E4D0]">
                  <span className="font-bold text-[#0B3D2E] text-xs block">
                    Draf Subtasks ({compiledDraft.subtasks.length}):
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {compiledDraft.subtasks.map((st, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded bg-white border border-gray-200 text-xs">
                        <span className="text-gray-800 truncate flex-1">{st.title}</span>
                        <span className="text-[10px] font-bold text-amber-800 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                          {st.estimatedHours} jam
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="flex items-center justify-between gap-2 p-4 bg-gray-50 border-t border-gray-200 shrink-0 rounded-b-2xl">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompiledModalOpen(false)}
                  className="text-xs cursor-pointer rounded-xl"
                >
                  Batal
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={savingCompiledCard || !compiledDraft.judul.trim()}
                    onClick={() => handleSaveCompiledCard(null)}
                    className="bg-[#0F5132] hover:bg-[#146C43] text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs rounded-xl"
                  >
                    {savingCompiledCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    <span>Simpan ke Backlog</span>
                  </Button>

                  {/* Quick Assign ke Sprint 1-Click Action */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        disabled={savingCompiledCard || !compiledDraft.judul.trim()}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer rounded-xl"
                      >
                        <Zap className="h-3.5 w-3.5 fill-white" />
                        <span>Assign ke Sprint ⚡</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 bg-white rounded-xl shadow-xl border border-[#C9E4D0]" align="end">
                      <span className="text-[11px] font-bold text-[#0B3D2E] block mb-1.5">
                        Pilih Target Sprint:
                      </span>
                      <div className="space-y-1">
                        {[1, 2, 3, 4].map((sprintNum) => (
                          <button
                            key={sprintNum}
                            type="button"
                            onClick={() => handleSaveCompiledCard(sprintNum)}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-[#F0F7F1] text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors cursor-pointer border border-transparent hover:border-[#C9E4D0]"
                          >
                            <span>Sprint {sprintNum}</span>
                            <ArrowRight className="h-3 w-3 text-[#3E9463]" />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CARD DETAIL & SUBTASKS MODAL (REUSED) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(selectedCardForDetail)} onOpenChange={(open) => { if (!open) setSelectedCardForDetail(null); }}>
        <DialogContent className="max-w-3xl bg-white p-6 rounded-2xl border-2 border-[#C9E4D0] shadow-2xl max-h-[90vh] overflow-y-auto">
          {selectedCardForDetail && (
            <>
              <DialogHeader className="pb-3 border-b border-[#C9E4D0]">
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-sm font-extrabold text-[#0B3D2E]">
                    {selectedCardForDetail.judul}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {selectedCardForDetail.storyPoint || 3} SP
                    </span>

                    {/* Quick Sprint Assign in Modal 2 — hidden for locked-phase cards */}
                    {!isPhaseLocked(selectedCardForDetail) ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] font-bold text-[#0F5132] border-[#C9E4D0] hover:bg-[#F0F7F1] gap-1 cursor-pointer"
                          >
                            <Zap className="h-3 w-3 fill-[#3E9463] text-[#3E9463]" />
                            <span>
                              {selectedCardForDetail.sprintNumber
                                ? `Sprint ${selectedCardForDetail.sprintNumber}`
                                : 'Assign Sprint ⚡'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-2 bg-white rounded-xl shadow-xl border border-[#C9E4D0]" align="end">
                          <span className="text-[11px] font-bold text-[#0B3D2E] block mb-1.5">
                            Pilih Target Sprint:
                          </span>
                          <div className="space-y-1">
                            {[1, 2, 3, 4].map((sprintNum) => (
                              <button
                                key={sprintNum}
                                type="button"
                                onClick={() => handleQuickAssignSprintInModal(selectedCardForDetail.id, sprintNum)}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-[#F0F7F1] text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors cursor-pointer border border-transparent hover:border-[#C9E4D0]"
                              >
                                <span>Sprint {sprintNum}</span>
                                <ArrowRight className="h-3 w-3 text-[#3E9463]" />
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleQuickAssignSprintInModal(selectedCardForDetail.id, null)}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span>📦 Backlog (Tanpa Sprint)</span>
                              <ArrowRight className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        <Lock className="h-2.5 w-2.5" />
                        Fase Terkunci
                      </span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {selectedCardForDetail.deskripsi && (
                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Deskripsi</span>
                    <p className="p-3 rounded-lg bg-gray-50 text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedCardForDetail.deskripsi}
                    </p>
                  </div>
                )}

                {selectedCardForDetail.acceptanceCriteria && (
                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Acceptance Criteria</span>
                    <p className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-gray-800 leading-relaxed">
                      {selectedCardForDetail.acceptanceCriteria}
                    </p>
                  </div>
                )}

                {/* Subtasks Section with Inline Edit */}
                <div className="space-y-2 p-3.5 rounded-xl bg-[#F0F7F1] border border-[#C9E4D0]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B3D2E] text-xs flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-[#3E9463]" />
                      <span>Subtasks ({subtasks.length})</span>
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {subtasks.filter((s) => s.isDone).length}/{subtasks.length} Selesai
                    </span>
                  </div>

                  {loadingSubtasks ? (
                    <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3E9463]" />
                      <span>Memuat subtask...</span>
                    </div>
                  ) : subtasks.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic py-1">Belum ada subtask pada kartu ini.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#C9E4D0] hover:bg-[#E3F0E6]/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtaskInModal(st.id, st.isDone)}
                              className="text-[#0F5132] hover:text-[#146C43] transition-colors shrink-0 cursor-pointer"
                            >
                              {st.isDone ? (
                                <CheckSquare className="h-4 w-4 text-[#0F5132]" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </button>

                            {/* Judul Subtask: Inline Edit */}
                            {editingSubtaskId === st.id && editingSubtaskField === 'title' ? (
                              <Input
                                autoFocus
                                value={editTitleDraft}
                                onChange={(e) => setEditTitleDraft(e.target.value)}
                                onBlur={() => handleSaveSubtaskTitle(st.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveSubtaskTitle(st.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelEditSubtask();
                                  }
                                }}
                                className="h-7 text-xs px-1.5 py-0 bg-white border-[#3E9463] focus:ring-1 focus:ring-[#3E9463] flex-1 font-medium"
                              />
                            ) : (
                              <span
                                onClick={() => handleStartEditTitle(st)}
                                className={`text-xs flex-1 truncate cursor-pointer hover:bg-yellow-50/80 hover:text-[#0B3D2E] px-1 py-0.5 rounded transition-colors ${
                                  st.isDone ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                                }`}
                                title="Klik untuk mengedit judul subtask"
                              >
                                {st.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Jam Subtask: Inline Edit */}
                            {editingSubtaskId === st.id && editingSubtaskField === 'hours' ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  autoFocus
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={editHoursDraft}
                                  onChange={(e) =>
                                    setEditHoursDraft(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                                  }
                                  onBlur={() => handleSaveSubtaskHours(st.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveSubtaskHours(st.id);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEditSubtask();
                                    }
                                  }}
                                  className="h-6 w-16 text-[10px] px-1 py-0 text-center bg-white border-[#D4AF37] font-bold"
                                />
                                <span className="text-[10px] text-gray-500 font-semibold">menit</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditHours(st)}
                                className="text-[10px] font-bold text-amber-800 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="Klik untuk mengedit estimasi menit subtask"
                              >
                                {st.estimatedHours ? `${st.estimatedHours} menit` : '+ menit'}
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={deletingSubtaskId === st.id}
                              onClick={() => handleDeleteSubtaskInModal(st.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded transition-all cursor-pointer"
                              title="Hapus subtask"
                            >
                              {deletingSubtaskId === st.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subtask */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Input
                      placeholder="+ Tambah subtask baru..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtaskInModal();
                        }
                      }}
                      className="text-xs h-8 bg-white border-[#C9E4D0]"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddSubtaskInModal}
                      className="h-8 px-3 text-xs bg-[#0F5132] text-white font-bold cursor-pointer"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-2 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#0F5132]" />
                    <span>Diskusi &amp; Komentar ({comments.length})</span>
                  </span>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className="p-2 rounded bg-white border border-gray-100 text-xs space-y-0.5">
                        <span className="font-bold text-[#0B3D2E] text-[10px] block">{c.userNama || 'Anonim'}</span>
                        <p className="text-gray-800">{c.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Input
                      placeholder="Tulis komentar..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendCommentInModal();
                        }
                      }}
                      className="text-xs h-8 bg-white"
                    />
                    <Button
                      size="sm"
                      disabled={sendingComment}
                      onClick={handleSendCommentInModal}
                      className="h-8 px-3 text-xs bg-[#0F5132] text-white font-bold cursor-pointer"
                    >
                      Kirim
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Component: FrameCard (Kelompok Ide) ─────────────────────────────────────────
function FrameCard({
  frame,
  zoom = 100,
  noteCount,
  validNotesCount,
  isCompiling,
  onUpdate,
  onDelete,
  onCompile,
}: {
  frame: DiskusiFrameItem;
  zoom?: number;
  noteCount: number;
  validNotesCount: number;
  isCompiling: boolean;
  onUpdate: (id: string, label: string, x: number, y: number, w: number, h: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCompile: () => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(frame.label);
  const [pos, setPos] = useState({ x: frame.posX, y: frame.posY });
  const [size, setSize] = useState({ w: frame.width, h: frame.height });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPos({ x: frame.posX, y: frame.posY });
    setSize({ w: frame.width, h: frame.height });
  }, [frame.posX, frame.posY, frame.width, frame.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingLabel) return;
    dragging.current = true;
    const scale = (zoom || 100) / 100;
    dragOffset.current = { x: e.clientX / scale - pos.x, y: e.clientY / scale - pos.y };

    const handleMouseMove = (e2: MouseEvent) => {
      if (!dragging.current) return;
      const curScale = (zoom || 100) / 100;
      setPos({ x: e2.clientX / curScale - dragOffset.current.x, y: e2.clientY / curScale - dragOffset.current.y });
    };
    const handleMouseUp = async (e2: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const curScale = (zoom || 100) / 100;
      const newX = Math.round(e2.clientX / curScale - dragOffset.current.x);
      const newY = Math.round(e2.clientY / curScale - dragOffset.current.y);
      setPos({ x: newX, y: newY });
      await onUpdate(frame.id, labelDraft, newX, newY, size.w, size.h);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBlurLabel = async () => {
    setEditingLabel(false);
    if (labelDraft.trim() && labelDraft !== frame.label) {
      await onUpdate(frame.id, labelDraft.trim(), pos.x, pos.y, size.w, size.h);
    }
  };

  return (
    <div
      className="absolute border-2 border-dashed border-[#0F5132]/40 rounded-2xl bg-[#0F5132]/[0.03] p-3 transition-colors hover:border-[#0F5132]/70 group z-0"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Frame Header */}
      <div
        className="flex items-center justify-between pb-2 border-b border-[#0F5132]/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="h-3.5 w-3.5 text-[#0F5132] shrink-0" />
          {editingLabel ? (
            <input
              autoFocus
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={handleBlurLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBlurLabel();
              }}
              className="text-xs font-bold text-[#0B3D2E] bg-white border border-[#0F5132] rounded px-1.5 py-0.5 focus:outline-none"
            />
          ) : (
            <span
              onClick={() => setEditingLabel(true)}
              className="text-xs font-bold text-[#0B3D2E] truncate cursor-text hover:underline"
              title="Klik untuk ubah nama kelompok"
            >
              {frame.label}
            </span>
          )}
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-white text-gray-600 border border-gray-200">
            {noteCount} sticky
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* AI Compile Button: disabled if validNotesCount < 2 */}
          <Button
            size="sm"
            disabled={isCompiling || validNotesCount < 2}
            onClick={onCompile}
            className={`h-6 px-2 text-[10px] font-extrabold text-white gap-1 shadow-2xs transition-all ${
              validNotesCount < 2
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#0F5132] hover:bg-[#146C43] cursor-pointer'
            }`}
            title={
              validNotesCount < 2
                ? 'Isi minimal 2 sticky note dengan teks (bukan default) sebelum kompilasi AI'
                : 'Kompilasi ide-ide di dalam kelompok ini jadi kartu Backlog dengan AI'
            }
          >
            {isCompiling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className={`h-3 w-3 ${validNotesCount < 2 ? 'text-gray-400' : 'text-[#FFD700]'}`} />
            )}
            <span>Kompilasi AI</span>
          </Button>

          <button
            onClick={() => onDelete(frame.id)}
            className="text-gray-400 hover:text-red-500 text-xs p-1"
            title="Hapus kelompok"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component: PinCard (Referenced Backlog Card on Canvas) ─────────────────────
function PinCard({
  note,
  zoom = 100,
  isLocked = false,
  presenceUsers,
  currentClientId,
  onUpdatePosition,
  onDelete,
  onClickDetail,
  onFocusEnter,
  onFocusLeave,
}: {
  note: DiskusiNoteItem;
  zoom?: number;
  isLocked?: boolean;
  presenceUsers: Record<string, PresenceUser>;
  currentClientId: string;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClickDetail: () => void;
  onFocusEnter: () => void;
  onFocusLeave: () => void;
}) {
  const [pos, setPos] = useState({ x: note.posX, y: note.posY });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragging.current) setPos({ x: note.posX, y: note.posY });
  }, [note.posX, note.posY]);

  const otherFocused = Object.values(presenceUsers).filter(
    (u) => u.clientId !== currentClientId && u.focusedNoteId === note.id
  );
  const focusedBorderColor = otherFocused[0]?.color;

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    const scale = (zoom || 100) / 100;
    dragOffset.current = { x: e.clientX / scale - pos.x, y: e.clientY / scale - pos.y };

    const handleMouseMove = (e2: MouseEvent) => {
      if (!dragging.current) return;
      const curScale = (zoom || 100) / 100;
      setPos({ x: e2.clientX / curScale - dragOffset.current.x, y: e2.clientY / curScale - dragOffset.current.y });
    };
    const handleMouseUp = async (e2: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const curScale = (zoom || 100) / 100;
      const newX = Math.round(e2.clientX / curScale - dragOffset.current.x);
      const newY = Math.round(e2.clientY / curScale - dragOffset.current.y);
      setPos({ x: newX, y: newY });
      await onUpdatePosition(note.id, newX, newY);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      id={`pin-${note.id}`}
      data-note-id={note.id}
      className="absolute select-none z-10"
      style={{ left: pos.x, top: pos.y }}
      onMouseEnter={onFocusEnter}
      onMouseLeave={onFocusLeave}
    >
      {/* Presence outline */}
      {otherFocused.length > 0 && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ outline: `2.5px solid ${focusedBorderColor}`, outlineOffset: 2 }}
        />
      )}

      <div
        className={`w-56 bg-white rounded-xl shadow-md transition-all p-2.5 space-y-1.5 group cursor-grab active:cursor-grabbing relative ${
          isLocked
            ? 'border-2 border-amber-300 hover:border-amber-500'
            : 'border-2 border-[#C9E4D0] hover:border-[#0F5132]'
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Lock indicator badge for phase-locked cards */}
        {isLocked && (
          <div className="absolute -top-2 -right-2 bg-amber-100 border border-amber-400 rounded-full p-0.5 shadow-sm z-10" title="Fase belum terbuka — hanya untuk diskusi">
            <Lock className="h-3 w-3 text-amber-700" />
          </div>
        )}

        <div className="flex items-center justify-between gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            isLocked
              ? 'text-amber-800 bg-amber-50 border-amber-300'
              : 'text-[#0F5132] bg-[#F0F7F1] border-[#C9E4D0]'
          }`}>
            <Pin className="h-3 w-3" />
            <span>{isLocked ? '🔒 Pin (Terkunci)' : 'Pin Kartu'}</span>
          </span>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {note.cardStoryPoint || 3} SP
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="text-gray-400 hover:text-red-500 text-xs px-0.5"
              title="Lepas pin"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">{note.cardJudul || 'Kartu Referensi'}</p>

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-[9px] text-gray-400 truncate max-w-[100px]">{note.cardLabel || 'Referensi'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClickDetail();
            }}
            className="text-[10px] text-[#0F5132] font-bold hover:underline"
          >
            Buka Detail →
          </button>
        </div>

        {/* Presence typing/viewing label */}
        {otherFocused.length > 0 && (
          <div className="text-[9px] font-semibold pt-0.5" style={{ color: focusedBorderColor }}>
            {otherFocused[0].name} sedang melihat...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component: StickyNoteCard ──────────────────────────────────────────────────
function StickyNoteCard({
  note,
  zoom = 100,
  pinnedCards = [],
  presenceUsers,
  currentClientId,
  onUpdateContent,
  onUpdatePosition,
  onDelete,
  onConvertToSubtask,
  onFocusEnter,
  onFocusLeave,
}: {
  note: DiskusiNoteItem;
  zoom?: number;
  pinnedCards: Array<{ id: string; judul: string; storyPoint: number; label: string }>;
  presenceUsers: Record<string, PresenceUser>;
  currentClientId: string;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvertToSubtask: (cardId: string) => void;
  onFocusEnter: () => void;
  onFocusLeave: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content || '');
  const [pos, setPos] = useState({ x: note.posX, y: note.posY });
  const [convertPopoverOpen, setConvertPopoverOpen] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!dragging.current) setPos({ x: note.posX, y: note.posY });
  }, [note.posX, note.posY]);

  useEffect(() => {
    if (!editing) setDraft(note.content || '');
  }, [note.content, editing]);

  const otherFocused = Object.values(presenceUsers).filter(
    (u) => u.clientId !== currentClientId && u.focusedNoteId === note.id
  );
  const focusedBorderColor = otherFocused[0]?.color;

  const isConverted = Boolean(note.convertedToSubtaskId || note.convertedToCardId);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    dragging.current = true;
    const scale = (zoom || 100) / 100;
    dragOffset.current = { x: e.clientX / scale - pos.x, y: e.clientY / scale - pos.y };

    const handleMouseMove = (e2: MouseEvent) => {
      if (!dragging.current) return;
      const curScale = (zoom || 100) / 100;
      setPos({ x: e2.clientX / curScale - dragOffset.current.x, y: e2.clientY / curScale - dragOffset.current.y });
    };
    const handleMouseUp = async (e2: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const curScale = (zoom || 100) / 100;
      const newX = Math.round(e2.clientX / curScale - dragOffset.current.x);
      const newY = Math.round(e2.clientY / curScale - dragOffset.current.y);
      setPos({ x: newX, y: newY });
      await onUpdatePosition(note.id, newX, newY);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBlur = async () => {
    setEditing(false);
    onFocusLeave();
    if (draft.trim() !== (note.content || '')) {
      await onUpdateContent(note.id, draft.trim() || 'Kosong');
    }
  };

  return (
    <div
      id={`sticky-${note.id}`}
      data-note-id={note.id}
      className={`absolute select-none z-10 transition-opacity ${isConverted ? 'opacity-75' : 'opacity-100'}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseEnter={onFocusEnter}
      onMouseLeave={() => { if (!editing) onFocusLeave(); }}
    >
      {/* Presence outline */}
      {otherFocused.length > 0 && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ outline: `2.5px solid ${focusedBorderColor}`, outlineOffset: 2 }}
        />
      )}

      <div
        className="w-48 rounded-xl shadow-md flex flex-col overflow-hidden border border-black/10 hover:shadow-lg transition-shadow"
        style={{ backgroundColor: note.color || '#FEF3C7' }}
      >
        {/* Header Drag Handle */}
        <div
          className="flex items-center justify-between px-2.5 py-1.5 cursor-grab active:cursor-grabbing border-b border-black/5"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          onMouseDown={handleMouseDown}
        >
          <span className="text-[10px] text-gray-700 font-semibold truncate max-w-[90px]">
            {note.createdByName || 'Anonim'}
          </span>

          <div className="flex items-center gap-1">
            {/* Popover: Jadikan Subtask */}
            <Popover open={convertPopoverOpen} onOpenChange={setConvertPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="text-gray-500 hover:text-[#0F5132] p-0.5 rounded hover:bg-black/10"
                  title="Jadikan subtask dari kartu yang di-pin di kanvas ini"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRight className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2.5 bg-white text-xs shadow-xl rounded-xl border border-[#C9E4D0]" align="end">
                <span className="font-bold text-[#0B3D2E] text-[11px] block mb-1.5 flex items-center gap-1.5">
                  <Pin className="h-3 w-3 text-[#3E9463] rotate-45" />
                  <span>Pilih Kartu Target Subtask:</span>
                </span>

                {pinnedCards.length === 0 ? (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-center space-y-1">
                    <p className="text-[11px] font-bold text-amber-900 leading-tight">
                      Belum ada kartu yang di-pin ke kanvas ini.
                    </p>
                    <p className="text-[10px] text-amber-700 leading-normal">
                      Sematkan (Pin) kartu dari panel <strong>Backlog Referensi</strong> terlebih dahulu.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                    {pinnedCards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onConvertToSubtask(c.id);
                          setConvertPopoverOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-[#F0F7F1] border border-gray-100 hover:border-[#C9E4D0] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[9px] font-bold text-[#0F5132] bg-[#E3F0E6] px-1.5 py-0.2 rounded">
                            📌 Pin Kanvas
                          </span>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {c.storyPoint} SP
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#0B3D2E]" title={c.judul}>
                          {c.judul}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <button
              onClick={() => onDelete(note.id)}
              className="text-gray-400 hover:text-red-500 text-xs p-0.5 rounded hover:bg-black/10"
              title="Hapus sticky"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {editing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            className="w-full p-2 text-xs text-gray-900 resize-none focus:outline-none bg-transparent font-medium leading-relaxed"
            rows={4}
          />
        ) : (
          <div
            className="p-2.5 text-xs text-gray-900 min-h-[75px] cursor-text whitespace-pre-wrap break-words font-medium leading-relaxed"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          >
            {note.content || 'Kosong'}
          </div>
        )}

        {/* Footer converted tag / presence indicator */}
        <div className="px-2.5 pb-1.5 flex items-center justify-between text-[9px]">
          {isConverted ? (
            <span className="font-bold text-[#0F5132] flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />
              <span>✓ Jadi subtask</span>
            </span>
          ) : (
            <span className="text-gray-400 text-[8px]">Double click to edit</span>
          )}

          {otherFocused.length > 0 && (
            <span className="font-bold" style={{ color: focusedBorderColor }}>
              {otherFocused[0].name} sedang {editing ? 'mengetik...' : 'melihat...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
