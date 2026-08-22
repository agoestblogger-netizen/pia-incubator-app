'use client';

import { useState, useRef } from 'react';
import { previewImportZip, confirmImportPeserta, type PreviewProposalItem } from '@/app/actions/import-peserta';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileArchive, CheckCircle2, AlertTriangle, XCircle, ArrowRight, RefreshCw, FileText, Check, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [items, setItems] = useState<PreviewProposalItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrideIds, setOverrideIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setLoadingPreview(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await previewImportZip(formData);
    setLoadingPreview(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Gagal memproses preview ZIP.');
      setItems([]);
    } else {
      setItems(res.items);
      // By default select all non-duplicate items
      const initialSelected = new Set<string>();
      const initialOverride = new Set<string>();

      res.items.forEach(item => {
        if (!item.is_duplicate) {
          initialSelected.add(item.proposal_id);
        } else {
          // If duplicate, can still select if desired
          initialSelected.add(item.proposal_id);
          initialOverride.add(item.proposal_id);
        }
      });

      setSelectedIds(initialSelected);
      setOverrideIds(initialOverride);
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
      setSelectedIds(new Set(items.map(i => i.proposal_id)));
    }
  };

  const handleConfirmImport = async () => {
    if (!file || selectedIds.size === 0) return;

    setLoadingConfirm(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await confirmImportPeserta(
      formData,
      Array.from(selectedIds),
      Array.from(overrideIds)
    );

    setLoadingConfirm(false);

    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setSuccessMsg(res.message);
      setImportResult({
        imported: res.importedCount,
        skipped: res.skippedCount,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileArchive className="h-7 w-7 text-[#0F5132]" />
            Import Calon Peserta Inkubasi
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Unggah paket ekspor ZIP dari PIA Curation App untuk memasukkan proposal yang lolos Grand Final (Status Release).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dossier">
            <Button variant="outline" className="text-xs h-9">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Lihat Arsip Dossier
            </Button>
          </Link>
        </div>
      </div>

      {/* Upload Box */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-[#0F5132] transition-colors bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".zip"
            className="hidden"
          />

          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4 text-[#0F5132]">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {file ? file.name : 'Pilih atau Tarik File ZIP Ekspor PIA Curation'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
            Paket harus berisi <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono">ringkasan.csv</code> di root, folder <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">dossier/</code>, dan lampiran terkait.
          </p>

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingPreview || loadingConfirm}
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-9 px-4 font-semibold"
          >
            {loadingPreview ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                Membaca File ZIP...
              </>
            ) : file ? (
              'Ganti File ZIP'
            ) : (
              'Pilih File ZIP'
            )}
          </Button>

          {file && !loadingPreview && (
            <p className="text-xs text-green-700 font-medium mt-2">
              Ukuran: {(file.size / 1024 / 1024).toFixed(2)} MB • Siap diproses
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-sm text-red-800 shadow-sm">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kesalahan</p>
            <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3 text-sm text-green-900 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Proses Import Berhasil</p>
            <p className="text-xs text-green-800 mt-0.5">{successMsg}</p>
            <div className="mt-3 flex items-center gap-3">
              <Link href="/dashboard">
                <Button size="sm" className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8">
                  Buka Dashboard Tim
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
              <Link href="/dossier">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Buka Perpustakaan Dossier
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {items.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Preview Data Submisi ({items.length} Proposal)</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Centang proposal yang ingin dimasukkan sebagai tim calon peserta.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs h-8"
                >
                  {selectedIds.size === items.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedIds.size === 0 || loadingConfirm}
                  className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-semibold text-xs h-8 px-4 shadow-sm"
                >
                  {loadingConfirm ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Memproses Import ({selectedIds.size})...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Konfirmasi Import ({selectedIds.size} Tim)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-100/75 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-10 text-center">Pilih</th>
                  <th className="p-3">ID Proposal</th>
                  <th className="p-3">Nama Proyek Inovasi</th>
                  <th className="p-3">Pengusul & Unit</th>
                  <th className="p-3 text-center">Kategori</th>
                  <th className="p-3 text-center">Skor AI</th>
                  <th className="p-3 text-center">Kelengkapan</th>
                  <th className="p-3 text-center">Status Import</th>
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
                      </td>

                      <td className="p-3 font-semibold text-gray-900 max-w-xs">
                        <div>{item.nama_proyek}</div>
                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                          {item.season}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{item.nama_pengusul}</div>
                        <div className="text-[11px] text-gray-500">{item.email_pengusul}</div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {item.kategori_pia}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-medium whitespace-nowrap">
                        {item.skor_ai}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        {item.has_dossier_json ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Dossier OK ({item.lampiran_files.length} file)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <AlertTriangle className="h-3 w-3" />
                            Dossier Hilang
                          </span>
                        )}
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
    </div>
  );
}
