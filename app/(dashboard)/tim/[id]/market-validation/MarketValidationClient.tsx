"use client";

import { useState } from "react";
import {
  saveMarketValidationPlanAction,
  saveMarketValidationReportAction,
} from "@/app/actions/market-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle2, Rocket, TrendingUp } from "lucide-react";

export function MarketValidationClient({
  timId,
  initialData,
}: {
  timId: string;
  initialData: any;
}) {
  const [planForm, setPlanForm] = useState({
    deskripsiMvp: initialData?.plan?.deskripsiMvp || "",
    mvpVersion: initialData?.plan?.mvpVersion || "v1.0-pilot",
    fiturMvpDirilis: initialData?.plan?.fiturMvpDirilis || "",
    channelRelease: initialData?.plan?.channelRelease || "Internal Web Pilot",
    targetEarlyAdopters: initialData?.plan?.targetEarlyAdopters || "50 Pengguna Aktif",
    lokasiPilot: initialData?.plan?.lokasiPilot || "3 Kantor Cabang Percontohan",
    jumlahTargetPengguna: initialData?.plan?.jumlahTargetPengguna || 50,
  });

  const [reportForm, setReportForm] = useState({
    mvpVersionDilaporkan: initialData?.report?.mvpVersionDilaporkan || "v1.0-pilot",
    jumlahEarlyAdoptersAktual: initialData?.report?.jumlahEarlyAdoptersAktual || 45,
    ringkasanAktivitasRilis: initialData?.report?.ringkasanAktivitasRilis || "",
    kendalaUtama: initialData?.report?.kendalaUtama || "",
    kesimpulanPmf: initialData?.report?.kesimpulanPmf || "",
    keputusanGoNogo: initialData?.report?.keputusanGoNogo || "go_ke_fmi",
    rekomendasiPromotorSponsor: initialData?.report?.rekomendasiPromotorSponsor || "",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await saveMarketValidationPlanAction(timId, planForm);
    if (res.success) setMsg("Market Validation Plan berhasil disimpan!");
    setSaving(false);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.plan?.id) {
      alert("Harap simpan Market Validation Plan terlebih dahulu.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await saveMarketValidationReportAction(initialData.plan.id, timId, reportForm);
    if (res.success) setMsg("Market Validation Report berhasil disimpan!");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{msg}</span>
        </div>
      )}

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plan" className="flex items-center gap-2 text-xs">
            <Rocket className="h-3.5 w-3.5" />
            <span>1. MVP Release Plan</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>2. PMF & Go/No-Go Report</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4 mt-4">
          <form onSubmit={handleSavePlan} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Rencana Rilis MVP Pilot
                </CardTitle>
                <CardDescription className="text-xs">
                  Cakupan fitur MVP yang dirilis ke pengguna nyata di lokasi pilot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Versi MVP</label>
                    <Input
                      value={planForm.mvpVersion}
                      onChange={(e) => setPlanForm({ ...planForm, mvpVersion: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Channel / Platform Rilis</label>
                    <Input
                      value={planForm.channelRelease}
                      onChange={(e) => setPlanForm({ ...planForm, channelRelease: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Deskripsi MVP & Nilai Utama</label>
                  <Textarea
                    rows={2}
                    placeholder="Deskripsikan fitur MVP yang langsung dapat digunakan..."
                    value={planForm.deskripsiMvp}
                    onChange={(e) => setPlanForm({ ...planForm, deskripsiMvp: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Fitur MVP yang Dirilis</label>
                  <Textarea
                    rows={2}
                    placeholder="Daftar modul/fitur yang aktif..."
                    value={planForm.fiturMvpDirilis}
                    onChange={(e) => setPlanForm({ ...planForm, fiturMvpDirilis: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Lokasi Pilot / Cabang Uji Coba</label>
                    <Input
                      value={planForm.lokasiPilot}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiPilot: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Target Jumlah Pengguna</label>
                    <Input
                      type="number"
                      value={planForm.jumlahTargetPengguna}
                      onChange={(e) => setPlanForm({ ...planForm, jumlahTargetPengguna: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2">
                <Save className="h-4 w-4" />
                <span>{saving ? "Menyimpan..." : "Simpan MVP Plan"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="report" className="space-y-4 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Laporan Hasil Pasar & Keputusan Go / No-Go FMI
                </CardTitle>
                <CardDescription className="text-xs">
                  Evaluasi ketercapaian Product-Market Fit (PMF) dan kesiapan sidang Forum Manajemen Inovasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Pengguna Aktif Aktual</label>
                    <Input
                      type="number"
                      value={reportForm.jumlahEarlyAdoptersAktual}
                      onChange={(e) => setReportForm({ ...reportForm, jumlahEarlyAdoptersAktual: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Keputusan Go / No-Go</label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                      value={reportForm.keputusanGoNogo}
                      onChange={(e) => setReportForm({ ...reportForm, keputusanGoNogo: e.target.value })}
                    >
                      <option value="go_ke_fmi">🟢 GO — Lanjut ke Forum Manajemen Inovasi (FMI)</option>
                      <option value="iterasi_mvp">🟡 ITERASI — Lakukan sprint perbaikan MVP</option>
                      <option value="hold">⏸️ HOLD — Tunda keputusan</option>
                      <option value="stop">🔴 STOP — Dihentikan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Ringkasan Aktivitas & Adopsi Pasar</label>
                  <Textarea
                    rows={3}
                    placeholder="Bagaimana respon dan tren transaksi/penggunaan selama periode pilot..."
                    value={reportForm.ringkasanAktivitasRilis}
                    onChange={(e) => setReportForm({ ...reportForm, ringkasanAktivitasRilis: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Kesimpulan Product-Market Fit (PMF)</label>
                  <Textarea
                    rows={2}
                    value={reportForm.kesimpulanPmf}
                    onChange={(e) => setReportForm({ ...reportForm, kesimpulanPmf: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Rekomendasi untuk Promotor & Sponsor</label>
                  <Textarea
                    rows={2}
                    value={reportForm.rekomendasiPromotorSponsor}
                    onChange={(e) => setReportForm({ ...reportForm, rekomendasiPromotorSponsor: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2">
                <Save className="h-4 w-4" />
                <span>{saving ? "Menyimpan..." : "Simpan Report & Keputusan"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
