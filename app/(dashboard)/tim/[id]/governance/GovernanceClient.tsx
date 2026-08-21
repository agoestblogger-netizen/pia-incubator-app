"use client";

import { useState } from "react";
import { saveFmiNotulensiAction } from "@/app/actions/fmi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Award, Plus, CheckCircle2, FileText, Calendar } from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

export function GovernanceClient({
  timId,
  initialData,
}: {
  timId: string;
  initialData: any;
}) {
  const [notulensiList, setNotulensiList] = useState(initialData.notulensiList || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keputusanAkhir, setKeputusanAkhir] = useState("diadopsi");
  const [catatanNotulensi, setCatatanNotulensi] = useState("");
  const [diinputOleh, setDiinputOleh] = useState("Admin Innovation Center");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSaveFmi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const res = await saveFmiNotulensiAction(timId, {
      keputusanAkhir,
      catatanNotulensi,
      diinputOleh,
    });

    if (res.success && res.data) {
      setNotulensiList([res.data, ...notulensiList]);
      setIsModalOpen(false);
      setMsg("Notulensi dan keputusan FMI berhasil disimpan!");
    } else {
      alert(res.error || "Gagal menyimpan keputusan FMI.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Header & Aksi */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Sidang Forum Manajemen Inovasi
          </h3>
          <p className="text-xs text-gray-500">
            Pencatatan langsung hasil sidang tanpa workflow approval bertingkat
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs gap-1.5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Input Notulensi FMI</span>
        </Button>
      </div>

      {notulensiList.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-white">
          <Award className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Belum ada notulensi FMI tercatat</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Admin dapat menginput keputusan hasil sidang setelah tim menyelesaikan tahap validasi pasar.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notulensiList.map((item: any) => (
            <Card key={item.id} className="border-gray-200 overflow-hidden">
              <CardHeader className="bg-gray-50/60 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.keputusanAkhir === "diadopsi"
                          ? "gold"
                          : item.keputusanAkhir === "lanjut"
                          ? "success"
                          : "secondary"
                      }
                      className="text-xs font-bold uppercase"
                    >
                      Keputusan: {item.keputusanAkhir}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDateIndo(item.tanggal)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {item.catatanNotulensi || "Tidak ada catatan tambahan."}
                </p>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Dicatat oleh: {item.diinputOleh}</span>
                  <span>Tanggal Input: {formatDateIndo(item.tanggalInput)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Input Notulensi */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Notulensi Sidang FMI</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveFmi} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Keputusan Akhir Sidang FMI *
              </label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                value={keputusanAkhir}
                onChange={(e) => setKeputusanAkhir(e.target.value)}
              >
                <option value="diadopsi">🏆 DIADOPSI — Implementasi Penuh Skala Nasional</option>
                <option value="lanjut">🚀 LANJUT — Perluasan Pilot & Akselerasi Bertahap</option>
                <option value="iterasi">🔄 ITERASI — Penyempurnaan Fitur Tambahan</option>
                <option value="dihentikan">🛑 DIHENTIKAN — Proyek Dihentikan / Archived</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Catatan Notulensi & Arahan Direksi
              </label>
              <Textarea
                rows={4}
                required
                placeholder="Rangkuman arahan sponsor, persetujuan implementasi, dan PIC tindak lanjut..."
                value={catatanNotulensi}
                onChange={(e) => setCatatanNotulensi(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={saving} className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white">
                {saving ? "Menyimpan..." : "Simpan Notulensi FMI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
