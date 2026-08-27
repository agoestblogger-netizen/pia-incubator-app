'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Sparkles,
  Layers,
  Pin,
  Clock,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/ToastProvider';
import {
  createDiscussionCanvasAction,
  renameDiscussionCanvasAction,
  deleteDiscussionCanvasAction,
  type DiscussionCanvasListItem,
} from '@/app/actions/diskusi';
import { formatDateIndo } from '@/lib/utils';

interface DiscussionCanvasListClientProps {
  timId: string;
  timNama: string;
  canvases: DiscussionCanvasListItem[];
  currentUserId: string | null;
  canManageAny: boolean;
}

export function DiscussionCanvasListClient({
  timId,
  timNama,
  canvases: initialCanvases,
  currentUserId,
  canManageAny,
}: DiscussionCanvasListClientProps) {
  const router = useRouter();
  const [canvases, setCanvases] = useState<DiscussionCanvasListItem[]>(initialCanvases);

  // Modal Create State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal Rename State
  const [renameTarget, setRenameTarget] = useState<DiscussionCanvasListItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Dialog Delete State
  const [deleteTarget, setDeleteTarget] = useState<DiscussionCanvasListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Judul diskusi harus diisi.');
      return;
    }

    setCreating(true);
    try {
      const res = await createDiscussionCanvasAction({
        timId,
        judul: newTitle.trim(),
      });

      if (res.success && res.data) {
        toast.success(`Kanvas "${res.data.judul}" berhasil dibuat.`);
        setCreateModalOpen(false);
        setNewTitle('');
        router.push(`/tim/${timId}/diskusi/${res.data.id}`);
      } else {
        toast.error(res.error || 'Gagal membuat kanvas.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;

    setRenaming(true);
    try {
      const res = await renameDiscussionCanvasAction({
        canvasId: renameTarget.id,
        timId,
        judul: renameTitle.trim(),
      });

      if (res.success && res.data) {
        toast.success('Nama kanvas berhasil diubah.');
        setCanvases((prev) =>
          prev.map((c) => (c.id === renameTarget.id ? { ...c, judul: res.data.judul, updatedAt: new Date() } : c))
        );
        setRenameTarget(null);
        setRenameTitle('');
      } else {
        toast.error(res.error || 'Gagal mengubah nama kanvas.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await deleteDiscussionCanvasAction({
        canvasId: deleteTarget.id,
        timId,
      });

      if (res.success) {
        toast.success(`Kanvas "${deleteTarget.judul}" berhasil dihapus.`);
        setCanvases((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        toast.error(res.error || 'Gagal menghapus kanvas.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-[#C9E4D0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href={`/tim/${timId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#0F5132] hover:bg-[#146C43] shadow-xs transition-all border border-[#0B3D2E] cursor-pointer shrink-0"
              title="Kembali ke Halaman Overview Tim (3 Kotak Fase)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Tim</span>
            </Link>
            <Badge variant="outline" className="text-[11px] font-bold text-[#0F5132] border-[#C9E4D0] bg-[#F0F7F1]">
              Multi-Kanvas
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-9 h-9 rounded-xl bg-[#0F5132] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#0B3D2E] tracking-tight">
                Ruang Diskusi &amp; Ideasi
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {timNama} • {canvases.length} kanvas kolaboratif aktif
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Create New Canvas */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => {
              setNewTitle('');
              setCreateModalOpen(true);
            }}
            className="bg-[#0F5132] hover:bg-[#146C43] text-white font-extrabold text-xs px-4 h-10 rounded-xl shadow-xs gap-2 cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Buat Kanvas Baru</span>
          </Button>
        </div>
      </div>

      {/* Grid of Canvases */}
      {canvases.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#C9E4D0] p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F7F1] text-[#0F5132] mx-auto flex items-center justify-center border border-[#C9E4D0]">
            <Sparkles className="h-8 w-8 text-[#3E9463]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-[#0B3D2E]">Belum Ada Kanvas Diskusi</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Mulai brainstorming ide, kelompokkan catatan ideasi, dan sematkan kartu backlog referensi dengan membuat kanvas pertama Anda.
            </p>
          </div>
          <Button
            onClick={() => {
              setNewTitle('');
              setCreateModalOpen(true);
            }}
            className="bg-[#0F5132] hover:bg-[#146C43] text-white font-extrabold text-xs px-5 h-9 rounded-xl shadow-xs gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Kanvas Pertama</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {canvases.map((canvas) => {
            const isCreator = Boolean(currentUserId && canvas.createdByUserId === currentUserId);
            const canRename = isCreator || canManageAny;
            const canDelete = canManageAny;

            return (
              <div
                key={canvas.id}
                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-[#0F5132] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Top Accent Line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#0F5132] to-[#3E9463]" />

                <div className="p-5 space-y-4">
                  {/* Card Header & Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#F0F7F1] text-[#0F5132] flex items-center justify-center shrink-0 border border-[#C9E4D0]">
                        <Layers className="h-4 w-4 text-[#3E9463]" />
                      </div>
                      <Link
                        href={`/tim/${timId}/diskusi/${canvas.id}`}
                        className="text-sm font-extrabold text-[#0B3D2E] hover:text-[#0F5132] transition-colors line-clamp-1 block"
                        title={canvas.judul}
                      >
                        {canvas.judul}
                      </Link>
                    </div>

                    {/* Action Menu (Rename/Delete) */}
                    {(canRename || canDelete) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                            title="Menu Aksi"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-44 bg-white rounded-xl shadow-xl border border-[#C9E4D0] p-1 space-y-0.5">
                          {canRename && (
                            <button
                              type="button"
                              onClick={() => {
                                setRenameTarget(canvas);
                                setRenameTitle(canvas.judul);
                              }}
                              className="w-full text-left text-xs font-semibold text-gray-700 hover:text-[#0F5132] hover:bg-[#F0F7F1] rounded-lg px-2.5 py-1.5 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Ganti Nama</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(canvas)}
                              className="w-full text-left text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-1.5 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus Kanvas</span>
                            </button>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Badges / Stats */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                      📝 {canvas.stickyCount} Sticky
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-[#0F5132] border border-[#C9E4D0]">
                      <Layers className="h-3 w-3" />
                      {canvas.frameCount} Kelompok
                    </span>
                    {canvas.pinCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                        <Pin className="h-3 w-3 rotate-45" />
                        {canvas.pinCount} Pin
                      </span>
                    )}
                  </div>

                  {/* Metadata: Created by & Updated at */}
                  <div className="space-y-1 text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="truncate">
                        Dibuat oleh: <span className="font-semibold text-gray-700">{canvas.createdByName || 'Anonim'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>Diperbarui: {formatDateIndo(canvas.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Open Button */}
                <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Kanvas Ideasi
                  </span>
                  <Link
                    href={`/tim/${timId}/diskusi/${canvas.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0F5132] hover:text-[#146C43] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Buka Kanvas</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL 1: BUAT KANVAS BARU ────────────────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-[#C9E4D0] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0B3D2E] flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#3E9463]" />
              <span>Buat Kanvas Diskusi Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Beri judul topik atau tema diskusi untuk kanvas baru di tim {timNama}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Judul Diskusi *
              </label>
              <Input
                autoFocus
                placeholder="Contoh: Brainstorming Persona & Problem Statement"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs border-[#C9E4D0] focus:border-[#0F5132] rounded-xl h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating || !newTitle.trim()}
                className="bg-[#0F5132] hover:bg-[#146C43] text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Buat &amp; Buka Kanvas →</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: GANTI NAMA KANVAS ────────────────────────────────────────── */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-[#C9E4D0] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0B3D2E] flex items-center gap-2">
              <Pencil className="h-4 w-4 text-[#3E9463]" />
              <span>Ganti Nama Kanvas</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Perbarui judul kanvas diskusi ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRename} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Judul Kanvas Baru *
              </label>
              <Input
                autoFocus
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="text-xs border-[#C9E4D0] focus:border-[#0F5132] rounded-xl h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameTarget(null)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={renaming || !renameTitle.trim()}
                className="bg-[#0F5132] hover:bg-[#146C43] text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
              >
                {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Simpan Perubahan</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: KONFIRMASI HAPUS KANVAS ──────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-red-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Hapus Kanvas Diskusi?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1 leading-relaxed">
              Menghapus kanvas <strong className="text-gray-900">&quot;{deleteTarget?.judul}&quot;</strong> akan{' '}
              <strong className="text-red-700">menghapus secara permanen</strong> semua sticky note, kelompok ide, dan pin diskusi yang ada di dalamnya.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 font-medium">
            ⚠️ Tindakan ini bersifat destruktif dan tidak dapat dibatalkan.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Ya, Hapus Kanvas</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
