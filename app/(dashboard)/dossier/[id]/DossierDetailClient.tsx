'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Check,
  X,
  MessageSquare,
  Vote,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Layers,
  FileCheck,
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

function formatDocTitle(fileName: string): string {
  if (fileName.startsWith('pitch-deck')) return 'Pitch Deck Utama';
  if (fileName.startsWith('dokumen-pendukung-1')) return 'Dokumen Pendukung #1';
  if (fileName.startsWith('dokumen-pendukung-2')) return 'Dokumen Pendukung #2';
  if (fileName.startsWith('surat-orisinalitas')) return 'Surat Orisinalitas';
  return fileName;
}

export function DossierDetailClient({ dossier }: { dossier: any }) {
  const [activeTab, setActiveTab] = useState<'submisi' | 'diskusi' | 'juri' | 'dokumen'>('submisi');
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [pdfZoom, setPdfZoom] = useState<number>(100);

  const snap = dossier.snapshotData || {};
  const dataSubmisi = snap.data_submisi || {};
  const pengusul = dataSubmisi.pengusul || {};
  const formDetail = dataSubmisi.form_detail || {};
  const statusAkhir = snap.status_akhir || {};
  const voting = snap.voting_summary || {
    nominate_votes: 10,
    not_nominate_votes: 0,
    total_votes: 10,
    consensus_percentage: 100,
    verdict: 'Lolos ke Grand Final',
  };
  const riwayatKurasi: any[] = Array.isArray(snap.riwayat_kurasi) ? snap.riwayat_kurasi : [];
  const riwayatJuri: any[] = Array.isArray(snap.riwayat_penilaian_juri) ? snap.riwayat_penilaian_juri : [];
  const daftarLampiran: string[] = Array.isArray(snap.daftar_lampiran) ? snap.daftar_lampiran : [];
  const lampiranUrls: Record<string, string> = snap.lampiran_urls || {};
  const teamMembers: string[] = Array.isArray(dataSubmisi.team_members) ? dataSubmisi.team_members : [];
  const aiScores = dataSubmisi.ai_cida_scores || {};

  // Dynamically determine jury section title & description
  const juriStages = Array.from(new Set(riwayatJuri.map((j) => j.tahap).filter(Boolean)));
  const hasRegional = juriStages.some((s) => s.toLowerCase().includes('regional'));
  const hasGrandFinal = juriStages.some((s) => s.toLowerCase().includes('grand final'));

  let juriSectionTitle = 'Riwayat Penilaian Dewan Juri & Sponsor';
  let juriSectionDescription = 'Skor, umpan balik kualitatif, dan rekomendasi dewan juri serta sponsor.';

  if (hasRegional && hasGrandFinal) {
    juriSectionTitle = 'Riwayat Penilaian Regional & Grand Final';
    juriSectionDescription = 'Skor, umpan balik kualitatif, dan rekomendasi dewan juri Regional serta sponsor Grand Final.';
  } else if (hasGrandFinal) {
    juriSectionTitle = 'Riwayat Penilaian Grand Final';
    juriSectionDescription = 'Skor, umpan balik kualitatif, dan rekomendasi dewan juri & sponsor Grand Final.';
  } else if (hasRegional) {
    juriSectionTitle = 'Riwayat Penilaian Regional Final';
    juriSectionDescription = 'Skor, umpan balik kualitatif, dan rekomendasi dewan juri Regional Final.';
  } else if (juriStages.length > 0) {
    juriSectionTitle = `Riwayat Penilaian ${juriStages.join(' & ')}`;
  }

  // Active attachment for PDF viewer
  const activeFileName = daftarLampiran[selectedDocIndex] || daftarLampiran[0] || '';
  const activeFileUrl = activeFileName ? lampiranUrls[activeFileName] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Read-only Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dossier"
          className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-[#0F5132] transition-colors gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Perpustakaan Dossier PIA</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 shadow-2xs">
            <Lock className="h-3.5 w-3.5 text-gray-500" />
            Arsip Historis Submisi (Read-Only)
          </span>
          {dossier.timInovatorId && (
            <Link href={`/tim/${dossier.timInovatorId}`}>
              <Button size="sm" className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8 font-semibold shadow-xs">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Buka Dashboard Tim
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Header Profile Hero Card */}
      <Card className="border border-gray-200/90 shadow-sm bg-white overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-[#0F5132] via-[#146c43] to-[#0A3822] p-6 sm:p-8 text-white relative">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-4xl">
              {/* Badges Pill Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-md border border-white/20">
                  {dossier.proposalIdAsli || snap.proposal_id}
                </span>
                <span className="text-xs font-bold bg-[#E6CA65]/20 text-[#E6CA65] border border-[#E6CA65]/40 px-3 py-1 rounded-full">
                  {dossier.seasonAsli || snap.season}
                </span>
                <span className="text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/40 px-3 py-1 rounded-full">
                  Jalur: {dataSubmisi.kategori_pia || 'PUSAT'}
                </span>
                {dataSubmisi.tema && (
                  <span className="text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 px-3 py-1 rounded-full">
                    {dataSubmisi.tema}
                  </span>
                )}
                {dataSubmisi.tagging && (
                  <span className="text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 px-3 py-1 rounded-full">
                    {dataSubmisi.tagging}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {dataSubmisi.judul || dossier.timNama || 'Tanpa Judul'}
              </h1>

              {/* Inisiator & Members */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-green-100/90 pt-1">
                <div>
                  <span className="text-green-300 font-medium">Inisiator: </span>
                  <span className="font-bold text-white">{pengusul.nama || 'Anonim'}</span>
                  <span className="text-green-200/80"> ({pengusul.unit_kerja || 'PT Pegadaian'})</span>
                </div>

                {teamMembers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-300 font-medium">Anggota Tim: </span>
                    <div className="flex flex-wrap gap-1">
                      {teamMembers.map((m, idx) => (
                        <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-white text-[11px] font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Medal & Status Badge Box */}
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right space-y-1 shadow-inner">
                <div className="text-[10px] text-green-200 font-bold uppercase tracking-wider">Hasil Grand Final</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/25 border border-amber-300/50 text-amber-200 font-extrabold text-sm">
                  <Award className="h-4 w-4 text-[#E6CA65]" />
                  {statusAkhir.peringkat_medali || dataSubmisi.klasifikasi_inovasi || 'Platinum'}
                </div>
                <div className="text-[11px] text-green-100 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  Status: {statusAkhir.status || 'Release'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Konsensus Historical Summary Strip (Read-Only) */}
        <div className="bg-amber-50/70 border-y border-amber-200/70 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Vote className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                <span>Hasil Voting Konsensus FGD Kurasi</span>
                <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-green-200">
                  {voting.consensus_percentage}% Konsensus
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                {voting.nominate_votes} Panelis memilih <strong>Nominasikan</strong> • {voting.not_nominate_votes} Tidak • Keputusan: <strong>{voting.verdict}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-36 bg-gray-200 rounded-full h-2.5 overflow-hidden border border-amber-200">
              <div
                className="bg-[#0F5132] h-2.5 rounded-full"
                style={{ width: `${voting.consensus_percentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-amber-900 font-mono">
              {voting.nominate_votes}/{voting.total_votes} Suara
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50/80 px-6 flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('submisi')}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'submisi'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Formulir Submisi CIDA
          </button>

          <button
            onClick={() => setActiveTab('dokumen')}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'dokumen'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Dokumen & Pitch Deck ({daftarLampiran.length})
          </button>

          <button
            onClick={() => setActiveTab('diskusi')}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'diskusi'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Ruang Diskusi & Kurasi FGD ({riwayatKurasi.length})
          </button>

          <button
            onClick={() => setActiveTab('juri')}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'juri'
                ? 'border-[#0F5132] text-[#0F5132]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Award className="h-4 w-4" />
            Penilaian Dewan Juri ({riwayatJuri.length})
          </button>
        </div>
      </Card>

      {/* Rangkuman Eksekutif Terstruktur (Structured Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sasaran Pengguna */}
        <Card className="border-l-4 border-l-blue-500 border border-gray-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
              <Target className="h-4 w-4" />
              <span>Sasaran Pengguna</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
              {formDetail.kelompok_dibantu || 'Seluruh nasabah, tim pengelola operasional, dan ekosistem bisnis terkait.'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Masalah Utama */}
        <Card className="border-l-4 border-l-amber-500 border border-gray-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
              <Lightbulb className="h-4 w-4" />
              <span>Masalah Utama</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
              {formDetail.masalah_sasaran || dataSubmisi.deskripsi_lengkap || 'Tantangan inefisiensi proses dan kebutuhan otomatisasi operasional.'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Solusi & Kebaruan */}
        <Card className="border-l-4 border-l-emerald-500 border border-gray-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Solusi & Kebaruan Unik</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
              {formDetail.keunikan || formDetail.solusi_diusulkan || 'Penerapan platform terintegrasi dengan orkestrasi otomatis.'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Target Finansial & Metrik */}
        <Card className="border-l-4 border-l-purple-500 border border-gray-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
              <TrendingUp className="h-4 w-4" />
              <span>Target & Dampak Metrik</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
              {formDetail.target_finansial || formDetail.target_non_finansial || 'Peningkatan efisiensi waktu, reduksi defect, dan optimalisasi biaya.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: FORMULIR SUBMISI CIDA */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'submisi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Deskripsi & Solusi */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#0F5132]" />
                  Deskripsi Lengkap & Solusi Inovasi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs text-gray-700">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1.5 text-xs">Deskripsi Lengkap Submisi</h4>
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap text-gray-800">
                    {dataSubmisi.deskripsi_lengkap}
                  </div>
                </div>

                {formDetail.solusi_diusulkan && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1.5 text-xs">Solusi yang Diusulkan & Komparasi</h4>
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap text-gray-800">
                      {formDetail.solusi_diusulkan}
                    </div>
                  </div>
                )}

                {formDetail.keunikan && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1.5 text-xs">Kebaruan / Keunikan Penyelesaian</h4>
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap text-gray-800">
                      {formDetail.keunikan}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Masalah & Sasaran */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#0F5132]" />
                  Identifikasi Masalah & Sasaran Pengguna
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs text-gray-700">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1.5 text-xs">Sasaran Pengguna / Kelompok yang Dibantu</h4>
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap text-gray-800">
                    {formDetail.kelompok_dibantu || 'Semua stakeholder dan pengguna terkait.'}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-1.5 text-xs">Masalah Utama yang Ingin Diselesaikan</h4>
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap text-gray-800">
                    {formDetail.masalah_sasaran || 'Identifikasi kendala operasional.'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Target Capaian */}
            {(formDetail.target_finansial || formDetail.target_non_finansial) && (
              <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0F5132]" />
                    Target Capaian Inovasi (Finansial & Non-Finansial)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs text-gray-700">
                  {formDetail.target_finansial && (
                    <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span>Target Finansial & Efisiensi Biaya</span>
                      </div>
                      <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap pl-6">
                        {formDetail.target_finansial}
                      </p>
                    </div>
                  )}

                  {formDetail.target_non_finansial && (
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-blue-950 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span>Target Non-Finansial, Kualitas & Standarisasi</span>
                      </div>
                      <p className="text-blue-900 leading-relaxed whitespace-pre-wrap pl-6">
                        {formDetail.target_non_finansial}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Profil & AI Scores */}
          <div className="space-y-6">
            {/* Profil Pengusul Card */}
            <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0F5132]" />
                  Profil Inisiator & Tim
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Inisiator Proyek</span>
                  <span className="font-bold text-gray-900 text-sm">{pengusul.nama || 'Anonim'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Email Korporat</span>
                  <span className="text-gray-800 font-mono text-[11px]">{pengusul.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Unit Kerja / Divisi</span>
                  <span className="text-gray-800">{pengusul.unit_kerja || 'PT Pegadaian'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Tanggal Submisi</span>
                  <span className="text-gray-800 font-mono">
                    {formatDateSafe(dataSubmisi.tanggal_submit, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {teamMembers.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Anggota Tim Lainnya</span>
                    <ul className="space-y-1">
                      {teamMembers.map((m, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-gray-800 font-medium text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132]" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Evaluation Snapshot */}
            {aiScores && (aiScores.viability || aiScores.feasibility || aiScores.average) && (
              <Card className="border border-purple-200/80 shadow-sm bg-gradient-to-br from-purple-50/40 to-indigo-50/20 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Skor Analisis AI CIDA
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {aiScores.viability && (
                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-gray-400 block text-[10px]">Viability</span>
                        <span className="font-bold text-purple-950">{aiScores.viability}</span>
                      </div>
                    )}
                    {aiScores.feasibility && (
                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-gray-400 block text-[10px]">Feasibility</span>
                        <span className="font-bold text-purple-950">{aiScores.feasibility}</span>
                      </div>
                    )}
                    {aiScores.desirability && (
                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-gray-400 block text-[10px]">Desirability</span>
                        <span className="font-bold text-purple-950">{aiScores.desirability}</span>
                      </div>
                    )}
                    {aiScores.uniqueness && (
                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-gray-400 block text-[10px]">Uniqueness</span>
                        <span className="font-bold text-purple-950">{aiScores.uniqueness}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verification Seal */}
            <Card className="border border-green-200/80 shadow-xs bg-gradient-to-br from-green-50/60 to-emerald-50/30 rounded-2xl">
              <CardContent className="p-4 text-xs space-y-2 text-gray-700">
                <div className="flex items-center gap-2 font-bold text-[#0F5132]">
                  <ShieldCheck className="h-4 w-4" />
                  Status Arsip Terverifikasi
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Seluruh data di halaman ini merupakan salinan arsip resmi (*immutable snapshot*) hasil kurasi dan Grand Final PIA Season 12.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: DOKUMEN & EMBEDDED PDF VIEWER (SPLIT / IN-PAGE VIEWER) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dokumen' && (
        <div className="space-y-4">
          {/* Viewer Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Document Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mr-1">
                <FileText className="h-4 w-4 text-[#0F5132]" />
                Dokumen:
              </span>
              {daftarLampiran.map((fileName, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDocIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    selectedDocIndex === idx
                      ? 'bg-[#0F5132] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{formatDocTitle(fileName)}</span>
                  {selectedDocIndex === idx && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>

            {/* PDF Actions & Open in New Tab */}
            <div className="flex items-center gap-2">
              {activeFileUrl && (
                <>
                  <a
                    href={activeFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Buka di Tab Baru
                  </a>
                  <a
                    href={activeFileUrl}
                    download={activeFileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh PDF
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Embedded Native PDF Viewer Frame */}
          <Card className="border border-gray-200 shadow-md bg-gray-900 rounded-2xl overflow-hidden min-h-[700px] flex flex-col">
            {activeFileUrl ? (
              <div className="w-full flex-1 min-h-[700px] relative bg-gray-800">
                <iframe
                  src={`${activeFileUrl}#toolbar=1&navpanes=0`}
                  title={activeFileName}
                  className="w-full h-full min-h-[700px] border-0 rounded-b-2xl"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400 space-y-3 min-h-[400px]">
                <FileText className="h-12 w-12 text-gray-500" />
                <p className="text-sm font-semibold text-gray-300">File lampiran fisik belum terhubung.</p>
                <p className="text-xs text-gray-500">Dokumen dapat diakses kembali lewat paket ZIP ekspor asli.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: RUANG DISKUSI & KURASI FGD (READ-ONLY) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'diskusi' && (
        <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#0F5132]" />
                  Ruang Diskusi & Catatan Kurasi FGD
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Ulasan kualitatif, catatan evaluasi, dan rekomendasi dari panelis kurator internal.
                </CardDescription>
              </div>
              <span className="text-[10px] font-bold bg-green-50 text-green-800 px-2.5 py-1 rounded-full border border-green-200">
                {riwayatKurasi.length} Catatan Diskusi
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {riwayatKurasi.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Tidak ada catatan kurasi tersedia.</p>
            ) : (
              <div className="space-y-4">
                {riwayatKurasi.map((k, idx) => {
                  const initials = (k.kurator || 'KR')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/60 hover:bg-white hover:border-[#0F5132]/40 transition-all shadow-xs space-y-2.5"
                    >
                      {/* Author Bar */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-gray-900">{k.kurator}</span>
                              <span className="text-[10px] font-semibold bg-gray-200/70 text-gray-700 px-2 py-0.5 rounded">
                                {k.tahap}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {formatDateSafe(k.tanggal, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                            </span>
                          </div>
                        </div>

                        {/* Status Verdict */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full border border-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {k.status}
                        </span>
                      </div>

                      {/* Comment Content */}
                      <div className="bg-white p-3.5 rounded-lg border border-gray-100 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {k.catatan}
                      </div>

                      {/* Vote contribution */}
                      {k.vote_nominasi > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                          <span className="text-amber-800 font-semibold flex items-center gap-1 text-[10px]">
                            <Vote className="h-3.5 w-3.5" />
                            Vote Panelis: Nominasikan ke Grand Final
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: PENILAIAN DEWAN JURI */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'juri' && (
        <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-[#0F5132]" />
              {juriSectionTitle}
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              {juriSectionDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {riwayatJuri.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Tidak ada catatan penilaian juri tersedia.</p>
            ) : (
              <div className="space-y-4">
                {riwayatJuri.map((j, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-amber-950 block">{j.juri}</span>
                          <span className="text-[10px] text-amber-800/80 font-mono">
                            Tahap: {j.tahap} • {formatDateSafe(j.tanggal)}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-extrabold bg-amber-100 text-amber-950 px-3 py-1 rounded-full border border-amber-300">
                        Skor: {j.skor}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-amber-100 text-xs text-gray-800 leading-relaxed">
                      {j.catatan}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
