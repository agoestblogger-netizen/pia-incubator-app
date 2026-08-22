'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Award,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  Users,
  Target,
  Lightbulb,
  Building2,
  DollarSign,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

function formatDateSafe(dateStr?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', options || { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export function DossierDetailClient({ dossier }: { dossier: any }) {
  const [activeTab, setActiveTab] = useState<'submisi' | 'kurasi' | 'juri' | 'lampiran'>('submisi');

  const snap = dossier.snapshotData || {};
  const dataSubmisi = snap.data_submisi || {};
  const pengusul = dataSubmisi.pengusul || {};
  const formDetail = dataSubmisi.form_detail || {};
  const statusAkhir = snap.status_akhir || {};
  const riwayatKurasi: any[] = Array.isArray(snap.riwayat_kurasi) ? snap.riwayat_kurasi : [];
  const riwayatJuri: any[] = Array.isArray(snap.riwayat_penilaian_juri) ? snap.riwayat_penilaian_juri : [];
  const daftarLampiran: string[] = Array.isArray(snap.daftar_lampiran) ? snap.daftar_lampiran : [];
  const lampiranUrls: Record<string, string> = snap.lampiran_urls || {};

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dossier"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-[#0F5132] transition-colors gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Daftar Dossier
        </Link>
      </div>

      {/* Header Profile Card */}
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-[#0F5132] via-[#146c43] to-[#0A3822] p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded text-white backdrop-blur-md">
                  {dossier.proposalIdAsli || snap.proposal_id}
                </span>
                <span className="text-xs font-semibold bg-[#E6CA65]/20 text-[#E6CA65] border border-[#E6CA65]/30 px-2.5 py-0.5 rounded">
                  {dossier.seasonAsli || snap.season}
                </span>
                <span className="text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded">
                  Kategori: {dataSubmisi.kategori_pia || 'PUSAT'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {dataSubmisi.judul || dossier.timNama || 'Tanpa Judul'}
              </h1>

              <p className="text-xs sm:text-sm text-green-100/90 leading-relaxed line-clamp-2">
                {dataSubmisi.deskripsi_lengkap}
              </p>
            </div>

            {/* Badges & Actions */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 font-bold text-xs">
                <Award className="h-4 w-4 text-[#E6CA65]" />
                {statusAkhir.peringkat_medali || dataSubmisi.klasifikasi_inovasi || 'Platinum'} • {statusAkhir.status || 'Release'}
              </div>

              {dossier.timInovatorId && (
                <Link href={`/tim/${dossier.timInovatorId}`}>
                  <Button
                    size="sm"
                    className="bg-white hover:bg-gray-100 text-[#0F5132] font-semibold text-xs h-8 shadow-sm"
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Buka Dashboard Tim
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50/75 px-6 flex space-x-6">
          <button
            onClick={() => setActiveTab('submisi')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'submisi'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Formulir Submisi CIDA
          </button>
          <button
            onClick={() => setActiveTab('kurasi')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'kurasi'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Riwayat Kurasi ({riwayatKurasi.length})
          </button>
          <button
            onClick={() => setActiveTab('juri')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'juri'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Penilaian Dewan Juri ({riwayatJuri.length})
          </button>
          <button
            onClick={() => setActiveTab('lampiran')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'lampiran'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Dokumen Lampiran ({daftarLampiran.length})
          </button>
        </div>
      </Card>

      {/* Tab 1: Submisi CIDA */}
      {activeTab === 'submisi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#0F5132]" />
                  Deskripsi & Solusi Inovasi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Deskripsi Lengkap Inovasi</h4>
                  <p className="bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                    {dataSubmisi.deskripsi_lengkap}
                  </p>
                </div>

                {formDetail.solusi_diusulkan && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Eksplorasi Solusi yang Diusulkan</h4>
                    <p className="bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                      {formDetail.solusi_diusulkan}
                    </p>
                  </div>
                )}

                {formDetail.keunikan && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Kebaruan / Keunikan Penyelesaian</h4>
                    <p className="bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                      {formDetail.keunikan}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#0F5132]" />
                  Masalah & Sasaran Pengguna
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs text-gray-700">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Kelompok Pengguna / Sasaran yang Dibantu</h4>
                  <p className="bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                    {formDetail.kelompok_dibantu || 'Seluruh nasabah dan ekosistem terkait'}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Masalah Utama yang Ingin Diselesaikan</h4>
                  <p className="bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                    {formDetail.masalah_sasaran || 'Identifikasi tantangan operasional dan kebutuhan efisiensi'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {(formDetail.target_finansial || formDetail.target_non_finansial) && (
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0F5132]" />
                    Target Capaian Inovasi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs text-gray-700">
                  {formDetail.target_finansial && (
                    <div className="flex items-start gap-2.5 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                      <DollarSign className="h-4 w-4 text-emerald-600 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-900">Target Finansial: </span>
                        <span className="text-emerald-800">{formDetail.target_finansial}</span>
                      </div>
                    </div>
                  )}

                  {formDetail.target_non_finansial && (
                    <div className="flex items-start gap-2.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <span className="font-bold text-blue-900">Target Non-Finansial: </span>
                        <span className="text-blue-800">{formDetail.target_non_finansial}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Proposer Metadata */}
          <div className="space-y-6">
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0F5132]" />
                  Profil Pengusul
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Nama Pengusul</span>
                  <span className="font-bold text-gray-900 text-sm">{pengusul.nama || 'Anonim'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Email Korporat</span>
                  <span className="text-gray-800 font-mono">{pengusul.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Unit Kerja</span>
                  <span className="text-gray-800">{pengusul.unit_kerja || 'PT Pegadaian'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Jabatan / Divisi</span>
                  <span className="text-gray-800">{pengusul.jabatan || 'Inovator'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Tanggal Submit</span>
                  <span className="text-gray-800 font-mono">
                    {formatDateSafe(dataSubmisi.tanggal_submit, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50/50 to-emerald-50/30">
              <CardContent className="p-4 text-xs space-y-2 text-gray-700">
                <div className="flex items-center gap-2 font-bold text-[#0F5132]">
                  <ShieldCheck className="h-4 w-4" />
                  Status Arsip Terverifikasi
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Data ini merupakan salinan resmi (*immutable snapshot*) proposal yang lolos Grand Final PIA Season 12.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Riwayat Kurasi */}
      {activeTab === 'kurasi' && (
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0F5132]" />
              Timeline & Catatan Tahap Kurasi
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Rekam jejak evaluasi oleh kurator internal dan sesi Focus Group Discussion (FGD).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {riwayatKurasi.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Tidak ada catatan kurasi tersedia.</p>
            ) : (
              <div className="relative border-l-2 border-green-200 ml-4 space-y-6">
                {riwayatKurasi.map((k, idx) => (
                  <div key={idx} className="relative pl-6">
                    {/* Dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[#0F5132] border-2 border-white shadow-sm" />

                    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0F5132]">{k.tahap}</span>
                          <span className="text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {k.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {formatDateSafe(k.tanggal)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
                        {k.catatan}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span>Kurator: <strong>{k.kurator}</strong></span>
                        {k.vote_nominasi > 0 && (
                          <span className="text-amber-700 font-semibold">
                            Vote Nominasi: {k.vote_nominasi}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Penilaian Dewan Juri */}
      {activeTab === 'juri' && (
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-[#0F5132]" />
              Riwayat Penilaian Regional & Grand Final
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Skor, umpan balik kualitatif, dan rekomendasi dewan juri serta sponsor.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {riwayatJuri.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Tidak ada catatan penilaian juri tersedia.</p>
            ) : (
              <div className="relative border-l-2 border-amber-200 ml-4 space-y-6">
                {riwayatJuri.map((j, idx) => (
                  <div key={idx} className="relative pl-6">
                    {/* Dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" />

                    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-amber-900">{j.tahap}</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                            Skor: {j.skor}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {formatDateSafe(j.tanggal)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
                        {j.catatan}
                      </div>

                      <div className="text-[11px] text-gray-500 pt-1">
                        Penilai / Sponsor: <strong>{j.juri}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Dokumen Lampiran */}
      {activeTab === 'lampiran' && (
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0F5132]" />
              Dokumen & File Lampiran Asli
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Unduh langsung dokumen presentasi (pitch deck) dan berkas pendukung proposal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {daftarLampiran.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Tidak ada file lampiran fisik.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {daftarLampiran.map((fileName, idx) => {
                  const url = lampiranUrls[fileName];

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-[#0F5132] transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200">
                          PDF
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-xs text-gray-900 truncate" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Dokumen Submisi Resmi</p>
                        </div>
                      </div>

                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <Button
                            size="sm"
                            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8 px-3 font-semibold"
                          >
                            <Download className="h-3 w-3 mr-1.5" />
                            Unduh
                          </Button>
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          Tersimpan di ZIP
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
