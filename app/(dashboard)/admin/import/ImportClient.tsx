'use client';

import { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  checkDuplicateProposals,
  saveImportedProposal,
  finalizeImportAuditLog,
  type PreviewProposalItem,
  type CreatedAccountSummaryItem,
} from '@/app/actions/import-peserta';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  Users,
  ShieldAlert,
  Loader2,
  FileText,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import { PEGADAIAN_HEADER_GRADIENT_STYLE } from '@/lib/theme/tokens';

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [items, setItems] = useState<PreviewProposalItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrideIds, setOverrideIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [newlyCreatedAccounts, setNewlyCreatedAccounts] = useState<CreatedAccountSummaryItem[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const pathBasename = (fullPath: string) => {
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  };

  const findZipFile = (zip: JSZip, targetPath: string): JSZip.JSZipObject | null => {
    let f = zip.file(targetPath);
    if (f) return f;

    const cleanTarget = targetPath.toLowerCase().replace(/^\.?\//, '');
    const fileName = targetPath.split('/').pop()?.toLowerCase();

    for (const [relPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const cleanRel = relPath.toLowerCase().replace(/^\.?\//, '');
      if (cleanRel === cleanTarget || cleanRel.endsWith(`/${cleanTarget}`)) {
        return entry;
      }
      if (fileName && (cleanRel === fileName || cleanRel.endsWith(`/${fileName}`))) {
        if (cleanRel.includes('dossier')) {
          return entry;
        }
      }
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.zip')) {
      setErrorMsg('File harus berformat ZIP (.zip)');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);
    setSuccessMsg(null);
    setImportResult(null);
    setNewlyCreatedAccounts(null);
    setLoadingPreview(true);

    try {
      // Parse ZIP directly in the browser memory
      const zip = await JSZip.loadAsync(selectedFile);

      // Check ringkasan.csv
      const csvFile = findZipFile(zip, 'ringkasan.csv');
      if (!csvFile) {
        setErrorMsg('Format ZIP tidak valid: file "ringkasan.csv" tidak ditemukan di root ZIP.');
        setItems([]);
        setLoadingPreview(false);
        return;
      }

      const csvText = await csvFile.async('text');
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setErrorMsg('File ringkasan.csv kosong atau hanya berisi header.');
        setItems([]);
        setLoadingPreview(false);
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
      const propIdIdx = headers.indexOf('proposal_id');
      const seasonIdx = headers.indexOf('season');
      const namaProyekIdx = headers.indexOf('nama_proyek');
      const pengusulIdx = headers.indexOf('nama_pengusul');
      const emailIdx = headers.indexOf('email_pengusul');
      const kategoriIdx = headers.indexOf('kategori_pia');
      const skorAiIdx = headers.indexOf('skor_ai');
      const voteIdx = headers.indexOf('vote_nominasi');
      const tglReleaseIdx = headers.indexOf('tanggal_release');
      const dossierFileIdx = headers.indexOf('dossier_file');

      const previewItems: PreviewProposalItem[] = [];
      const proposalIds: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;

        const propId = cols[propIdIdx] || cols[0];
        const dossierPath = cols[dossierFileIdx] || `dossier/${propId}.json`;
        const dossierEntry = findZipFile(zip, dossierPath);
        const hasDossier = !!dossierEntry;

        const lampiranPrefix = `lampiran/${propId}/`.toLowerCase();
        const lampiranFiles: string[] = [];
        zip.forEach((relPath, zipEntry) => {
          if (!zipEntry.dir && relPath.toLowerCase().includes(lampiranPrefix)) {
            lampiranFiles.push(pathBasename(relPath));
          }
        });

        proposalIds.push(propId);
        previewItems.push({
          proposal_id: propId,
          season: cols[seasonIdx] || 'Season 12 - 2026',
          nama_proyek: cols[namaProyekIdx] || cols[2] || 'Tanpa Judul',
          nama_pengusul: cols[pengusulIdx] || cols[3] || 'Anonim',
          email_pengusul: cols[emailIdx] || cols[4] || '',
          kategori_pia: cols[kategoriIdx] || cols[5] || 'PUSAT',
          skor_ai: cols[skorAiIdx] || cols[6] || '-',
          vote_nominasi: cols[voteIdx] || cols[7] || '0',
          tanggal_release: cols[tglReleaseIdx] || cols[8] || new Date().toISOString(),
          dossier_file: dossierPath,
          has_dossier_json: hasDossier,
          has_lampiran: lampiranFiles.length > 0,
          lampiran_files: lampiranFiles,
          is_duplicate: false,
        });
      }

      // Check duplicates against server
      const duplicateMap = await checkDuplicateProposals(proposalIds);
      const initialSelected = new Set<string>();
      const initialOverride = new Set<string>();

      previewItems.forEach((item) => {
        if (duplicateMap[item.proposal_id]) {
          item.is_duplicate = true;
          item.existing_tim_id = duplicateMap[item.proposal_id];
          initialSelected.add(item.proposal_id);
          initialOverride.add(item.proposal_id);
        } else {
          initialSelected.add(item.proposal_id);
        }
      });

      setItems(previewItems);
      setSelectedIds(initialSelected);
      setOverrideIds(initialOverride);
      setLoadingPreview(false);
    } catch (err: any) {
      console.error('Error reading ZIP:', err);
      setErrorMsg(`Gagal membaca file ZIP: ${err.message}`);
      setItems([]);
      setLoadingPreview(false);
    }
  };

  const toggleSelect = (propId: string) => {
    const next = new Set(selectedIds);
    if (next.has(propId)) {
      next.delete(propId);
    } else {
      next.add(propId);
    }
    setSelectedIds(next);
  };

  const toggleOverride = (propId: string) => {
    const next = new Set(overrideIds);
    if (next.has(propId)) {
      next.delete(propId);
    } else {
      next.add(propId);
    }
    setOverrideIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.proposal_id)));
    }
  };

  const toggleOverrideAllDuplicates = () => {
    const duplicateIds = items.filter((i) => i.is_duplicate).map((i) => i.proposal_id);
    const allOverridden = duplicateIds.every((id) => overrideIds.has(id));
    const next = new Set(overrideIds);
    if (allOverridden) {
      duplicateIds.forEach((id) => next.delete(id));
    } else {
      duplicateIds.forEach((id) => next.add(id));
    }
    setOverrideIds(next);
  };

  const handleConfirmImport = async () => {
    if (!file || selectedIds.size === 0) return;

    setLoadingConfirm(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressPercent(0);
    setProgressText('');
    setNewlyCreatedAccounts(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const selectedList = items.filter((i) => selectedIds.has(i.proposal_id));
      const total = selectedList.length;

      // Batch concurrency: 3 tim paralel per gelombang
      const BATCH_SIZE = 3;
      const totalWaves = Math.ceil(total / BATCH_SIZE);

      let importedCount = 0;
      let skippedCount = 0;
      let completedCount = 0;
      const importedIds: string[] = [];
      const allCreatedAccounts: CreatedAccountSummaryItem[] = [];
      const failedTeams: string[] = [];

      // ─── Helpers ────────────────────────────────────────────────────────────

      /** Buat promise yang reject setelah `ms` milidetik */
      const makeTimeout = (ms: number, label: string): Promise<never> =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`⏱ Timeout ${ms / 1000}s: ${label}`)), ms)
        );

      // Fungsi pemroses satu tim — terisolasi, aman untuk dijalankan paralel
      const processSingleTeam = async (item: (typeof selectedList)[0]) => {
        const propId = item.proposal_id;
        const isOverride = overrideIds.has(propId);
        const tag = `[Import:${propId}]`;

        // ── Tahap 1: Baca dossier JSON ──────────────────────────────────────
        console.log(`${tag} ▶ Tahap 1/4: Membaca dossier JSON...`);
        const dossierFile = findZipFile(zip, item.dossier_file || `dossier/${propId}.json`);
        let dossierData: any = null;
        if (dossierFile) {
          try {
            const text = await dossierFile.async('text');
            dossierData = JSON.parse(text);
            console.log(`${tag} ✓ Dossier JSON terbaca (${text.length} chars)`);
          } catch {
            console.warn(`${tag} ⚠ Gagal parse dossier JSON, lanjut tanpa dossier`);
            dossierData = null;
          }
        } else {
          console.warn(`${tag} ⚠ Dossier JSON tidak ditemukan di ZIP`);
        }

        // ── Tahap 2: Upload lampiran (maks 20s per file) ────────────────────
        console.log(`${tag} ▶ Tahap 2/4: Upload lampiran...`);
        const lampiranUrls: Record<string, string> = {};
        const lampiranPrefix = `lampiran/${propId}/`;

        const attachmentEntries: { relPath: string; entry: JSZip.JSZipObject }[] = [];
        zip.forEach((relPath, entry) => {
          if (!entry.dir && relPath.startsWith(lampiranPrefix)) {
            attachmentEntries.push({ relPath, entry });
          }
        });

        if (attachmentEntries.length > 0) {
          console.log(`${tag} Mengunggah ${attachmentEntries.length} lampiran...`);
          await Promise.allSettled(
            attachmentEntries.map(async ({ relPath, entry }) => {
              const fileName = pathBasename(relPath);
              const controller = new AbortController();
              const uploadTimeoutId = setTimeout(() => controller.abort(), 20_000);
              try {
                const blob = await entry.async('blob');
                const uploadFormData = new FormData();
                uploadFormData.append('proposalId', propId);
                uploadFormData.append('fileName', fileName);
                uploadFormData.append('file', blob, fileName);

                const uploadRes = await fetch('/api/admin/import/upload-file', {
                  method: 'POST',
                  body: uploadFormData,
                  signal: controller.signal,
                });

                if (uploadRes.ok) {
                  const uploadJson = await uploadRes.json();
                  if (uploadJson.success && uploadJson.publicUrl) {
                    lampiranUrls[fileName] = uploadJson.publicUrl;
                  }
                }
              } catch (uErr: any) {
                console.warn(`${tag} ⚠ Gagal upload lampiran ${fileName}: ${uErr.message}`);
              } finally {
                clearTimeout(uploadTimeoutId);
              }
            })
          );
          console.log(`${tag} ✓ Lampiran selesai (${Object.keys(lampiranUrls).length}/${attachmentEntries.length} berhasil)`);
        } else {
          console.log(`${tag} ℹ Tidak ada lampiran`);
        }

        // ── Tahap 3: Save ke DB + AI Backlog (via server action) ────────────
        console.log(`${tag} ▶ Tahap 3/4: saveImportedProposal (DB + AI backlog)...`);
        const saveRes = await saveImportedProposal({
          proposalId: propId,
          season: item.season,
          namaProyek: item.nama_proyek,
          kategoriPia: item.kategori_pia,
          klasifikasiInovasi:
            dossierData?.hasil_grand_final_resmi?.klasifikasi_akhir ||
            dossierData?.status_akhir?.peringkat_medali ||
            dossierData?.data_submisi?.klasifikasi_inovasi ||
            'Platinum',
          pengusul: {
            nama: item.nama_pengusul,
            email: item.email_pengusul,
            jabatan: dossierData?.data_submisi?.pengusul?.jabatan || 'Inisiator',
            unit_kerja: dossierData?.data_submisi?.pengusul?.unit_kerja || 'PT Pegadaian (Persero)',
          },
          dossierData,
          lampiranUrls,
          override: isOverride,
        });

        console.log(`${tag} ✅ Tahap 4/4: Selesai — action: ${saveRes.action}`);
        return { propId, namaProyek: item.nama_proyek, saveRes };
      };

      /** Bungkus processSingleTeam dengan timeout 60 detik per tim */
      const processSingleTeamWithTimeout = (item: (typeof selectedList)[0]) =>
        Promise.race([
          processSingleTeam(item),
          makeTimeout(60_000, `${item.nama_proyek} (${item.proposal_id})`),
        ]);


      // Jalankan dalam gelombang (wave) batch paralel
      for (let wave = 0; wave < totalWaves; wave++) {
        const waveStart = wave * BATCH_SIZE;
        const waveEnd = Math.min(waveStart + BATCH_SIZE, total);
        const waveItems = selectedList.slice(waveStart, waveEnd);
        const waveNum = wave + 1;
        const timRange = `${waveStart + 1}–${waveEnd}`;

        setProgressText(`Memproses gelombang ${waveNum}/${totalWaves} (tim ${timRange} dari ${total})...`);
        setProgressPercent(Math.round((completedCount / total) * 100));

        // Promise.allSettled + per-tim timeout 60s: gelombang TIDAK BISA hang selamanya
        const waveResults = await Promise.allSettled(
          waveItems.map((item) => processSingleTeamWithTimeout(item))
        );

        // Agregasi hasil gelombang ini
        for (const result of waveResults) {
          completedCount++;
          if (result.status === 'fulfilled') {
            const { propId, namaProyek, saveRes } = result.value;
            if (saveRes.action === 'skipped') {
              skippedCount++;
            } else {
              importedCount++;
              importedIds.push(propId);
              if (saveRes.createdAccounts && saveRes.createdAccounts.length > 0) {
                allCreatedAccounts.push(...saveRes.createdAccounts);
              }
            }
          } else {
            // Tim gagal — catat, tetap lanjut
            const failedItem = waveItems[waveResults.indexOf(result)];
            const failedName = failedItem?.nama_proyek || 'Tim tidak diketahui';
            console.error(`[Import] Tim gagal: ${failedName}`, result.reason);
            failedTeams.push(failedName);
          }
        }

        setProgressPercent(Math.round((completedCount / total) * 100));
        if (wave < totalWaves - 1) {
          setProgressText(`Gelombang ${waveNum}/${totalWaves} selesai (${completedCount}/${total} tim diproses). Melanjutkan gelombang ${waveNum + 1}...`);
        }
      }

      // 4. Record single audit log
      await finalizeImportAuditLog({
        totalSelected: total,
        importedCount,
        skippedCount,
        proposalIds: importedIds,
        createdAccountsCount: allCreatedAccounts.length,
      });

      setLoadingConfirm(false);
      setProgressText('');
      setProgressPercent(100);

      const successText = `Proses import selesai: ${importedCount} tim berhasil diproses, ${skippedCount} di-skip.${failedTeams.length > 0 ? ` ⚠️ ${failedTeams.length} tim gagal: ${failedTeams.join(', ')}.` : ''}`;
      toast.success(successText, 'Import Berhasil');
      setSuccessMsg(successText);
      setImportResult({ imported: importedCount, skipped: skippedCount });

      if (failedTeams.length > 0) {
        toast.error(`${failedTeams.length} tim gagal diproses: ${failedTeams.join(', ')}`, 'Peringatan Import Parsial');
      }

      if (allCreatedAccounts.length > 0) {
        setNewlyCreatedAccounts(allCreatedAccounts);
      }
    } catch (err: any) {
      console.error('Import processing error:', err);
      setLoadingConfirm(false);
      setProgressText('');
      const errText = `Terjadi kesalahan saat memproses import: ${err.message}`;
      toast.error(errText, 'Gagal Import');
      setErrorMsg(errText);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Banner Gradient Pegadaian */}
      <div
        style={PEGADAIAN_HEADER_GRADIENT_STYLE}
        className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-semibold text-white backdrop-blur-md mb-3 border border-white/15">
            <FileArchive className="h-3.5 w-3.5 text-[#E6CA65]" />
            Import Data Otomatis PIA
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight drop-shadow-xs">
            Import Calon Peserta Inkubasi
          </h1>
          <p className="text-sm text-green-100/90 mt-2 leading-relaxed font-normal">
            Unggah berkas ZIP hasil kurasi Grand Final PIA untuk memasukkan tim inovator, arsip dossier, dan membuat akun anggota tim secara otomatis.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-[#0F5132] transition-colors bg-white">
        <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="p-4 rounded-full bg-green-50 text-[#0F5132] mb-3">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-base text-gray-900 mb-1">
            {file ? file.name : 'Pilih Berkas ZIP Calon Peserta'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mb-4">
            Struktur ZIP harus berisi <code>ringkasan.csv</code>, folder <code>dossier/</code> (.json), dan folder <code>lampiran/</code>.
          </p>

          <input
            type="file"
            accept=".zip"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingPreview || loadingConfirm}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-semibold text-xs h-9 px-4 rounded-xl"
            >
              {file ? 'Ganti Berkas ZIP' : 'Pilih Berkas ZIP'}
            </Button>
            {file && (
              <span className="text-xs font-mono text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Preview State */}
      {loadingPreview && (
        <div className="py-8 text-center space-y-2">
          <RefreshCw className="h-6 w-6 text-[#0F5132] animate-spin mx-auto" />
          <p className="text-xs text-gray-600 font-medium">Membaca dan memverifikasi isi file ZIP...</p>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-300 p-4 flex items-start gap-3 text-sm text-red-900 shadow-xs">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Terjadi Kesalahan</p>
            <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-start gap-3 text-sm text-green-900 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Import Selesai</p>
            <p className="text-xs text-green-800 mt-0.5">{successMsg}</p>
            <div className="mt-3 flex items-center gap-3">
              <Link href="/dashboard">
                <Button size="sm" className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8">
                  Lihat Dashboard Tim Inovator
                </Button>
              </Link>
              <Link href="/dossier">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Buka Menu Dossier Arsip
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table & Action Controls */}
      {items.length > 0 && !loadingPreview && (
        <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>Daftar Calon Peserta Terbaca ({items.length} Proposal)</span>
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Centang proposal yang ingin diimpor ke sistem inkubasi.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={loadingConfirm}
                className="text-xs h-8"
              >
                {selectedIds.size === items.length ? 'Batal Semua' : 'Pilih Semua'}
              </Button>

              {items.some((i) => i.is_duplicate) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleOverrideAllDuplicates}
                  disabled={loadingConfirm}
                  className="text-xs h-8 text-amber-800 border-amber-300 hover:bg-amber-50"
                >
                  {items.filter((i) => i.is_duplicate).every((i) => overrideIds.has(i.proposal_id))
                    ? 'Batal Timpa Duplikat'
                    : 'Timpa Semua Duplikat'}
                </Button>
              )}

              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={loadingConfirm || selectedIds.size === 0}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8 font-bold gap-1.5 shadow-xs"
              >
                {loadingConfirm ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Memproses ({progressPercent}%)...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Konfirmasi Import ({selectedIds.size})</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          {loadingConfirm && (
            <div className="p-4 bg-green-50/60 border-b border-green-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-green-900 font-semibold">
                <span>{progressText}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0F5132] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100/75 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3 w-10 text-center">Pilih</th>
                  <th className="p-3">Proposal ID</th>
                  <th className="p-3">Nama Proyek Inovasi</th>
                  <th className="p-3">Pengusul & Anggota</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Dossier & Lampiran</th>
                  <th className="p-3 text-center">Status Duplikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.proposal_id);
                  const isOverride = overrideIds.has(item.proposal_id);

                  return (
                    <tr
                      key={item.proposal_id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        item.is_duplicate ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.proposal_id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0F5132] focus:ring-[#0F5132]"
                        />
                      </td>

                      <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {item.proposal_id}
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {item.season}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <span className="font-bold text-gray-900 block leading-snug">
                          {item.nama_proyek}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-gray-800 block">
                          {item.nama_pengusul}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {item.email_pengusul || '-'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F5132]/10 text-[#0F5132]">
                          {item.kategori_pia}
                        </span>
                      </td>

                      <td className="p-3 text-[11px] space-y-0.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              item.has_dossier_json ? 'bg-green-500' : 'bg-red-400'
                            }`}
                          />
                          <span className="text-gray-600">
                            {item.has_dossier_json ? 'Dossier JSON OK' : 'Tanpa JSON'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              item.has_lampiran ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                          />
                          <span className="text-gray-500">
                            {item.lampiran_files.length} berkas lampiran
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        {item.is_duplicate ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              <ShieldAlert className="h-3 w-3" />
                              Sudah Pernah Di-import
                            </span>
                            <div>
                              <label className="inline-flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isOverride}
                                  onChange={() => toggleOverride(item.proposal_id)}
                                  className="h-3 w-3 rounded text-amber-600"
                                />
                                Timpa Data
                              </label>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                            Calon Peserta Baru
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Ringkasan Akun Baru Dibuat Otomatis dari Proposal (Import Batch) */}
      <Dialog
        open={Boolean(newlyCreatedAccounts && newlyCreatedAccounts.length > 0)}
        onOpenChange={(open) => {
          if (!open) setNewlyCreatedAccounts(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {newlyCreatedAccounts?.length} Akun Baru Dibuat Otomatis Dari Data Proposal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-gray-700 leading-relaxed">
              Sebanyak <strong>{newlyCreatedAccounts?.length} akun baru</strong> berhasil dibuat otomatis dari data proposal (password default: <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold font-mono">gadai123</code>, <strong>wajib diganti saat login pertama</strong>):
            </p>

            <div className="space-y-2 border border-emerald-200 bg-emerald-50/50 p-3.5 rounded-xl max-h-64 overflow-y-auto">
              {newlyCreatedAccounts?.map((acc, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs"
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="font-bold text-gray-900 block truncate">{acc.nama}</span>
                    <span className="text-[11px] text-gray-500 font-mono block truncate">{acc.email}</span>
                    <span className="text-[10px] text-gray-400 block truncate">Tim: {acc.timNama}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-emerald-300 text-emerald-800 shrink-0"
                  >
                    {acc.roleName}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                Informasikan ke Anggota Tim:
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Segera informasikan ke masing-masing bahwa akun mereka sudah dibuat dan bisa login dengan password default di atas — sistem akan otomatis meminta mereka mengganti password saat login pertama kali.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setNewlyCreatedAccounts(null)}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold w-full sm:w-auto"
            >
              Mengerti & Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
