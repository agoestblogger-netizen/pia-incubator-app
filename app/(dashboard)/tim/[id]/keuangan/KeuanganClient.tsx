"use client";

import { useState } from "react";
import {
  submitAnggaranAction,
  updateAnggaranAction,
  deleteAnggaranAction,
  submitLpjAction,
  authorizeAnggaranAction,
  approveLpjAction,
} from "@/app/actions/keuangan";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Plus,
  Wallet,
  FileText,
  CheckCircle2,
  Clock,
  Upload,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export function KeuanganClient({
  timId,
  initialList,
  canSubmit = false,
  canManage = false,
}: {
  timId: string;
  initialList: any[];
  canSubmit?: boolean;
  canManage?: boolean;
}) {
  const [list, setList] = useState(initialList);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isLpjOpen, setIsLpjOpen] = useState(false);
  const [activeAnggaranId, setActiveAnggaranId] = useState<string | null>(null);

  // Edit Anggaran Modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string;
    fase: string;
    nominalDiajukan: number;
    fileDokumenUrl: string;
  }>({
    open: false,
    id: "",
    fase: "customer_validation",
    nominalDiajukan: 10000000,
    fileDokumenUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    nominal: number;
    fase: string;
  }>({
    open: false,
    id: "",
    nominal: 0,
    fase: "",
  });
  const [deleting, setDeleting] = useState(false);

  // Approval Modal state
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    type: "anggaran" | "lpj";
    targetId: string;
    action: "approve" | "reject";
    nominal?: number;
    fase?: string;
  }>({
    open: false,
    type: "anggaran",
    targetId: "",
    action: "approve",
  });
  const [approvalNotes, setApprovalNotes] = useState("");
  const [processingApproval, setProcessingApproval] = useState(false);

  // Form Anggaran
  const [fase, setFase] = useState("customer_validation");
  const [nominalDiajukan, setNominalDiajukan] = useState(10000000);
  const [fileDokumenUrl, setFileDokumenUrl] = useState("");

  // Form LPJ
  const [lpjDocUrl, setLpjDocUrl] = useState("");
  const [tglKegiatanSelesai, setTglKegiatanSelesai] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmitAnggaran = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const res = await submitAnggaranAction(timId, {
      fase,
      nominalDiajukan: Number(nominalDiajukan),
      fileDokumenUrl,
    });

    if (res.success && res.data) {
      setList([res.data, ...list]);
      setIsSubmitOpen(false);
      setMsg({ type: "success", text: "Pengajuan anggaran berhasil dikirim!" });
    } else {
      alert(res.error || "Gagal mengajukan anggaran.");
    }
    setSaving(false);
  };

  const handleOpenEdit = (item: any) => {
    setEditModal({
      open: true,
      id: item.id,
      fase: item.fase,
      nominalDiajukan: item.nominalDiajukan,
      fileDokumenUrl: item.fileDokumenUrl || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    setMsg(null);

    const res = await updateAnggaranAction(editModal.id, timId, {
      fase: editModal.fase,
      nominalDiajukan: Number(editModal.nominalDiajukan),
      fileDokumenUrl: editModal.fileDokumenUrl,
    });

    if (res.success && res.data) {
      setList((prev) =>
        prev.map((item) => (item.id === editModal.id ? { ...item, ...res.data } : item))
      );
      setEditModal((prev) => ({ ...prev, open: false }));
      setMsg({ type: "success", text: "Pengajuan anggaran berhasil diperbarui!" });
    } else {
      alert(res.error || "Gagal mengubah pengajuan anggaran.");
    }
    setSavingEdit(false);
  };

  const handleOpenDelete = (item: any) => {
    setDeleteModal({
      open: true,
      id: item.id,
      nominal: item.nominalDiajukan,
      fase: item.fase,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    setMsg(null);

    const res = await deleteAnggaranAction(deleteModal.id, timId);

    if (res.success) {
      setList((prev) => prev.filter((item) => item.id !== deleteModal.id));
      setDeleteModal({ open: false, id: "", nominal: 0, fase: "" });
      setMsg({ type: "success", text: "Pengajuan anggaran berhasil dibatalkan / dihapus!" });
    } else {
      alert(res.error || "Gagal membatalkan pengajuan anggaran.");
    }
    setDeleting(false);
  };

  const handleSubmitLpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnggaranId) return;
    setSaving(true);
    setMsg(null);

    const res = await submitLpjAction(activeAnggaranId, timId, {
      fileDokumenUrl: lpjDocUrl,
      tanggalKegiatanSelesai: new Date(tglKegiatanSelesai),
    });

    if (res.success) {
      setIsLpjOpen(false);
      setMsg({ type: "success", text: "Laporan Pertanggungjawaban (LPJ) berhasil dikirim!" });
      window.location.reload();
    } else {
      alert(res.error || "Gagal mengirim LPJ.");
    }
    setSaving(false);
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingApproval(true);
    setMsg(null);

    if (approvalModal.type === "anggaran") {
      const status = approvalModal.action === "approve" ? "diotorisasi" : "ditolak";
      const res = await authorizeAnggaranAction(
        approvalModal.targetId,
        timId,
        status,
        approvalNotes
      );

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) => (item.id === approvalModal.targetId ? { ...item, ...res.data } : item))
        );
        setMsg({
          type: "success",
          text: `Pengajuan anggaran berhasil ${status === "diotorisasi" ? "diotorisasi (disetujui)" : "ditolak"}.`,
        });
        setApprovalModal({ open: false, type: "anggaran", targetId: "", action: "approve" });
        setApprovalNotes("");
      } else {
        alert(res.error || "Gagal memproses otorisasi anggaran.");
      }
    } else {
      const status = approvalModal.action === "approve" ? "disetujui" : "ditolak";
      const res = await approveLpjAction(
        approvalModal.targetId,
        timId,
        status,
        approvalNotes
      );

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) =>
            item.lpj?.id === approvalModal.targetId
              ? { ...item, lpj: { ...item.lpj, ...res.data } }
              : item
          )
        );
        setMsg({
          type: "success",
          text: `Laporan Pertanggungjawaban (LPJ) berhasil ${status === "disetujui" ? "disetujui" : "ditolak"}.`,
        });
        setApprovalModal({ open: false, type: "lpj", targetId: "", action: "approve" });
        setApprovalNotes("");
      } else {
        alert(res.error || "Gagal memproses persetujuan LPJ.");
      }
    }

    setProcessingApproval(false);
  };

  return (
    <div className="space-y-6">
      {/* Role Banner Info */}
      {canManage && !canSubmit && (
        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Mode Otorisasi / Approval:</strong> Anda memiliki kewenangan untuk meninjau, mengotorisasi, dan menyetujui pengajuan anggaran & LPJ tim ini.
            </span>
          </div>
        </div>
      )}

      {/* Header & Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Riwayat Pengajuan Anggaran
          </h3>
          <p className="text-xs text-gray-500">
            Maksimal pengajuan Rp 20.000.000 per fase kegiatan
          </p>
        </div>

        {/* Tombol Ajukan Anggaran Baru HANYA muncul jika canSubmit = true (PO / Tim Inisiator) */}
        {canSubmit && (
          <Button
            onClick={() => setIsSubmitOpen(true)}
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs gap-1.5 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Ajukan Anggaran Baru</span>
          </Button>
        )}
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-white">
          <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Belum ada pengajuan anggaran</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {canSubmit
              ? "Klik tombol di atas untuk mengajukan dana operasional validasi."
              : "Belum ada permohonan anggaran yang diajukan oleh tim inovator."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((item) => {
            const isPendingAnggaran = item.status === "diajukan" || item.status === "dinilai";
            const isPendingLpj = item.lpj && (item.lpj.status === "dikirim" || item.lpj.status === "terlambat");

            return (
              <Card key={item.id} className="overflow-hidden border-gray-200 bg-white">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                        Fase {item.fase.replace("_", " ")}
                      </span>
                      <Badge
                        variant={
                          item.status === "diotorisasi"
                            ? "secondary"
                            : item.status === "ditolak"
                            ? "destructive"
                            : "outline"
                        }
                        className={`text-[10px] capitalize ${
                          item.status === "diotorisasi"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : item.status === "ditolak"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        Status: {item.status}
                      </Badge>
                    </div>
                    <h4 className="text-lg font-extrabold text-[#0F5132]">
                      {formatRupiah(item.nominalDiajukan)}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span>Diajukan pada: {formatDateIndo(item.tanggalPengajuan)}</span>
                      {item.fileDokumenUrl && (
                        <a
                          href={item.fileDokumenUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0F5132] hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Lihat Dokumen RAB</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {item.catatanPenilaian && (
                      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100 mt-1">
                        <span className="font-semibold">Catatan Otorisasi:</span> {item.catatanPenilaian}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {/* Action Edit / Batalkan HANYA untuk pemilik izin submit (PO) saat status masih 'diajukan' */}
                    {canSubmit && item.status === "diajukan" && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="text-xs h-7 px-2.5 font-semibold text-gray-700 hover:text-gray-900 border-gray-300 gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDelete(item)}
                          className="text-xs h-7 px-2.5 font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Batalkan</span>
                        </Button>
                      </div>
                    )}

                    {/* Status Otorisasi Anggaran Actions for Approver (Divisi IC / Admin) */}
                    {canManage && isPendingAnggaran && (
                      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                        <span className="text-[11px] font-semibold text-gray-600 px-1">Otorisasi RAB:</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setApprovalNotes("");
                            setApprovalModal({
                              open: true,
                              type: "anggaran",
                              targetId: item.id,
                              action: "approve",
                              nominal: item.nominalDiajukan,
                              fase: item.fase,
                            });
                          }}
                          className="bg-green-700 hover:bg-green-800 text-white h-7 px-2.5 text-xs font-semibold gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Otorisasi</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setApprovalNotes("");
                            setApprovalModal({
                              open: true,
                              type: "anggaran",
                              targetId: item.id,
                              action: "reject",
                              nominal: item.nominalDiajukan,
                              fase: item.fase,
                            });
                          }}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-7 px-2.5 text-xs font-semibold gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    )}

                    {/* LPJ Section */}
                    {item.lpj ? (
                      <div className="text-right space-y-1.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-gray-400">Status LPJ:</span>
                          <Badge
                            className={`text-[10px] capitalize ${
                              item.lpj.status === "disetujui"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : item.lpj.status === "ditolak"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            LPJ {item.lpj.status}
                          </Badge>
                        </div>
                        {item.lpj.fileDokumenUrl && (
                          <a
                            href={item.lpj.fileDokumenUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#0F5132] hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Lihat LPJ</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}

                        {/* Approver actions for LPJ */}
                        {canManage && isPendingLpj && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                setApprovalNotes("");
                                setApprovalModal({
                                  open: true,
                                  type: "lpj",
                                  targetId: item.lpj.id,
                                  action: "approve",
                                });
                              }}
                              className="bg-green-700 hover:bg-green-800 text-white h-6 px-2 text-[11px] font-semibold gap-1"
                            >
                              <Check className="h-3 w-3" />
                              <span>Setujui LPJ</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setApprovalNotes("");
                                setApprovalModal({
                                  open: true,
                                  type: "lpj",
                                  targetId: item.lpj.id,
                                  action: "reject",
                                });
                              }}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-6 px-2 text-[11px] font-semibold gap-1"
                            >
                              <X className="h-3 w-3" />
                              <span>Tolak</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Submit LPJ HANYA muncul jika canSubmit = true dan Anggaran sudah diotorisasi */
                      canSubmit && item.status === "diotorisasi" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveAnggaranId(item.id);
                            setIsLpjOpen(true);
                          }}
                          className="text-xs font-semibold gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Submit LPJ</span>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Submit Anggaran (Hanya untuk canSubmit) */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formulir Pengajuan Anggaran (RAB)</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Isi rencana anggaran biaya untuk fase kegiatan inovasi tim Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAnggaran} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Fase Kegiatan</label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                value={fase}
                onChange={(e) => setFase(e.target.value)}
              >
                <option value="customer_validation">Customer Validation (Tahap 2)</option>
                <option value="market_validation">Market Validation (Tahap 3)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Nominal yang Diajukan (Maks Rp 20.000.000)
              </label>
              <Input
                type="number"
                max={20000000}
                required
                value={nominalDiajukan}
                onChange={(e) => setNominalDiajukan(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Link File Dokumen RAB (Google Drive / OneDrive)
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={fileDokumenUrl}
                onChange={(e) => setFileDokumenUrl(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={saving} className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengirim Pengajuan...</span>
                  </>
                ) : (
                  <span>Kirim Pengajuan Anggaran</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Pengajuan Anggaran (Hanya untuk canSubmit saat status = 'diajukan') */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => {
          if (!open) setEditModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengajuan Anggaran (RAB)</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Perbarui rincian nominal atau tautan dokumen RAB selama status masih Diajukan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Fase Kegiatan</label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                value={editModal.fase}
                onChange={(e) => setEditModal((prev) => ({ ...prev, fase: e.target.value }))}
              >
                <option value="customer_validation">Customer Validation (Tahap 2)</option>
                <option value="market_validation">Market Validation (Tahap 3)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Nominal yang Diajukan (Maks Rp 20.000.000)
              </label>
              <Input
                type="number"
                max={20000000}
                required
                value={editModal.nominalDiajukan}
                onChange={(e) =>
                  setEditModal((prev) => ({ ...prev, nominalDiajukan: Number(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Link File Dokumen RAB (Google Drive / OneDrive)
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={editModal.fileDokumenUrl}
                onChange={(e) =>
                  setEditModal((prev) => ({ ...prev, fileDokumenUrl: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus / Batalkan Anggaran (Hanya untuk canSubmit saat status = 'diajukan') */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!open) setDeleteModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Batalkan & Hapus Pengajuan Anggaran?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Apakah Anda yakin ingin membatalkan pengajuan anggaran sebesar{" "}
              <strong>{formatRupiah(deleteModal.nominal)}</strong> untuk Fase{" "}
              <strong>{deleteModal.fase.replace("_", " ")}</strong>?
              <br />
              <span className="text-red-500 font-medium">Tindakan ini tidak dapat diurungkan.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModal((prev) => ({ ...prev, open: false }))}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={deleting}
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Ya, Batalkan Pengajuan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Submit LPJ (Hanya untuk canSubmit) */}
      <Dialog open={isLpjOpen} onOpenChange={setIsLpjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Laporan Pertanggungjawaban (LPJ)</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Unggah tautan bukti kegiatan dan kwitansi pertanggungjawaban dana.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLpj} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Tanggal Kegiatan Selesai *
              </label>
              <Input
                type="date"
                required
                value={tglKegiatanSelesai}
                onChange={(e) => setTglKegiatanSelesai(e.target.value)}
              />
              <p className="text-[10px] text-gray-400">
                Batas pengiriman LPJ adalah 10 hari kerja setelah kegiatan selesai.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Link Dokumen LPJ & Kwitansi *
              </label>
              <Input
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={lpjDocUrl}
                onChange={(e) => setLpjDocUrl(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={saving} className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white">
                {saving ? "Mengirim..." : "Kirim LPJ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Otorisasi / Approval (Hanya untuk canManage) */}
      <Dialog
        open={approvalModal.open}
        onOpenChange={(open) => {
          if (!open) setApprovalModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0F5132]" />
              {approvalModal.action === "approve"
                ? `Konfirmasi Otorisasi ${approvalModal.type === "anggaran" ? "Anggaran RAB" : "LPJ"}`
                : `Konfirmasi Tolak ${approvalModal.type === "anggaran" ? "Anggaran RAB" : "LPJ"}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {approvalModal.action === "approve"
                ? `Apakah Anda yakin ingin menyetujui pengajuan ${approvalModal.type === "anggaran" ? `anggaran ${approvalModal.nominal ? formatRupiah(approvalModal.nominal) : ""}` : "LPJ"} ini?`
                : `Berikan catatan alasan penolakan pengajuan ${approvalModal.type === "anggaran" ? "anggaran" : "LPJ"}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmApproval} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Catatan Otorisasi / Keterangan (Opsional)
              </label>
              <Input
                placeholder="Contoh: Disetujui sesuai rincian RAB yang diajukan..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApprovalModal((prev) => ({ ...prev, open: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={processingApproval}
                size="sm"
                className={
                  approvalModal.action === "approve"
                    ? "bg-green-700 hover:bg-green-800 text-white text-xs font-bold gap-1.5"
                    : "bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
                }
              >
                {processingApproval ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : approvalModal.action === "approve" ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Konfirmasi Otorisasi
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Konfirmasi Tolak
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

