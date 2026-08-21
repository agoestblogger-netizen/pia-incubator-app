import Link from "next/link";
import { getTimInovatorList } from "@/app/actions/tim";
import { Plus, Rocket, Users, Calendar, ArrowRight, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatDateIndo } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const timList = await getTimInovatorList();

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F5132] to-[#1B7A4D] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-[#E6CA65]" />
            Program Inkubasi PIA Season 12 (2026)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dashboard Akselerasi Inovasi
          </h1>
          <p className="text-sm text-green-100/90 leading-relaxed">
            Selamat datang di portal inkubasi Pegadaian Innovation Award. Pantau progres validasi pelanggan, validasi pasar, dan eksekusi sprint tim inovator Anda.
          </p>
        </div>

        <Link href="/dashboard/tim-baru">
          <Button
            variant="gold"
            size="lg"
            className="flex items-center gap-2 font-bold shadow-lg shadow-black/20"
          >
            <Plus className="h-5 w-5" />
            <span>Daftarkan Tim Inovator</span>
          </Button>
        </Link>
      </div>

      {/* Grid Tim Inovator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Daftar Tim Inovator Aktif
            </h2>
            <p className="text-xs text-gray-500">
              Total {timList.length} tim sedang dalam tahap inkubasi dan validasi
            </p>
          </div>
        </div>

        {timList.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center bg-white/60">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#0F5132] mb-3">
              <Rocket className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Belum Ada Tim Inovator
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Mulai program inkubasi dengan mendaftarkan tim finalis PIA Season 12.
            </p>
            <Link href="/dashboard/tim-baru">
              <Button variant="default" size="sm">
                Daftarkan Tim Pertama
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timList.map((tim) => (
              <Card
                key={tim.id}
                className="hover:shadow-md transition-all border-gray-200 group flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0F5132]/10 text-[#0F5132]">
                      {tim.kategoriPia === 'BI' ? 'Breakthrough Innovation' : 'Business Case'}
                    </span>
                    <Badge
                      variant={
                        tim.status === 'aktif'
                          ? 'success'
                          : tim.status === 'selesai'
                          ? 'gold'
                          : 'secondary'
                      }
                      className="capitalize text-[10px]"
                    >
                      {tim.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-[#0F5132] transition-colors line-clamp-2">
                    {tim.namaProyekInovasi}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Klasifikasi: {tim.klasifikasiInovasi || 'Gold'} &bull; {tim.seasonAsli}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 block text-[10px]">Durasi</span>
                      <span className="font-semibold text-gray-700 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {tim.durasiBulan} Bulan
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-gray-400 block text-[10px]">Target Berakhir</span>
                      <span className="font-semibold text-gray-700 block truncate">
                        {formatDateIndo(tim.tanggalBerakhir)}
                      </span>
                    </div>
                  </div>

                  <Link href={`/tim/${tim.id}`} className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-between text-xs font-semibold hover:bg-[#0F5132] hover:text-white group-hover:border-[#0F5132] transition-all"
                    >
                      <span>Buka Workspace Tim</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
