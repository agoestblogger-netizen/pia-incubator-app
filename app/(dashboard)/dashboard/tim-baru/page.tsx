"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTimInovatorAction } from "@/app/actions/tim";
import { ArrowLeft, Plus, Trash2, Rocket, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TimBaruPage() {
  const router = useRouter();
  const [namaProyekInovasi, setNamaProyekInovasi] = useState("");
  const [kategoriPia, setKategoriPia] = useState("BI");
  const [klasifikasiInovasi, setKlasifikasiInovasi] = useState("Gold");
  const [durasiBulan, setDurasiBulan] = useState(3);
  const [anggota, setAnggota] = useState([
    { nama: "", jabatan: "", unitKerja: "", komitmenDukungan: "Penuh (Full Time)" },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addAnggota = () => {
    setAnggota([...anggota, { nama: "", jabatan: "", unitKerja: "", komitmenDukungan: "Penuh (Full Time)" }]);
  };

  const removeAnggota = (idx: number) => {
    if (anggota.length === 1) return;
    setAnggota(anggota.filter((_, i) => i !== idx));
  };

  const handleAnggotaChange = (idx: number, field: string, value: string) => {
    const next = [...anggota];
    (next[idx] as any)[field] = value;
    setAnggota(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await createTimInovatorAction({
      namaProyekInovasi,
      kategoriPia,
      klasifikasiInovasi,
      durasiBulan,
      anggota: anggota.filter((a) => a.nama.trim() !== ""),
    });

    if (res.success && res.data) {
      router.push(`/tim/${res.data.id}`);
      router.refresh();
    } else {
      setErrorMsg(res.error || "Gagal membuat tim.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-xs font-semibold text-[#0F5132] hover:text-[#1B7A4D] gap-1 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Pendaftaran Tim Inovator Baru
        </h1>
        <p className="text-xs text-gray-500">
          Daftarkan proyek inovasi PIA Season 12 ke dalam program akselerasi & inkubasi
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">
              Informasi Dasar Proyek
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Detail proyek inovasi dan durasi awal inkubasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Nama Proyek Inovasi *
              </label>
              <Input
                required
                placeholder="Contoh: SIGAP — Sistem Informasi Gadai Terpadu"
                value={namaProyekInovasi}
                onChange={(e) => setNamaProyekInovasi(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Kategori PIA *
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  value={kategoriPia}
                  onChange={(e) => setKategoriPia(e.target.value)}
                >
                  <option value="BI">Breakthrough Innovation (BI)</option>
                  <option value="BC">Business Case (BC)</option>
                  <option value="WILAYAH">Inovasi Wilayah</option>
                  <option value="PUSAT">Inovasi Kantor Pusat</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Klasifikasi Medali
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  value={klasifikasiInovasi}
                  onChange={(e) => setKlasifikasiInovasi(e.target.value)}
                >
                  <option value="Diamond">Diamond</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Durasi Inkubasi
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  value={durasiBulan}
                  onChange={(e) => setDurasiBulan(Number(e.target.value))}
                >
                  <option value={3}>3 Bulan (Standar)</option>
                  <option value={6}>6 Bulan (Lanjutan)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anggota Tim */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-gray-900">
                Komposisi Anggota Tim
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Susunan Project Owner, Inisiator, dan Co-creator
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAnggota}
              className="text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Anggota
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {anggota.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F5132]">
                    Anggota #{idx + 1}
                  </span>
                  {anggota.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeAnggota(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">
                      Nama Lengkap *
                    </label>
                    <Input
                      required
                      placeholder="Nama Inovator"
                      value={item.nama}
                      onChange={(e) => handleAnggotaChange(idx, "nama", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">
                      Jabatan *
                    </label>
                    <Input
                      required
                      placeholder="Penaksir / Analis"
                      value={item.jabatan}
                      onChange={(e) => handleAnggotaChange(idx, "jabatan", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-600">
                      Unit Kerja / Cabang *
                    </label>
                    <Input
                      required
                      placeholder="CP Kramat Jati"
                      value={item.unitKerja}
                      onChange={(e) => handleAnggotaChange(idx, "unitKerja", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-bold rounded-xl gap-2 shadow-md"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? "Menyimpan Tim..." : "Daftarkan & Buka Workspace"}</span>
        </Button>
      </form>
    </div>
  );
}
