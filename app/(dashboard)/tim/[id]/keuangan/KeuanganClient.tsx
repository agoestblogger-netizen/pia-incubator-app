"use client";

import { useState } from "react";
import { submitAnggaranAction, submitLpjAction } from "@/app/actions/keuangan";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wallet, FileText, CheckCircle2, Clock, Upload, ArrowUpRight } from "lucide-react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export function KeuanganClient({
  timId,
  initialList,
}: {
  timId: string;
  initialList: any[];
}) {
  const [list, setList] = useState(initialList);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isLpjOpen, setIsLpjOpen] = useState(false);
  const [activeAnggaranId, setActiveAnggaranId] = useState<string | null>(null);

  // Form Anggaran
  const [fase, setFase] = useState("customer_validation");
  const [nominalDiajukan, setNominalDiajukan] = useState(10000000);
  const [fileDokumenUrl, setFileDokumenUrl] = useState("");

  // Form LPJ
  const [lpjDocUrl, setLpjDocUrl] = useState("");
  const [tglKegiatanSelesai, setTglKegiatanSelesai] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      setMsg("Pengajuan anggaran berhasil dikirim!");
    } else {
      alert(res.error || "Gagal mengajukan anggaran.");
    }
    setSaving(false);
  };

  const handleSubmitLpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnggaranId) return;
    setSaving(true);

    const res = await submitLpjAction(activeAnggaranId, timId, {
      fileDokumenUrl: lpjDocUrl,
      tanggalKegiatanSelesai: new Date(tglKegiatanSelesai),
    });

    if (res.success) {
      setIsLpjOpen(false);
      setMsg("Laporan Pertanggungjawaban (LPJ) berhasil dikirim!");
      window.location.reload();
    } else {
      alert(res.error || "Gagal mengirim LPJ.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Riwayat Pengajuan Anggaran
          </h3>
          <p className="text-xs text-gray-500">
            Maksimal pengajuan Rp 20.000.000 per fase kegiatan
          </p>
        </div>

        <Button
          onClick={() => setIsSubmitOpen(true)}
          className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs gap-1.5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Ajukan Anggaran Baru</span>
        </Button>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{msg}</span>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-white">
          <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Belum ada pengajuan anggaran</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Klik tombol di atas untuk mengajukan dana operasional validasi.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <Card key={item.id} className="overflow-hidden border-gray-200">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                      Fase {item.fase.replace("_", " ")}
                    </span>
                    <Badge
                      variant={
                        item.status === "diotorisasi"
                          ? "success"
                          : item.status === "ditolak"
                          ? "destructive"
                          : "warning"
                      }
                      className="text-[10px] capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <h4 className="text-lg font-extrabold text-[#0F5132]">
                    {formatRupiah(item.nominalDiajukan)}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Diajukan pada: {formatDateIndo(item.tanggalPengajuan)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {item.lpj ? (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Status LPJ</span>
                      <Badge
                        variant={item.lpj.status === "disetujui" ? "success" : "warning"}
                        className="text-[10px] capitalize"
                      >
                        LPJ {item.lpj.status}
                      </Badge>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Submit Anggaran */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formulir Pengajuan Anggaran (RAB)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitAnggaran} className="space-y-3">
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
              <Button type="submit" disabled={saving} className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white">
                {saving ? "Mengirim..." : "Kirim Pengajuan Anggaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Submit LPJ */}
      <Dialog open={isLpjOpen} onOpenChange={setIsLpjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Laporan Pertanggungjawaban (LPJ)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitLpj} className="space-y-3">
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
    </div>
  );
}
