"use client";

import { useState } from "react";
import {
  saveCustomerValidationPlanAction,
  saveCustomerValidationReportAction,
} from "@/app/actions/customer-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle2, FileCheck, ClipboardList } from "lucide-react";

export function CustomerValidationClient({
  timId,
  initialData,
}: {
  timId: string;
  initialData: any;
}) {
  const [planForm, setPlanForm] = useState({
    projectMission: initialData?.plan?.projectMission || "",
    customerDanContext: initialData?.plan?.customerDanContext || "",
    problemHypothesis: initialData?.plan?.problemHypothesis || "",
    solutionHypothesis: initialData?.plan?.solutionHypothesis || "",
    prototypeType: initialData?.plan?.prototypeType || "Figma / Clickable Prototype",
    fiturAlurDiuji: initialData?.plan?.fiturAlurDiuji || "",
    skenarioUserTesting: initialData?.plan?.skenarioUserTesting || "",
    targetEarlyAdopters: initialData?.plan?.targetEarlyAdopters || "",
    jumlahTargetResponden: initialData?.plan?.jumlahTargetResponden || 10,
    lokasiChannelTesting: initialData?.plan?.lokasiChannelTesting || "",
  });

  const [reportForm, setReportForm] = useState({
    validatedSolution: initialData?.report?.validatedSolution || "",
    valueProposition: initialData?.report?.valueProposition || "",
    fiturKunci1: initialData?.report?.fiturKunci1 || "",
    fiturKunci2: initialData?.report?.fiturKunci2 || "",
    fiturKunci3: initialData?.report?.fiturKunci3 || "",
    jumlahRespondenAktual: initialData?.report?.jumlahRespondenAktual || 10,
    profilRespondenAktual: initialData?.report?.profilRespondenAktual || "",
    kesimpulan: initialData?.report?.kesimpulan || "",
    ketercapaianPsf: initialData?.report?.ketercapaianPsf || "tercapai",
    keputusan: initialData?.report?.keputusan || "lanjut",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await saveCustomerValidationPlanAction(timId, planForm);
    if (res.success) setMsg("Customer Validation Plan berhasil disimpan!");
    setSaving(false);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.plan?.id) {
      alert("Harap simpan Customer Validation Plan terlebih dahulu.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await saveCustomerValidationReportAction(initialData.plan.id, timId, reportForm);
    if (res.success) setMsg("Customer Validation Report berhasil disimpan!");
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
            <ClipboardList className="h-3.5 w-3.5" />
            <span>1. Validation Plan</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2 text-xs">
            <FileCheck className="h-3.5 w-3.5" />
            <span>2. Validation Report (Hasil)</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Plan */}
        <TabsContent value="plan" className="space-y-4 mt-4">
          <form onSubmit={handleSavePlan} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Rencana Pengujian Pelanggan (Plan)
                </CardTitle>
                <CardDescription className="text-xs">
                  Instrumen dan skenario user testing sebelum turun ke lapangan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Tipe Prototype yang Diuji
                    </label>
                    <Input
                      value={planForm.prototypeType}
                      onChange={(e) => setPlanForm({ ...planForm, prototypeType: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Target Jumlah Responden
                    </label>
                    <Input
                      type="number"
                      value={planForm.jumlahTargetResponden}
                      onChange={(e) => setPlanForm({ ...planForm, jumlahTargetResponden: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Fitur / Alur yang Diuji
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Alur verifikasi identitas, kalkulasi otomatis, dll..."
                    value={planForm.fiturAlurDiuji}
                    onChange={(e) => setPlanForm({ ...planForm, fiturAlurDiuji: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Skenario User Testing
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Instruksi tugas yang diberikan kepada responden saat mencoba prototype..."
                    value={planForm.skenarioUserTesting}
                    onChange={(e) => setPlanForm({ ...planForm, skenarioUserTesting: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Kriteria Early Adopters
                    </label>
                    <Input
                      placeholder="Penaksir dengan masa kerja > 2 tahun"
                      value={planForm.targetEarlyAdopters}
                      onChange={(e) => setPlanForm({ ...planForm, targetEarlyAdopters: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Lokasi / Channel Testing
                    </label>
                    <Input
                      placeholder="Cabang Kramat Jati & Rawamangun"
                      value={planForm.lokasiChannelTesting}
                      onChange={(e) => setPlanForm({ ...planForm, lokasiChannelTesting: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2">
                <Save className="h-4 w-4" />
                <span>{saving ? "Menyimpan..." : "Simpan Validation Plan"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Report */}
        <TabsContent value="report" className="space-y-4 mt-4">
          <form onSubmit={handleSaveReport} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Laporan Hasil Validasi Pelanggan (Report)
                </CardTitle>
                <CardDescription className="text-xs">
                  Ringkasan temuan pengujian, PSF, dan keputusan kelanjutan ke tahap Market Validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Validated Solution (Solusi yang Terbukti Dibutuhkan)
                  </label>
                  <Textarea
                    rows={2}
                    value={reportForm.validatedSolution}
                    onChange={(e) => setReportForm({ ...reportForm, validatedSolution: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 1</label>
                    <Input
                      value={reportForm.fiturKunci1}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 2</label>
                    <Input
                      value={reportForm.fiturKunci2}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci2: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">Fitur Kunci 3</label>
                    <Input
                      value={reportForm.fiturKunci3}
                      onChange={(e) => setReportForm({ ...reportForm, fiturKunci3: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Ketercapaian PSF (Problem-Solution Fit)
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                      value={reportForm.ketercapaianPsf}
                      onChange={(e) => setReportForm({ ...reportForm, ketercapaianPsf: e.target.value })}
                    >
                      <option value="tercapai">Tercapai (Fit)</option>
                      <option value="tercapai_dengan_catatan">Tercapai dengan Catatan</option>
                      <option value="belum_tercapai">Belum Tercapai (Perlu Iterasi)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Keputusan Lanjut
                    </label>
                    <select
                      className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                      value={reportForm.keputusan}
                      onChange={(e) => setReportForm({ ...reportForm, keputusan: e.target.value })}
                    >
                      <option value="lanjut">Lanjut ke Market Validation (MVP Release)</option>
                      <option value="iterasi">Iterasi Solusi / Prototype Ulang</option>
                      <option value="hold">Hold / Tunda</option>
                      <option value="stop">Stop (Hentikan Proyek)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kesimpulan & Pembelajaran Utama
                  </label>
                  <Textarea
                    rows={3}
                    value={reportForm.kesimpulan}
                    onChange={(e) => setReportForm({ ...reportForm, kesimpulan: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white gap-2">
                <Save className="h-4 w-4" />
                <span>{saving ? "Menyimpan..." : "Simpan Validation Report"}</span>
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
