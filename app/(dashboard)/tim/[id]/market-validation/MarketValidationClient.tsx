"use client";

import { useState } from "react";
import {
  saveMarketValidationPlanAction,
  saveMarketValidationReportAction,
  approveMarketValidationReportAction,
  revokeMarketValidationReportApprovalAction,
} from "@/app/actions/market-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  CheckCircle2,
  Rocket,
  TrendingUp,
  Stamp,
  RotateCcw,
  Loader2,
  FileCheck2,
  AlertCircle,
  Briefcase,
  Building2,
} from "lucide-react";
import { toast } from "@/components/ui/ToastProvider";
import { SignaturePadModal } from "@/components/ui/SignaturePad";

export function MarketValidationClient({
  timId,
  initialData,
  canEdit = true,
  canApprove = false,
  currentUser,
}: {
  timId: string;
  initialData: any;
  canEdit?: boolean;
  canApprove?: boolean;
  currentUser?: any;
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

  const [reportTtdDisetujui, setReportTtdDisetujui] = useState<any | null>(
    initialData?.report?.ttdDisetujui || null
  );

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isReadOnly = !canEdit;

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setMsg(null);
    const res = await saveMarketValidationPlanAction(timId, planForm);
    if (res.success) {
      toast.success("Market Validation Plan berhasil disimpan!", "Plan Tersimpan");
      setMsg({ type: "success", text: "Market Validation Plan berhasil disimpan!" });
    } else {
      const errMsg = res.error || "Gagal menyimpan plan.";
      toast.error(errMsg, "Gagal Menyimpan");
      setMsg({ type: "error", text: errMsg });
    }
    setSaving(false);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!initialData?.plan?.id) {
      toast.error("Harap simpan Market Validation Plan terlebih dahulu sebelum mengisi laporan.", "Validasi Diperlukan");
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await saveMarketValidationReportAction(initialData.plan.id, timId, reportForm);
    if (res.success) {
      toast.success("Market Validation Report berhasil disimpan!", "Laporan Tersimpan");
      setMsg({ type: "success", text: "Market Validation Report berhasil disimpan!" });
    } else {
      const errMsg = res.error || "Gagal menyimpan report.";
      toast.error(errMsg, "Gagal Menyimpan");
      setMsg({ type: "error", text: errMsg });
    }
    setSaving(false);
  };

  const [isSigModalOpen, setIsSigModalOpen] = useState(false);

  const handleApproveReport = () => {
    if (!initialData?.report?.id) {
      toast.error("Laporan Market Validation belum disimpan oleh tim.", "Laporan Belum Ada");
      return;
    }
    setIsSigModalOpen(true);
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!initialData?.report?.id) {
      toast.error("Laporan Market Validation belum disimpan oleh tim.", "Laporan Belum Ada");
      return;
    }
    setApproving(true);
    setMsg(null);

    const res = await approveMarketValidationReportAction(initialData.report.id, timId, dataUrl);
    if (res.success && res.ttdDisetujui) {
      setReportTtdDisetujui(res.ttdDisetujui);
      toast.success("Laporan Market Validation berhasil disetujui secara formal oleh Promotor!", "Persetujuan Berhasil");
      setMsg({
        type: "success",
        text: "Laporan Market Validation berhasil disetujui secara formal oleh Promotor!",
      });
    } else {
      const errMsg = res.error || "Gagal menyetujui laporan.";
      toast.error(errMsg, "Gagal Menyetujui");
      setMsg({ type: "error", text: errMsg });
    }
    setApproving(false);
  };

  const handleRevokeApproval = async () => {
    if (!initialData?.report?.id) return;
    if (!confirm("Batalkan persetujuan formal Laporan Market Validation ini?")) return;
    setApproving(true);
    setMsg(null);

    const res = await revokeMarketValidationReportApprovalAction(initialData.report.id, timId);
    if (res.success) {
      setReportTtdDisetujui(null);
      toast.info("Persetujuan formal Laporan Market Validation telah dibatalkan untuk revisi tim.", "Persetujuan Dibatalkan");
      setMsg({
        type: "success",
        text: "Persetujuan formal Laporan Market Validation telah dibatalkan untuk revisi tim.",
      });
    } else {
      const errMsg = res.error || "Gagal membatalkan persetujuan.";
      toast.error(errMsg, "Gagal Membatalkan");
      setMsg({ type: "error", text: errMsg });
    }
    setApproving(false);
  };

  return (
    <div className="space-y-4">
      {/* Read-Only Notice Banner for Promotor / Viewer */}
      {isReadOnly && (
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <strong>Mode Tinjauan & Persetujuan (Read-Only)</strong> &mdash; Anda dapat meninjau data market validation dan memberikan persetujuan formal Laporan pada tab Report di bawah.
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msg.text}</span>
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
            <Card className="rounded-2xl border-gray-200">
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
                      disabled={isReadOnly}
                      value={planForm.mvpVersion}
                      onChange={(e) => setPlanForm({ ...planForm, mvpVersion: e.target.value })}
                      className="disabled:bg-gray-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Channel / Media Rilis</label>
                    <Input
                      disabled={isReadOnly}
                      value={planForm.channelRelease}
                      onChange={(e) => setPlanForm({ ...planForm, channelRelease: e.target.value })}
                      className="disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Deskripsi Ringkas MVP</label>
                  <Textarea
                    disabled={isReadOnly}
                    rows={2}
                    placeholder="Apa inti fungsi yang diberikan MVP pada versi pilot ini..."
                    value={planForm.deskripsiMvp}
                    onChange={(e) => setPlanForm({ ...planForm, deskripsiMvp: e.target.value })}
                    className="disabled:bg-gray-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Fitur MVP yang Dirilis</label>
                  <Textarea
                    disabled={isReadOnly}
                    rows={2}
                    placeholder="Daftar modul/fitur fungsional..."
                    value={planForm.fiturMvpDirilis}
                    onChange={(e) => setPlanForm({ ...planForm, fiturMvpDirilis: e.target.value })}
                    className="disabled:bg-gray-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Target Early Adopters</label>
                    <Input
                      disabled={isReadOnly}
                      value={planForm.targetEarlyAdopters}
                      onChange={(e) => setPlanForm({ ...planForm, targetEarlyAdopters: e.target.value })}
                      className="disabled:bg-gray-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Lokasi Pilot</label>
                    <Input
                      disabled={isReadOnly}
                      value={planForm.lokasiPilot}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiPilot: e.target.value })}
                      className="disabled:bg-gray-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Jumlah Target Pengguna</label>
                    <Input
                      disabled={isReadOnly}
                      type="number"
                      value={planForm.jumlahTargetPengguna}
                      onChange={(e) => setPlanForm({ ...planForm, jumlahTargetPengguna: Number(e.target.value) })}
                      className="disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isReadOnly && (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2 h-10 px-6 rounded-xl">
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Menyimpan..." : "Simpan MVP Plan"}</span>
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        <TabsContent value="report" className="space-y-4 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-4">
            <Card className="rounded-2xl border-gray-200">
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
                      disabled={isReadOnly}
                      type="number"
                      value={reportForm.jumlahEarlyAdoptersAktual}
                      onChange={(e) => setReportForm({ ...reportForm, jumlahEarlyAdoptersAktual: Number(e.target.value) })}
                      className="disabled:bg-gray-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Keputusan Go / No-Go</label>
                    <select
                      disabled={isReadOnly}
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg disabled:bg-gray-50"
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
                    disabled={isReadOnly}
                    rows={3}
                    placeholder="Bagaimana respon dan tren transaksi/penggunaan selama periode pilot..."
                    value={reportForm.ringkasanAktivitasRilis}
                    onChange={(e) => setReportForm({ ...reportForm, ringkasanAktivitasRilis: e.target.value })}
                    className="disabled:bg-gray-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Kesimpulan Product-Market Fit (PMF)</label>
                  <Textarea
                    disabled={isReadOnly}
                    rows={2}
                    value={reportForm.kesimpulanPmf}
                    onChange={(e) => setReportForm({ ...reportForm, kesimpulanPmf: e.target.value })}
                    className="disabled:bg-gray-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Rekomendasi untuk Promotor & Sponsor</label>
                  <Textarea
                    disabled={isReadOnly}
                    rows={2}
                    value={reportForm.rekomendasiPromotorSponsor}
                    onChange={(e) => setReportForm({ ...reportForm, rekomendasiPromotorSponsor: e.target.value })}
                    className="disabled:bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Formal Promotor Approval Stamp Card */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-950/5 via-white to-emerald-950/5 border-b border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Stamp className="h-5 w-5 text-[#0F5132]" />
                      Persetujuan Formal Promotor Inovasi
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-1">
                      Pengesahan hasil validasi pasar sebelum diajukan ke Forum Manajemen Inovasi (FMI).
                    </CardDescription>
                  </div>

                  {reportTtdDisetujui?.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
                      <FileCheck2 className="h-4 w-4 text-green-700" />
                      Disetujui Formal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                      Menunggu Persetujuan Promotor
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Signature Box */}
                  <div
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      reportTtdDisetujui?.status === 'approved'
                        ? 'border-[#0F5132]/40 bg-emerald-50/50 shadow-xs'
                        : 'border-dashed border-gray-200 bg-gray-50/60'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Disetujui Oleh (Promotor Inovasi):
                    </div>

                    {reportTtdDisetujui?.status === 'approved' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{reportTtdDisetujui.nama}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#0F5132] text-white">
                            Verified
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                          <span>{reportTtdDisetujui.jabatan}</span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          <span>{reportTtdDisetujui.unit}</span>
                        </div>
                        {reportTtdDisetujui.signatureImage && (
                          <div className="bg-white p-1.5 rounded-lg border border-emerald-200/80 shadow-2xs max-w-[140px] my-2">
                            <img
                              src={reportTtdDisetujui.signatureImage}
                              alt="Tanda Tangan Promotor"
                              className="h-12 w-auto object-contain block"
                            />
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400 pt-1 font-mono">
                          Waktu Persetujuan: {new Date(reportTtdDisetujui.tanggal).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 text-xs text-gray-400 italic flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-gray-300" />
                        <span>Belum ada tanda tangan persetujuan formal dari Promotor.</span>
                      </div>
                    )}
                  </div>

                  {/* Approval Action Controls */}
                  <div className="space-y-3">
                    {canApprove && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="text-xs font-bold text-gray-800">
                          Aksi Persetujuan Promotor
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Sebagai Promotor tim, klik tombol di bawah untuk membubuhkan tanda tangan formal digital dan menyetujui Laporan Hasil Pasar ini.
                        </p>

                        <div className="flex items-center gap-3">
                          {reportTtdDisetujui?.status === 'approved' ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={approving}
                              onClick={handleRevokeApproval}
                              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1.5 h-10 rounded-xl"
                            >
                              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                              <span>Batalkan Persetujuan (Revisi)</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={approving}
                              onClick={handleApproveReport}
                              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-2 h-10 px-6 rounded-xl shadow-sm"
                            >
                              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                              <span>Setujui Laporan Market Validation</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isReadOnly && (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2 h-10 px-6 rounded-xl shadow-sm">
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Menyimpan..." : "Simpan Report & Keputusan"}</span>
                </Button>
              </div>
            )}
          </form>
        </TabsContent>
      </Tabs>

      {/* Signature Pad Modal for Promotor */}
      <SignaturePadModal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSave={handleSaveSignature}
        title="Persetujuan Formal Promotor Inovasi"
        roleName="Promotor Inovasi"
        userName={currentUser?.nama || "Promotor Inovasi"}
      />
    </div>
  );
}
