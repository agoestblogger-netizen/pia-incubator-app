import { getTimInovatorById } from "@/app/actions/tim";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, CheckCircle2 } from "lucide-react";
import { formatDateIndo } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function TimOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const [tim, phaseGateStatus, sprints] = await Promise.all([
    getTimInovatorById(resolvedParams.id),
    getTeamPhaseGateStatus(resolvedParams.id),
    getSprintsByTimId(resolvedParams.id),
  ]);

  if (!tim) return notFound();

  // 1. Target Berakhir dari Sprint Terakhir (nomor sprint tertinggi yang direncanakan)
  const lastSprint =
    sprints.length > 0
      ? sprints.reduce((prev, curr) =>
          curr.nomorSprint > prev.nomorSprint ? curr : prev,
        sprints[0])
      : null;

  const targetBerakhirDate =
    lastSprint?.tanggalSelesaiRencana || lastSprint?.tanggalSelesaiAktual;
  const targetBerakhirText = targetBerakhirDate
    ? formatDateIndo(targetBerakhirDate)
    : "-";

  // 2. Durasi Inkubasi dinamis dari rentang sprint (Sprint 1 ke Sprint Terakhir)
  const firstSprint =
    sprints.length > 0
      ? sprints.reduce((prev, curr) =>
          curr.nomorSprint < prev.nomorSprint ? curr : prev,
        sprints[0])
      : null;

  const startDate =
    firstSprint?.tanggalMulaiRencana || firstSprint?.tanggalMulaiAktual;
  const endDate = targetBerakhirDate;

  let durasiInkubasiText = `${tim.durasiBulan || 3} Bulan`;
  if (startDate && endDate && new Date(endDate) > new Date(startDate)) {
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const calculatedMonths = diffDays / 30.4375;
    const roundedMonths = Math.round(calculatedMonths * 2) / 2;
    durasiInkubasiText = `${roundedMonths.toString().replace(".", ",")} Bulan`;
  }

  return (
    <div className="space-y-6">
      {/* Phase Gate Navigation Bar */}
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      {/* Profil Ringkasan Tim */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#0F5132]/10 text-[#0F5132]">
                {tim.kategoriPia === 'BI' ? 'Breakthrough Innovation' : 'Business Case'}
              </span>
              <Badge variant="gold" className="text-xs">
                {tim.klasifikasiInovasi || 'Gold'} &bull; {tim.seasonAsli}
              </Badge>
              <Badge
                variant={
                  tim.status === 'aktif'
                    ? 'success'
                    : tim.status === 'selesai'
                    ? 'gold'
                    : 'secondary'
                }
                className="text-xs font-semibold"
              >
                {tim.status === 'calon_peserta'
                  ? 'Calon Peserta'
                  : tim.status === 'aktif'
                  ? 'Peserta Aktif'
                  : tim.status === 'selesai'
                  ? 'Selesai'
                  : tim.status}
              </Badge>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {tim.namaProyekInovasi}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs bg-gray-50 border border-gray-100 p-3 rounded-xl">
            <div>
              <span className="text-gray-400 block text-[10px]">Durasi Inkubasi</span>
              <span className="font-bold text-gray-800">{durasiInkubasiText}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <span className="text-gray-400 block text-[10px]">Target Berakhir</span>
              <span className="font-bold text-gray-800">{targetBerakhirText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Susunan Tim */}
        <Card className="md:col-span-1 rounded-2xl shadow-2xs border-gray-200">
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
              tim.anggota.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-0.5"
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
        <Card className="md:col-span-2 rounded-2xl shadow-2xs border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-900">
              <CheckCircle2 className="h-4 w-4 text-[#0F5132]" />
              <span>Tahapan Program Inkubasi (3 Tahap Utama)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold text-[#5142D6] uppercase tracking-wider block">
                  Tahap 1
                </span>
                <h4 className="text-sm font-bold text-gray-900">Innovation Setup</h4>
                <p className="text-[11px] text-gray-600">
                  Penyusunan Innovation Charter, Backlog, dan Sprint MVP.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold text-[#B8720E] uppercase tracking-wider block">
                  Tahap 2
                </span>
                <h4 className="text-sm font-bold text-gray-900">Customer Validation</h4>
                <p className="text-[11px] text-gray-600">
                  Uji Problem-Solution Fit dengan early adopter di unit kerja.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold text-[#0E8C55] uppercase tracking-wider block">
                  Tahap 3
                </span>
                <h4 className="text-sm font-bold text-gray-900">Market Validation</h4>
                <p className="text-[11px] text-gray-600">
                  Uji Product-Market Fit, evaluasi bisnis, dan FMI Decision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
