'use client';

import { useState, useEffect } from 'react';
import {
  type DossierListItem,
  updateKlasifikasiInovasiAction,
} from '@/app/actions/dossier';
import { BAKU_KLASIFIKASI_OPTIONS } from '@/lib/data/dossier-constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  FileText,
  ArrowUpRight,
  Award,
  FolderArchive,
  Users,
  Filter,
  Sparkles,
  Gem,
  Check,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  PEGADAIAN_HEADER_GRADIENT_STYLE,
  getCategoryBadgeToken,
  getMedalToken,
} from '@/lib/theme/tokens';
import { toast } from '@/components/ui/ToastProvider';

export function DossierListClient({
  initialItems,
  canEditKlasifikasi = false,
}: {
  initialItems: DossierListItem[];
  canEditKlasifikasi?: boolean;
}) {
  const [items, setItems] = useState<DossierListItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [editingRows, setEditingRows] = useState<Record<string, string>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleRowMedalChange = (itemId: string, newMedal: string) => {
    setEditingRows((prev) => ({ ...prev, [itemId]: newMedal }));
  };

  const handleSaveRowMedal = async (item: DossierListItem) => {
    const newMedal = editingRows[item.id];
    if (!newMedal || !item.timInovatorId) return;

    setSavingRows((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await updateKlasifikasiInovasiAction(item.timInovatorId, newMedal);
      if (res.success) {
        toast.success(res.message, 'Klasifikasi Diperbarui');
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, peringkatMedali: newMedal, timKlasifikasi: newMedal } : it
          )
        );
        setEditingRows((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      } else {
        toast.error(res.message, 'Gagal Memperbarui');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.', 'Gagal');
    } finally {
      setSavingRows((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.namaProyek.toLowerCase().includes(search.toLowerCase()) ||
      item.namaPengusul.toLowerCase().includes(search.toLowerCase()) ||
      (item.proposalIdAsli && item.proposalIdAsli.toLowerCase().includes(search.toLowerCase()));

    const matchesSeason = seasonFilter === 'ALL' || item.seasonAsli === seasonFilter;
    const matchesKategori = kategoriFilter === 'ALL' || item.kategoriPia === kategoriFilter;

    return matchesSearch && matchesSeason && matchesKategori;
  });

  const seasons = Array.from(new Set(initialItems.map((i) => i.seasonAsli).filter(Boolean)));
  const categories = Array.from(new Set(initialItems.map((i) => i.kategoriPia).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header Banner Gradient Pegadaian */}
      <div
        style={PEGADAIAN_HEADER_GRADIENT_STYLE}
        className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-semibold text-white backdrop-blur-md mb-3 border border-white/15">
            <FolderArchive className="h-3.5 w-3.5 text-[#E6CA65]" />
            Perpustakaan Arsip Inovasi Resmi
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight drop-shadow-xs">
            Dossier Proposal PIA
          </h1>
          <p className="text-sm text-green-100/90 mt-2 leading-relaxed font-normal">
            Koleksi arsip lengkap seluruh proposal inovasi yang lolos ke program inkubasi, mencakup dokumen submisi asli CIDA, riwayat kurasi, dan penilaian dewan juri.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan judul, nama pengusul, atau ID proposal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Season Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Season:</span>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="text-xs h-9 rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
              >
                <option value="ALL">Semua Season</option>
                {seasons.map((s) => (
                  <option key={s} value={s!}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Kategori:</span>
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="text-xs h-9 rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dossier List Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Daftar Arsip Dossier</span>
                <span className="text-xs font-normal text-gray-500">
                  ({filteredItems.length} Arsip Tersedia)
                </span>
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <FolderArchive className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="text-sm font-semibold">Tidak ada dossier proposal yang ditemukan</p>
              <p className="text-xs text-gray-400">
                {initialItems.length === 0
                  ? 'Belum ada data calon peserta yang di-import dari PIA Curation.'
                  : 'Coba ubah kata kunci pencarian atau filter season/kategori.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100/75 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">ID & Season</th>
                    <th className="p-3.5">Nama Proyek Inovasi</th>
                    <th className="p-3.5">Pengusul Utama</th>
                    <th className="p-3.5 text-center">Kategori</th>
                    <th className="p-3.5 text-center">Medali / Status</th>
                    <th className="p-3.5 text-center">Tim Inkubasi</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60">
                  {filteredItems.map((item) => {
                    const isBI = item.kategoriPia === 'BI';
                    const isBC = item.kategoriPia === 'BC';
                    const isWilayah = item.kategoriPia === 'WILAYAH';
                    
                    const medal = getMedalToken(item.peringkatMedali);

                    return (
                      <tr
                        key={item.id}
                        style={{ background: medal.rowBg }}
                        className="transition-colors hover:brightness-96"
                      >
                        <td className="p-3.5 whitespace-nowrap">
                          <div
                            className="font-mono font-extrabold text-sm"
                            style={{ color: medal.rowTitleColor }}
                          >
                            {item.proposalIdAsli}
                          </div>
                          <div
                            className="text-[10px] font-semibold mt-0.5"
                            style={{ color: medal.rowSecondaryColor }}
                          >
                            {item.seasonAsli}
                          </div>
                        </td>

                        <td className="p-3.5 max-w-sm">
                          <Link
                            href={`/dossier/${item.proposalIdAsli}`}
                            style={{ color: medal.rowTitleColor }}
                            className="font-extrabold hover:underline transition-colors block text-sm leading-snug"
                          >
                            {item.namaProyek}
                          </Link>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <div
                            className="font-bold text-xs"
                            style={{ color: medal.rowTitleColor }}
                          >
                            {item.namaPengusul}
                          </div>
                          <div
                            className="text-[11px] font-medium"
                            style={{ color: medal.rowSecondaryColor }}
                          >
                            {item.emailPengusul}
                          </div>
                        </td>

                        <td className="p-3.5 text-center whitespace-nowrap">
                          {isBI ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5142D6] text-white shadow-2xs">
                              BI (Breakthrough)
                            </span>
                          ) : isBC ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0E6E7A] text-white shadow-2xs">
                              BC (Business Case)
                            </span>
                          ) : isWilayah ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B8720E] text-white shadow-2xs">
                              Wilayah
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0E8C55] text-white shadow-2xs">
                              {item.kategoriPia || 'Pusat'}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center whitespace-nowrap">
                          {canEditKlasifikasi && item.timInovatorId ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <select
                                  value={editingRows[item.id] || item.peringkatMedali}
                                  onChange={(e) => handleRowMedalChange(item.id, e.target.value)}
                                  disabled={savingRows[item.id]}
                                  className="text-[11px] font-bold rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0F5132] cursor-pointer"
                                >
                                  {!BAKU_KLASIFIKASI_OPTIONS.includes(item.peringkatMedali as any) && (
                                    <option value={item.peringkatMedali} disabled>
                                      {item.peringkatMedali} (Data Non-Baku)
                                    </option>
                                  )}
                                  {BAKU_KLASIFIKASI_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>

                                {editingRows[item.id] && editingRows[item.id] !== item.peringkatMedali && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={savingRows[item.id]}
                                    onClick={() => handleSaveRowMedal(item)}
                                    className="h-6 px-1.5 bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-[10px] font-bold shadow-xs cursor-pointer"
                                    title="Simpan Perubahan Klasifikasi"
                                  >
                                    {savingRows[item.id] ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>

                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white shadow-2xs"
                                style={{ background: medal.bgGradient }}
                              >
                                {medal.iconType === 'diamond' ? (
                                  <Gem className="h-2.5 w-2.5 text-white" />
                                ) : (
                                  <Award className="h-2.5 w-2.5 text-white" />
                                )}
                                <span>{editingRows[item.id] || item.peringkatMedali}</span>
                              </span>
                            </div>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-2xs"
                              style={{ background: medal.bgGradient }}
                            >
                              {medal.iconType === 'diamond' ? (
                                <Gem className="h-3 w-3 text-white" />
                              ) : (
                                <Award className="h-3 w-3 text-white" />
                              )}
                              <span>{medal.name}</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center whitespace-nowrap">
                          {item.timInovatorId ? (
                            <Link
                              href={`/tim/${item.timInovatorId}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors shadow-2xs ${
                                item.timStatus === 'calon_peserta'
                                  ? 'text-[#5142D6] bg-indigo-50/90 hover:bg-indigo-100 border border-[#5142D6]/30'
                                  : 'text-[#0E8C55] bg-emerald-50/90 hover:bg-emerald-100 border border-[#0E8C55]/30'
                              }`}
                            >
                              <Users className="h-3 w-3" />
                              {item.timStatus === 'calon_peserta' ? 'Calon Peserta' : 'Peserta Aktif'}
                              <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </Link>
                          ) : (
                            <span className="text-[11px] text-gray-400">Belum di-assign</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Link href={`/dossier/${item.proposalIdAsli}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-semibold text-[#0F5132] border-green-300 bg-white/80 hover:bg-white hover:border-[#0F5132]"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Buka Dossier
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
