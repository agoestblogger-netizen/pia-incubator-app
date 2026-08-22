"use client";

import { useState, useMemo } from "react";
import {
  createKanbanCardAction,
  updateKanbanCardStatusAction,
} from "@/app/actions/kanban";
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
  User,
  Tag,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

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
// Card Component (Sortable)
// ─────────────────────────────────────────────────────────────────────────────

function SortableCard({
  card,
  columns,
  onMoveCard,
}: {
  card: any;
  columns: any[];
  onMoveCard: (cardId: string, newCol: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative bg-white rounded-xl p-3.5 border transition-all select-none shadow-xs ${
        isDragging
          ? "border-[#0F5132] bg-green-50/20 shadow-lg"
          : "border-gray-200 hover:border-[#0F5132]/60 hover:shadow-sm"
      }`}
    >
      {/* Drag handle & Header */}
      <div className="flex items-start justify-between gap-2">
        {card.label && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F5132]/10 text-[#0F5132]">
            {card.label}
          </span>
        )}
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -mr-1 text-gray-300 hover:text-gray-600 rounded transition-colors touch-none"
          title="Geser kartu"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      <div {...listeners} className="cursor-grab active:cursor-grabbing space-y-1.5 mt-1 touch-none">
        <h4 className="text-xs font-bold text-gray-900 leading-tight">
          {card.judul}
        </h4>

        {card.deskripsi && (
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
            {card.deskripsi}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100 text-[10px] text-gray-400">
        {card.tanggalSelesai ? (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(card.tanggalSelesai).toLocaleDateString("id-ID")}
          </span>
        ) : (
          <span>-</span>
        )}

        {/* Alternative status dropdown (accessibility & mobile) */}
        <select
          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
          value={card.statusKolom}
          onChange={(e) => onMoveCard(card.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {columns.map((c) => (
            <option key={c.namaKolom} value={c.namaKolom}>
              {c.namaKolom}
            </option>
          ))}
        </select>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Droppable Container
// ─────────────────────────────────────────────────────────────────────────────

function KanbanColumnDroppable({
  column,
  cards,
  columns,
  onAddCard,
  onMoveCard,
}: {
  column: any;
  cards: any[];
  columns: any[];
  onAddCard: (colName: string) => void;
  onMoveCard: (cardId: string, newCol: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.namaKolom,
    data: {
      type: "Column",
      column,
    },
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-3 border transition-colors flex flex-col space-y-3 min-h-[300px] ${
        isOver
          ? "bg-green-50/60 border-[#0F5132]/50 ring-2 ring-[#0F5132]/20"
          : "bg-gray-100/80 border-gray-200/80"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>{column.namaKolom}</span>
          <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-full text-gray-600 font-bold border border-gray-200">
            {cards.length}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => onAddCard(column.namaKolom)}
          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200/60 transition-colors"
          title={`Tambah kartu ke ${column.namaKolom}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards List with Sortable Context */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              columns={columns}
              onMoveCard={onMoveCard}
            />
          ))}

          {cards.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-300/80 rounded-xl flex items-center justify-center text-[11px] text-gray-400 italic">
              Tarik kartu ke sini
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
  anggotaTim,
}: {
  timId: string;
  initialColumns: any[];
  initialCards: any[];
  anggotaTim: any[];
}) {
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");
  const [cards, setCards] = useState<any[]>(initialCards);
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

  const [tahapFilter, setTahapFilter] = useState("all");
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState("To Do");
  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tahap, setTahap] = useState("innovation_setup");
  const [label, setLabel] = useState("Backlog Charter");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [saving, setSaving] = useState(false);

  // dnd-kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts (allows clicks on dropdowns)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredCards = useMemo(
    () => cards.filter((c) => tahapFilter === "all" || c.tahap === tahapFilter),
    [cards, tahapFilter]
  );

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const res = await createKanbanCardAction(timId, {
      judul,
      deskripsi,
      statusKolom: targetColumn,
      tahap,
      label,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
      urutan: cards.length + 1,
    });

    if (res.success && res.data) {
      setCards((prev) => [...prev, res.data]);
      setIsNewCardOpen(false);
      setJudul("");
      setDeskripsi("");
    } else if (res.error) {
      setErrorMessage(res.error);
    }
    setSaving(false);
  };

  const handleMoveCardDropdown = async (cardId: string, newCol: string) => {
    const previousCards = [...cards];
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, statusKolom: newCol } : c))
    );

    const res = await updateKanbanCardStatusAction(timId, cardId, newCol, 0);
    if (!res.success) {
      // Rollback on error
      setCards(previousCards);
      setErrorMessage(res.error || "Gagal memindahkan kartu.");
    }
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

    const activeCard = cards.find((c) => c.id === activeId);
    const overCard = cards.find((c) => c.id === overId);

    if (!activeCard) return;

    // Determine target column name
    const overColumn = columns.find((col) => col.namaKolom === overId);
    const targetColumnName = overColumn
      ? overColumn.namaKolom
      : overCard
      ? overCard.statusKolom
      : null;

    if (targetColumnName && activeCard.statusKolom !== targetColumnName) {
      setCards((prev) => {
        return prev.map((c) =>
          c.id === activeId ? { ...c, statusKolom: targetColumnName } : c
        );
      });
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

    // Determine target column and new index
    const overColumn = columns.find((col) => col.namaKolom === overId);
    const targetColName = overColumn
      ? overColumn.namaKolom
      : cards.find((c) => c.id === overId)?.statusKolom || currentCard.statusKolom;

    const columnCards = cards.filter((c) => c.statusKolom === targetColName);
    const newIndex = columnCards.findIndex((c) => c.id === activeId);
    const finalIndex = newIndex >= 0 ? newIndex : columnCards.length;

    // Optimistic state is already updated via handleDragOver / reorder
    const previousCards = [...cards];

    const res = await updateKanbanCardStatusAction(
      timId,
      activeId,
      targetColName,
      finalIndex
    );

    if (!res.success) {
      setCards(previousCards);
      setErrorMessage(res.error || "Gagal memindahkan kartu.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-800 shadow-xs">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
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

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === "board"
                  ? "bg-white text-[#0F5132] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              <span>Board View (Drag & Drop)</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
            className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:ring-1 focus:ring-[#0F5132]"
            value={tahapFilter}
            onChange={(e) => setTahapFilter(e.target.value)}
          >
            <option value="all">Semua Tahap</option>
            <option value="innovation_setup">Innovation Setup</option>
            <option value="customer_validation">Customer Validation</option>
            <option value="market_validation">Market Validation</option>
            <option value="umum">Umum</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setTargetColumn("To Do");
            setIsNewCardOpen(true);
          }}
          variant="default"
          size="sm"
          className="text-xs gap-1.5 font-semibold bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kartu / Task</span>
        </Button>
      </div>

      {/* View Mode 1: Board Columns with @dnd-kit Drag & Drop */}
      {viewMode === "board" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {columns.map((col) => {
              const colCards = filteredCards.filter(
                (c) => c.statusKolom === col.namaKolom
              );

              return (
                <KanbanColumnDroppable
                  key={col.id || col.namaKolom}
                  column={col}
                  cards={colCards}
                  columns={columns}
                  onAddCard={(colName) => {
                    setTargetColumn(colName);
                    setIsNewCardOpen(true);
                  }}
                  onMoveCard={handleMoveCardDropdown}
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
      )}

      {/* View Mode 2: Timeline Roadmap */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Timeline & Roadmap Proyek
            </h3>
            <p className="text-xs text-gray-500">
              Jadwal pelaksanaan kartu kerja berdasarkan rentang tanggal mulai
              dan selesai.
            </p>
          </div>

          <div className="space-y-3">
            {filteredCards.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">
                Belum ada kartu kerja untuk tahap ini.
              </p>
            ) : (
              filteredCards.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{c.judul}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.statusKolom}
                      </Badge>
                    </div>
                    {c.deskripsi && (
                      <p className="text-gray-500 text-[11px] line-clamp-1">
                        {c.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-gray-500">
                    <span className="text-[11px] font-mono">
                      {c.tanggalMulai
                        ? new Date(c.tanggalMulai).toLocaleDateString("id-ID")
                        : "Start -"}{" "}
                      s/d{" "}
                      {c.tanggalSelesai
                        ? new Date(c.tanggalSelesai).toLocaleDateString("id-ID")
                        : "End -"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal / Dialog Tambah Kartu */}
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

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Label
                </label>
                <Input
                  placeholder="Backlog Charter, SME, MVP, dll"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="text-xs"
                />
              </div>
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
                disabled={saving || !judul.trim()}
                className="text-xs bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
              >
                {saving ? "Menyimpan..." : "Buat Kartu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
