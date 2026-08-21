import { getTimInovatorById } from "@/app/actions/tim";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Calendar, Clock, CheckCircle2, Award, FileText } from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function TimOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  return (
    <div className="space-y-6">
      {/* Header Tim */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#0F5132]/10 text-[#0F5132]">
                {tim.kategoriPia === 'BI' ? 'Breakthrough Innovation' : 'Business Case'}
              </span>
              <Badge variant="gold" className="text-xs">
                {tim.klasifikasiInovasi || 'Gold'} &bull; {tim.seasonAsli}
              </Badge>
              <Badge variant="success" className="capitalize text-xs">
                {tim.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {tim.namaProyekInovasi}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs bg-gray-50 border border-gray-100 p-3 rounded-xl">
            <div>
              <span className="text-gray-400 block text-[10px]">Durasi Inkubasi</span>
              <span className="font-bold text-gray-800">{tim.durasiBulan} Bulan</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <span className="text-gray-400 block text-[10px]">Target Berakhir</span>
              <span className="font-bold text-gray-800">{formatDateIndo(tim.tanggalBerakhir)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <TimNavTabs timId={tim.id} />

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Susunan Tim */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
              <Users className="h-4 w-4 text-[#0F5132]" />
              <span>Anggota Tim Inovator</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tim.anggota.length === 0 ? (
              <p className="text-xs text-gray-400">Belum ada anggota terdaftar.</p>
            ) : (
              tim.anggota.map((a, i) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-0.5"
                >
                  <p className="text-xs font-bold text-gray-800">{a.nama}</p>
                  <p className="text-[11px] text-gray-500">{a.jabatan} &bull; {a.unitKerja}</p>
                  {a.komitmenDukungan && (
                    <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                      {a.komitmenDukungan}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Status Tahapan Inkubasi */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
              <CheckCircle2 className="h-4 w-4 text-[#0F5132]" />
              <span>Tahapan Program Inkubasi (3 Tahap Utama)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 hover:border-[#0F5132] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Tahap 1
                </span>
                <h4 className="text-sm font-bold text-gray-900">Innovation Setup</h4>
                <p className="text-[11px] text-gray-500">
                  Penyusunan Innovation Charter, Backlog, dan Sprint MVP.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 hover:border-[#0F5132] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Tahap 2
                </span>
                <h4 className="text-sm font-bold text-gray-900">Customer Validation</h4>
                <p className="text-[11px] text-gray-500">
                  Uji coba solusi ke early adopters, metrik PSF, dan feedback kualitatif.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 hover:border-[#0F5132] transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Tahap 3
                </span>
                <h4 className="text-sm font-bold text-gray-900">Market Validation</h4>
                <p className="text-[11px] text-gray-500">
                  Rilis MVP pilot, sprint review, evaluasi PMF & rekapitulasi DFV.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
