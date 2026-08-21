"use client";

import { useState } from "react";
import { saveCharterAction } from "@/app/actions/charter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, CheckCircle2 } from "lucide-react";

export function CharterFormClient({
  timId,
  initialData,
}: {
  timId: string;
  initialData: any;
}) {
  const [formData, setFormData] = useState({
    projectMission: initialData?.projectMission || "",
    customerEarlyAdopters: initialData?.customerEarlyAdopters || "",
    contextAreaBantuan: initialData?.contextAreaBantuan || "",
    problemWorthSolving: initialData?.problemWorthSolving || "",
    hmw: initialData?.hmw || "",
    opportunityStatement: initialData?.opportunityStatement || "",
    businessOpportunity: initialData?.businessOpportunity || "",
    solusiAwal: initialData?.solusiAwal || "",
    desirabilityHypothesis: initialData?.desirabilityHypothesis || "",
    feasibilityHypothesis: initialData?.feasibilityHypothesis || "",
    viabilityHypothesis: initialData?.viabilityHypothesis || "",
    linkProposal: initialData?.linkProposal || "",
    ritmeKerja: initialData?.ritmeKerja || "Weekly Sprint & Standup 2x seminggu",
    pacingMonitoring: initialData?.pacingMonitoring || "Review kemajuan bersama Coach tiap 2 minggu",
    kebutuhanDukungan: initialData?.kebutuhanDukungan || "",
    risikoAwal: initialData?.risikoAwal || "",
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const res = await saveCharterAction(timId, formData);
    if (res.success) {
      setStatusMsg({ type: "success", text: "Innovation Charter berhasil disimpan!" });
    } else {
      setStatusMsg({ type: "error", text: res.error || "Gagal menyimpan Charter." });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Bagian 1: Problem & Customer Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            1. Problem & Customer Focus
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Definisi misi proyek, target pengguna awal, dan masalah yang layak diselesaikan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Project Mission (Misi Proyek)
            </label>
            <Textarea
              rows={2}
              placeholder="Jelaskan tujuan akhir dari inisiatif inovasi ini..."
              value={formData.projectMission}
              onChange={(e) => handleChange("projectMission", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Customer & Early Adopters
              </label>
              <Textarea
                rows={2}
                placeholder="Siapa pengguna sasaran awal yang paling merasakan masalah ini?"
                value={formData.customerEarlyAdopters}
                onChange={(e) => handleChange("customerEarlyAdopters", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Context & Area Bantuan
              </label>
              <Textarea
                rows={2}
                placeholder="Di mana dan dalam konteks operasional apa solusi ini diterapkan?"
                value={formData.contextAreaBantuan}
                onChange={(e) => handleChange("contextAreaBantuan", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Problem Worth Solving (Masalah yang Layak Diselesaikan)
            </label>
            <Textarea
              rows={3}
              placeholder="Deskripsikan akar masalah utama beserta dampaknya jika tidak diselesaikan..."
              value={formData.problemWorthSolving}
              onChange={(e) => handleChange("problemWorthSolving", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              How Might We (HMW Statement)
            </label>
            <Input
              placeholder="Bagaimana kita dapat membantu [target pengguna] untuk [mencapai tujuan] tanpa [kendala utama]?"
              value={formData.hmw}
              onChange={(e) => handleChange("hmw", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bagian 2: Solution & DFV Hypotheses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            2. Solusi Awal & Hipotesis DFV (Desirability, Feasibility, Viability)
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Asumsi kritis yang harus diuji dan dibuktikan selama masa inkubasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Solusi Awal yang Diusulkan
            </label>
            <Textarea
              rows={3}
              placeholder="Bentuk prototype atau solusi minimum yang akan dibangun..."
              value={formData.solusiAwal}
              onChange={(e) => handleChange("solusiAwal", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
              <label className="text-xs font-bold text-blue-900 block">
                🎯 Desirability Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah pengguna benar-benar menginginkan dan membutuhkan solusi ini?"
                value={formData.desirabilityHypothesis}
                onChange={(e) => handleChange("desirabilityHypothesis", e.target.value)}
              />
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1.5">
              <label className="text-xs font-bold text-amber-900 block">
                ⚙️ Feasibility Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah kita mampu membangun solusi ini secara teknis & operasional?"
                value={formData.feasibilityHypothesis}
                onChange={(e) => handleChange("feasibilityHypothesis", e.target.value)}
              />
            </div>

            <div className="p-3 bg-green-50/50 rounded-xl border border-green-100 space-y-1.5">
              <label className="text-xs font-bold text-green-900 block">
                💰 Viability Hypothesis
              </label>
              <Textarea
                rows={3}
                placeholder="Apakah solusi ini memberikan dampak bisnis/efisiensi berkelanjutan?"
                value={formData.viabilityHypothesis}
                onChange={(e) => handleChange("viabilityHypothesis", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bagian 3: Tata Kelola & Ritme Kerja */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900">
            3. Tata Kelola, Ritme Kerja & Mitigasi Risiko
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Pacing monitoring dan kebutuhan dukungan selama masa inkubasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Ritme Kerja & Standup
              </label>
              <Input
                value={formData.ritmeKerja}
                onChange={(e) => handleChange("ritmeKerja", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Pacing Monitoring Bersama Coach
              </label>
              <Input
                value={formData.pacingMonitoring}
                onChange={(e) => handleChange("pacingMonitoring", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Kebutuhan Dukungan (Data / SME / Akses Sistem)
            </label>
            <Textarea
              rows={2}
              placeholder="Sebutkan dukungan divisi atau data yang dibutuhkan untuk validasi..."
              value={formData.kebutuhanDukungan}
              onChange={(e) => handleChange("kebutuhanDukungan", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Risiko Awal & Rencana Mitigasi
            </label>
            <Textarea
              rows={2}
              placeholder="Potensi hambatan yang mungkin dihadapi dan solusinya..."
              value={formData.risikoAwal}
              onChange={(e) => handleChange("risikoAwal", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold px-8 h-11 rounded-xl shadow-md gap-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Menyimpan..." : "Simpan Innovation Charter"}</span>
        </Button>
      </div>
    </form>
  );
}
