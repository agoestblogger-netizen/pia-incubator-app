'use client';

import { useState, useEffect } from 'react';
import {
  getResetPreview,
  executeResetData,
  type ResetCountSummary,
} from '@/app/actions/reset-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Layers,
  FileArchive,
  RefreshCw,
  Info,
  FolderArchive,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';

interface TeamOption {
  id: string;
  nama: string;
  status: string;
}

export function ResetClient({ initialTeams }: { initialTeams: TeamOption[] }) {
  const [mode, setMode] = useState<'total' | 'section'>('total');
  const [teamScope, setTeamScope] = useState<'all' | 'selected'>('all');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([
    'charter',
    'kanban',
    'customer_validation',
    'market_validation',
    'keuangan',
    'governance',
  ]);

  const [confirmationWord, setConfirmationWord] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExecute, setLoadingExecute] = useState(false);
  const [counts, setCounts] = useState<ResetCountSummary>({
    timCount: 0,
    charterCount: 0,
    kanbanCardCount: 0,
    custValCount: 0,
    marketValCount: 0,
    keuanganCount: 0,
    governanceCount: 0,
    dossierCount: 0,
    roleTimCount: 0,
  });

  const [teams, setTeams] = useState<TeamOption[]>(initialTeams);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletedResult, setDeletedResult] = useState<ResetCountSummary | null>(null);

  // Fetch preview count whenever parameters change
  const refreshPreview = async () => {
    setLoadingPreview(true);
    const res = await getResetPreview({
      mode,
      teamScope,
      selectedTeamIds,
      selectedSections,
    });
    setLoadingPreview(false);
    if (res.success) {
      setCounts(res.counts);
      setTeams(res.teams);
    }
  };

  useEffect(() => {
    refreshPreview();
  }, [mode, teamScope, selectedTeamIds, selectedSections]);

  const toggleTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter((t) => t !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const toggleSelectAllTeams = () => {
    if (selectedTeamIds.length === teams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(teams.map((t) => t.id));
    }
  };

  const toggleSection = (sec: string) => {
    if (selectedSections.includes(sec)) {
      setSelectedSections(selectedSections.filter((s) => s !== sec));
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  };

  const handleExecute = async () => {
    if (confirmationWord !== 'HAPUS PERMANEN') {
      setErrorMsg('Anda harus mengetik "HAPUS PERMANEN" dengan huruf besar persis.');
      return;
    }

    setLoadingExecute(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await executeResetData({
      mode,
      teamScope,
      selectedTeamIds,
      selectedSections,
      confirmationWord,
    });

    setLoadingExecute(false);

    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setSuccessMsg(res.message);
      setDeletedResult(res.deletedCounts || null);
      setConfirmationWord('');
      refreshPreview();
    }
  };

  const isConfirmationValid = confirmationWord === 'HAPUS PERMANEN';
  const totalItemsToDelete = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner with Destructive Warning */}
      <div className="rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-amber-900 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 text-xs font-bold text-red-200 backdrop-blur-md mb-3 border border-red-400/30">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
            Fitur Khusus Administrator Innovation Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Trash2 className="h-7 w-7 text-red-300" />
            Reset Data & Pembersihan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-red-100/90 mt-2 leading-relaxed">
            Fitur destruktif untuk menghapus data pengujian atau mereset siklus inkubasi. Aksi ini bersifat <span className="font-bold underline text-amber-200">PERMANEN</span> dan akan dicatat secara otomatis ke dalam audit log sistem.
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-[#0F5132]" />
            1. Pilih Mode Pembersihan
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Tentukan cakupan pembersihan yang ingin dieksekusi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode 1: Reset Total */}
            <div
              onClick={() => setMode('total')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'total'
                  ? 'border-red-600 bg-red-50/40 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'total'}
                  onChange={() => setMode('total')}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <div>
                  <div className="font-bold text-sm text-gray-900">Mode 1: Reset Total</div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Menghapus <strong>SEMUA</strong> data tim inovator, seluruh charter, kanban, validasi, keuangan, governance, dan dossier arsip. Sistem akan kembali ke kondisi awal kosong.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode 2: Reset per Section */}
            <div
              onClick={() => setMode('section')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                mode === 'section'
                  ? 'border-[#0F5132] bg-green-50/40 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'section'}
                  onChange={() => setMode('section')}
                  className="mt-1 h-4 w-4 text-[#0F5132] focus:ring-[#0F5132]"
                />
                <div>
                  <div className="font-bold text-sm text-gray-900">Mode 2: Reset per Section & Tim</div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Pilih tim tertentu atau semua tim, lalu centang modul mana saja yang ingin dikosongkan (misal: hanya hapus Kanban / Validasi, tanpa menghapus tim).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode 2 Configuration (Scope & Sections) */}
      {mode === 'section' && (
        <div className="space-y-6">
          {/* Target Tim Scope */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#0F5132]" />
                    2. Pilih Target Tim Inovator
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Tentukan tim yang datanya akan direset ({teams.length} tim terdaftar).
                  </CardDescription>
                </div>
                {teamScope === 'selected' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAllTeams}
                    className="text-xs h-8"
                  >
                    {selectedTeamIds.length === teams.length ? 'Batal Semua' : 'Pilih Semua'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="teamScope"
                    checked={teamScope === 'all'}
                    onChange={() => setTeamScope('all')}
                    className="h-4 w-4 text-[#0F5132]"
                  />
                  Semua Tim Inovator ({teams.length})
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="teamScope"
                    checked={teamScope === 'selected'}
                    onChange={() => setTeamScope('selected')}
                    className="h-4 w-4 text-[#0F5132]"
                  />
                  Pilih Tim Tertentu ({selectedTeamIds.length} dipilih)
                </label>
              </div>

              {teamScope === 'selected' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 max-h-56 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50/50">
                  {teams.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-gray-400">
                      Tidak ada tim inovator di database.
                    </div>
                  ) : (
                    teams.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selectedTeamIds.includes(t.id)
                            ? 'bg-green-50 border-green-300 text-green-900 font-semibold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.includes(t.id)}
                          onChange={() => toggleTeam(t.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0F5132]"
                        />
                        <span className="truncate">{t.nama}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Checklist */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0F5132]" />
                3. Pilih Modul / Section yang Ingin Dihapus
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Centang satu atau beberapa section di bawah.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Option 1: Tim Inovator & Profil */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50/30 hover:bg-red-50/60 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.includes('tim_profil')}
                  onChange={() => toggleSection('tim_profil')}
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-bold text-xs text-red-950">Tim Inovator & Profil (Hapus Entitas Tim)</span>
                  <p className="text-[11px] text-red-800/90 mt-0.5">
                    Menghapus tim itu sendiri secara permanen beserta seluruh anggota. Jika opsi ini <strong>TIDAK dicentang</strong>, tim tetap ada namun data modul yang dicentang di bawah akan dikosongkan.
                  </p>
                </div>
              </label>

              {/* Standard Modul Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {[
                  { id: 'charter', label: 'Innovation Charter', desc: 'Project mission, HMW, hipotesis' },
                  { id: 'kanban', label: 'Kanban Board & Cards', desc: 'Sprint backlog & kartu aktivitas' },
                  { id: 'customer_validation', label: 'Customer Validation', desc: 'Plan, feedback testing & report' },
                  { id: 'market_validation', label: 'Market Validation', desc: 'MVP plan, sprint review & PMF' },
                  { id: 'keuangan', label: 'Keuangan (RAB & LPJ)', desc: 'Pengajuan anggaran Rp 20jt & LPJ' },
                  { id: 'governance', label: 'Governance (FMI & Medali)', desc: 'Notulensi keputusan & reward' },
                ].map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedSections.includes(s.id)
                        ? 'bg-green-50/60 border-green-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(s.id)}
                      onChange={() => toggleSection(s.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0F5132]"
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">{s.label}</span>
                      <span className="text-[10px] text-gray-500">{s.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* High-Risk Warning for Dossier Arsip PIA */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-400 bg-amber-50/60 hover:bg-amber-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes('dossier')}
                    onChange={() => toggleSection('dossier')}
                    className="mt-0.5 h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-amber-950">
                        Dossier Arsip PIA (Dokumen Snapshot & Lampiran Asli)
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        Perhatian Khusus
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                      ⚠️ <strong>PERINGATAN AUDIT TRAIL:</strong> Dossier Arsip adalah catatan resmi riwayat proposal CIDA hasil Grand Final. Hapus hanya jika ini adalah data uji coba, <strong>BUKAN</strong> data hasil Grand Final resmi. Opsi ini sengaja tidak otomatis dicentang.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Preview Box (Calculated directly from DB) */}
      <Card className="border-2 border-gray-300 bg-gray-50/70 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Preview Ringkasan Dampak Pembersihan (Live dari Database)
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={refreshPreview}
              disabled={loadingPreview}
              className="text-xs h-7 text-gray-600"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loadingPreview ? 'animate-spin' : ''}`} />
              Segarkan Hitungan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Tim Inovator</span>
              <span className="text-lg font-extrabold text-red-600">{counts.timCount} Tim</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Charter</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.charterCount} Dokumen</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Kanban Cards</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.kanbanCardCount} Kartu</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Customer Validation</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.custValCount} Dokumen</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Market Validation</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.marketValCount} Dokumen</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Keuangan (RAB & LPJ)</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.keuanganCount} Pengajuan</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">Governance (FMI)</span>
              <span className="text-lg font-extrabold text-gray-900">{counts.governanceCount} Record</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-300 bg-amber-50/40">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">Dossier Arsip</span>
              <span className="text-lg font-extrabold text-amber-800">{counts.dossierCount} Arsip</span>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
            <span>
              Total entitas data yang akan <strong>dihapus permanen</strong>:
            </span>
            <span className="text-sm font-extrabold text-red-600 font-mono">
              {totalItemsToDelete} item
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-300 p-4 flex items-start gap-3 text-sm text-red-900 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Gagal Mengeksekusi Reset</p>
            <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-start gap-3 text-sm text-green-900 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Reset Data Berhasil Dijalankan</p>
            <p className="text-xs text-green-800 mt-0.5">{successMsg}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Catatan audit trail telah disimpan secara permanen di tabel audit_logs.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Link href="/dashboard">
                <Button size="sm" className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8">
                  Buka Dashboard
                </Button>
              </Link>
              <Link href="/admin/import">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Import Data Calon Peserta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Safety Guard Execution */}
      <Card className="border-2 border-red-400 bg-red-50/20 shadow-md">
        <CardHeader className="pb-3 border-b border-red-100">
          <CardTitle className="text-sm font-extrabold text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Konfirmasi Keamanan & Eksekusi Permanen
          </CardTitle>
          <CardDescription className="text-xs text-red-700">
            Ketik kata konfirmasi berikut untuk membuka tombol eksekusi penghapusan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-800">
              Ketik <code className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono font-bold">HAPUS PERMANEN</code> untuk konfirmasi:
            </label>
            <Input
              type="text"
              placeholder="HAPUS PERMANEN"
              value={confirmationWord}
              onChange={(e) => setConfirmationWord(e.target.value)}
              className="text-xs h-10 border-red-300 font-mono focus:ring-red-500"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-red-100">
            <p className="text-[11px] text-gray-500 italic">
              *Tindakan ini tidak dapat dibatalkan (undo) setelah dieksekusi.
            </p>

            <Button
              type="button"
              onClick={handleExecute}
              disabled={!isConfirmationValid || loadingExecute || totalItemsToDelete === 0}
              className={`text-xs h-10 px-6 font-bold shadow-md transition-all ${
                isConfirmationValid && totalItemsToDelete > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loadingExecute ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Mengeksekusi Reset Data...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Eksekusi Hapus Permanen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
