"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

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
  const [cards, setCards] = useState(initialCards);
  const [columns, setColumns] = useState(
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

  // Form State
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tahap, setTahap] = useState("innovation_setup");
  const [label, setLabel] = useState("Backlog Charter");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredCards = cards.filter(
    (c) => tahapFilter === "all" || c.tahap === tahapFilter
  );

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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
      setCards([...cards, res.data]);
      setIsNewCardOpen(false);
      setJudul("");
      setDeskripsi("");
    }
    setSaving(false);
  };

  const handleMoveCard = async (cardId: string, newCol: string) => {
    setCards(
      cards.map((c) => (c.id === cardId ? { ...c, statusKolom: newCol } : c))
    );
    await updateKanbanCardStatusAction(timId, cardId, newCol, 0);
  };

  return (
    <div className="space-y-4">
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
              <span>Board View</span>
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
          className="text-xs gap-1.5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kartu / Task</span>
        </Button>
      </div>

      {/* View Mode 1: Board Columns */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colCards = filteredCards.filter(
              (c) => c.statusKolom === col.namaKolom
            );

            return (
              <div
                key={col.id || col.namaKolom}
                className="bg-gray-100/80 rounded-xl p-3 border border-gray-200/80 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{col.namaKolom}</span>
                    <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-full text-gray-500 font-semibold border border-gray-200">
                      {colCards.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => {
                      setTargetColumn(col.namaKolom);
                      setIsNewCardOpen(true);
                    }}
                    className="text-gray-400 hover:text-gray-700 p-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2 min-h-[150px]">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2 hover:border-[#0F5132]/50 transition-all"
                    >
                      {card.label && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F5132]/10 text-[#0F5132]">
                          {card.label}
                        </span>
                      )}

                      <h4 className="text-xs font-bold text-gray-900 leading-tight">
                        {card.judul}
                      </h4>

                      {card.deskripsi && (
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {card.deskripsi}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                        {card.tanggalSelesai ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(card.tanggalSelesai).toLocaleDateString("id-ID")}
                          </span>
                        ) : (
                          <span>-</span>
                        )}

                        {/* Status Move Dropdown */}
                        <select
                          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 font-medium"
                          value={card.statusKolom}
                          onChange={(e) => handleMoveCard(card.id, e.target.value)}
                        >
                          {columns.map((c) => (
                            <option key={c.namaKolom} value={c.namaKolom}>
                              {c.namaKolom}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Timeline Roadmap */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Timeline Eksekusi Proyek (Gantt/Roadmap Style)
            </h3>
            <p className="text-xs text-gray-500">
              Visualisasi jadwal mulai dan selesai tiap backlog & sprint
            </p>
          </div>

          <div className="space-y-3">
            {filteredCards.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">
                Belum ada kartu dengan jadwal tanggal.
              </p>
            ) : (
              filteredCards.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700 uppercase">
                        {c.tahap.replace("_", " ")}
                      </span>
                      <h4 className="text-xs font-bold text-gray-800">{c.judul}</h4>
                    </div>
                    <p className="text-[11px] text-gray-500">{c.label || "Task Umum"}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Jadwal</span>
                      <span className="font-semibold text-gray-700">
                        {c.tanggalMulai
                          ? new Date(c.tanggalMulai).toLocaleDateString("id-ID")
                          : "-"}{" "}
                        s/d{" "}
                        {c.tanggalSelesai
                          ? new Date(c.tanggalSelesai).toLocaleDateString("id-ID")
                          : "-"}
                      </span>
                    </div>

                    <Badge
                      variant={
                        c.statusKolom === "Done"
                          ? "success"
                          : c.statusKolom === "In Progress"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {c.statusKolom}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dialog New Card */}
      <Dialog open={isNewCardOpen} onOpenChange={setIsNewCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kartu Kanban</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCard} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Judul Kartu / Task *
              </label>
              <Input
                required
                placeholder="Contoh: Wawancara 5 Penaksir Cabang Kramat Jati"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Deskripsi
              </label>
              <Textarea
                rows={2}
                placeholder="Tujuan dan kriteria selesai..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Tahapan
                </label>
                <select
                  className="w-full h-10 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  value={tahap}
                  onChange={(e) => setTahap(e.target.value)}
                >
                  <option value="innovation_setup">Innovation Setup</option>
                  <option value="customer_validation">Customer Validation</option>
                  <option value="market_validation">Market Validation</option>
                  <option value="umum">Umum</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Label
                </label>
                <select
                  className="w-full h-10 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                >
                  <option value="Backlog Charter">Backlog Charter</option>
                  <option value="SME Review">SME Review</option>
                  <option value="Sprint MVP">Sprint MVP</option>
                  <option value="User Research">User Research</option>
                  <option value="General Task">General Task</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Tanggal Selesai
                </label>
                <Input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
              >
                {saving ? "Menyimpan..." : "Simpan Kartu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
