"use client";

import { useState } from "react";
import {
  submitAnggaranAction,
  updateAnggaranAction,
  deleteAnggaranAction,
  submitLpjAction,
  authorizeAnggaranAction,
  approveLpjAction,
  approveAnggaranWithSignatureAction,
  rejectAnggaranAction,
} from "@/app/actions/keuangan";
import { toast } from "@/components/ui/ToastProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Plus,
  ChevronDown,
  Wallet,
  FileText,
  CheckCircle2,
  Upload,
  ShieldCheck,
  Check,
  X,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Pencil,
  Trash2,
  PenTool,
  Lock,
  Building2,
  User,
  Phone,
  HelpCircle,
  Eye,
  AlertTriangle,
  RotateCcw,
  Paperclip,
  Link2,
  Clock,
  Calendar,
  DollarSign,
  CheckCheck,
  Download,
} from "lucide-react";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { SignaturePadModal } from "@/components/ui/SignaturePad";
import {
  type AnggaranDetailPengajuan,
  type RabItemRow,
  type LpjDetailPengajuan,
  type LpjItemRow,
  type LpjEvidenceItem,
} from "@/lib/db/schema";

export function calculateLpjDeadlineInfo(startDate?: Date | string | null): {
  deadline: Date;
  isLate: boolean;
  businessDaysCount: number;
} | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const deadline = new Date(start);
  let added = 0;
  while (added < 10) {
    deadline.setDate(deadline.getDate() + 1);
    const day = deadline.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  deadline.setHours(23, 59, 59, 999);

  const now = new Date();
  if (now > deadline) {
    let cur = new Date(deadline);
    let lateDays = 0;
    while (cur < now) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        lateDays++;
      }
    }
    return {
      deadline,
      isLate: true,
      businessDaysCount: Math.max(1, lateDays),
    };
  } else {
    let cur = new Date(now);
    let remainingDays = 0;
    while (cur < deadline) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        remainingDays++;
      }
    }
    return {
      deadline,
      isLate: false,
      businessDaysCount: remainingDays,
    };
  }
}

const KATEGORI_PROYEK_OPTIONS = [
  "Regional Innovation",
  "Breakthrough Innovation",
  "Leadership Challenge",
  "Business Case Innovation",
];

const SATUAN_SUGGESTIONS = [
  "Paket",
  "Orang",
  "Jam",
  "Hari",
  "Minggu",
  "Bulan",
  "Kali",
  "Unit",
  "Buah",
  "Lembar",
  "Kegiatan",
  "Sesi",
  "Lisensi",
];

function SatuanInputCombobox({
  value,
  onChange,
  disabled,
  className = "h-8 text-xs",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative flex items-center w-full min-w-[90px]">
        <Input
          type="text"
          required
          list="satuan-options"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setOpen(true)}
          placeholder="Satuan..."
          className={`${className} pr-7 font-medium`}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-1 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer rounded"
            title="Pilih rekomendasi satuan"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180 text-[#0F5132]" : ""}`} />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-44 p-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
      >
        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
          Pilih Satuan:
        </div>
        <div className="py-1 space-y-0.5">
          {SATUAN_SUGGESTIONS.map((s) => {
            const isSelected = value?.toLowerCase() === s.toLowerCase();
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center justify-between hover:bg-emerald-50 hover:text-[#0F5132] cursor-pointer ${
                  isSelected ? "bg-emerald-50 text-[#0F5132] font-bold" : "text-gray-700"
                }`}
              >
                <span>{s}</span>
                {isSelected && <Check className="h-3 w-3 text-[#0F5132]" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function KeuanganClient({
  timId,
  initialList,
  canSubmit = false,
  canManage = false,
  canApproveAnggaran = false,
  approvers = [],
  timInfo,
  currentUser,
  anggotaTim = [],
}: {
  timId: string;
  initialList: any[];
  canSubmit?: boolean;
  canManage?: boolean;
  canApproveAnggaran?: boolean;
  approvers?: Array<{ id: string; nama: string; email: string; unitKerja?: string }>;
  timInfo?: {
    namaProyekInovasi?: string | null;
    kategoriPia?: string | null;
  };
  currentUser?: {
    id?: string;
    nama?: string;
    email?: string;
    unitKerja?: string;
  };
  anggotaTim?: any[];
}) {
  const [list, setList] = useState(initialList);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isLpjOpen, setIsLpjOpen] = useState(false);
  const [activeAnggaranId, setActiveAnggaranId] = useState<string | null>(null);

  // Helper untuk mendapatkan unit kerja default
  const getDefaultUnitKerja = () => {
    if (currentUser?.unitKerja) return currentUser.unitKerja;
    const found = anggotaTim.find(
      (a) =>
        (currentUser?.id && a.userId === currentUser.id) ||
        (currentUser?.nama && a.nama?.toLowerCase().trim() === currentUser.nama?.toLowerCase().trim())
    );
    return found?.unitKerja || "";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM PENGAJUAN ANGGARAN (RAB) STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [fase, setFase] = useState("customer_validation");
  // Bagian 1 — Identitas Pengajuan
  const [namaPic, setNamaPic] = useState(currentUser?.nama || "");
  const [unitKerjaPic, setUnitKerjaPic] = useState(getDefaultUnitKerja());
  const [noHpPic, setNoHpPic] = useState("");
  // Bagian 2 — Ringkasan Pengajuan Dana
  const [judulProyek, setJudulProyek] = useState(timInfo?.namaProyekInovasi || "");
  const [kategoriProyek, setKategoriProyek] = useState("");
  const [tujuanPenggunaan, setTujuanPenggunaan] = useState("");
  const [nominalDiajukan, setNominalDiajukan] = useState<number>(0);
  // Bagian 3 — Tujuan Aktivitas Inkubasi
  const [outputYangDiharapkan, setOutputYangDiharapkan] = useState("");
  // Bagian 4 — Rencana Anggaran Biaya (RAB) Dinamis
  const [rabItems, setRabItems] = useState<RabItemRow[]>([
    {
      id: "row-1",
      uraian: "",
      kuantitas: 1,
      satuan: "Paket",
      hargaSatuan: 0,
      jumlah: 0,
      keterangan: "",
    },
  ]);
  // Bagian 5 — Pengesahan (PIC)
  const [nikPic, setNikPic] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  // Lampiran Tambahan (Opsional)
  const [fileDokumenUrl, setFileDokumenUrl] = useState("");

  // Modal Signature Pad state
  const [isSigPadOpen, setIsSigPadOpen] = useState(false);
  const [sigPadTarget, setSigPadTarget] = useState<"submit" | "edit" | "approve" | "lpj">("submit");
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    targetId: string;
    alasan: string;
  }>({
    open: false,
    targetId: "",
    alasan: "",
  });
  const [isRejecting, setIsRejecting] = useState(false);

  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    item: any | null;
  }>({
    open: false,
    item: null,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM LPJ (FORMULIR B - LAMPIRAN III) STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [isLpjFormOpen, setIsLpjFormOpen] = useState(false);
  const [lpjSelectedRabId, setLpjSelectedRabId] = useState<string>("");

  // Bagian A — Identitas Pengajuan Inovator
  const [lpjNamaPic, setLpjNamaPic] = useState("");
  const [lpjUnitKerjaPic, setLpjUnitKerjaPic] = useState("");
  const [lpjNoHpPic, setLpjNoHpPic] = useState("");

  // Bagian B — Informasi Inovasi
  const [lpjJudulProyek, setLpjJudulProyek] = useState("");
  const [lpjKategoriProyek, setLpjKategoriProyek] = useState("");

  // Bagian C — Ringkasan Penggunaan Anggaran (Tabel Dinamis)
  const [lpjItems, setLpjItems] = useState<LpjItemRow[]>([
    {
      id: "lpj-row-1",
      uraian: "",
      nominal: 0,
      keterangan: "",
      evidence: [],
    },
  ]);

  // Bagian D — Pernyataan & Pengesahan
  const [lpjNikPic, setLpjNikPic] = useState("");
  const [lpjSignatureImage, setLpjSignatureImage] = useState<string | null>(null);

  // Uploading indicator & Modal Detail LPJ
  const [isUploadingEvidence, setIsUploadingEvidence] = useState<{ [rowId: string]: boolean }>({});
  const [isSubmittingLpj, setIsSubmittingLpj] = useState(false);

  // Modal View Detail LPJ
  const [detailLpjModal, setDetailLpjModal] = useState<{
    open: boolean;
    item: any | null;
    rabItem?: any | null;
  }>({
    open: false,
    item: null,
    rabItem: null,
  });

  // Modal Input Link Evidence per Baris
  const [linkInputModal, setLinkInputModal] = useState<{
    open: boolean;
    rowId: string;
    url: string;
    label: string;
  }>({
    open: false,
    rowId: "",
    url: "",
    label: "",
  });

  // Total Penggunaan Dana LPJ
  const totalNominalLpj = lpjItems.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const selectedRabForLpj = list.find((item) => item.id === lpjSelectedRabId);
  const approvedRabNominal = Number(selectedRabForLpj?.nominalDiajukan) || 0;

  // Edit Anggaran Modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string;
    fase: string;
    namaPic: string;
    unitKerjaPic: string;
    noHpPic: string;
    judulProyek: string;
    kategoriProyek: string;
    tujuanPenggunaan: string;
    outputYangDiharapkan: string;
    nominalDiajukan: number;
    rabItems: RabItemRow[];
    nikPic: string;
    signatureImage: string | null;
    fileDokumenUrl: string;
  }>({
    open: false,
    id: "",
    fase: "customer_validation",
    namaPic: "",
    unitKerjaPic: "",
    noHpPic: "",
    judulProyek: "",
    kategoriProyek: "",
    tujuanPenggunaan: "",
    outputYangDiharapkan: "",
    nominalDiajukan: 0,
    rabItems: [],
    nikPic: "",
    signatureImage: null,
    fileDokumenUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    nominal: number;
    fase: string;
  }>({
    open: false,
    id: "",
    nominal: 0,
    fase: "",
  });
  const [deleting, setDeleting] = useState(false);

  // Approval Modal state
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    type: "anggaran" | "lpj";
    targetId: string;
    action: "approve" | "reject";
    nominal?: number;
    fase?: string;
  }>({
    open: false,
    type: "anggaran",
    targetId: "",
    action: "approve",
  });
  const [approvalNotes, setApprovalNotes] = useState("");
  const [processingApproval, setProcessingApproval] = useState(false);

  // Form LPJ
  const [lpjDocUrl, setLpjDocUrl] = useState("");
  const [tglKegiatanSelesai, setTglKegiatanSelesai] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Total RAB kalkulasi otomatis
  const totalRabSubmit = Math.round(rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0));
  const totalRabEdit = Math.round(editModal.rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0));

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS UNTUK TABEL DINAMIS RAB
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAddRabRow = (isEdit: boolean = false) => {
    const newRow: RabItemRow = {
      id: "row-" + Math.random().toString(36).substring(2, 9),
      uraian: "",
      kuantitas: 1,
      satuan: "Paket",
      hargaSatuan: 0,
      jumlah: 0,
      keterangan: "",
    };

    if (isEdit) {
      setEditModal((prev) => ({
        ...prev,
        rabItems: [...prev.rabItems, newRow],
      }));
    } else {
      setRabItems((prev) => [...prev, newRow]);
    }
  };

  const handleRemoveRabRow = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editModal.rabItems.length <= 1) {
        toast.warning("Minimal harus ada 1 baris rincian RAB.");
        return;
      }
      setEditModal((prev) => ({
        ...prev,
        rabItems: prev.rabItems.filter((r) => r.id !== id),
      }));
    } else {
      if (rabItems.length <= 1) {
        toast.warning("Minimal harus ada 1 baris rincian RAB.");
        return;
      }
      setRabItems((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleUpdateRabRow = (
    id: string,
    field: keyof RabItemRow,
    value: any,
    isEdit: boolean = false
  ) => {
    const updater = (prevItems: RabItemRow[]) =>
      prevItems.map((row) => {
        if (row.id !== id) return row;
        const updatedRow = { ...row, [field]: value };
        if (field === "kuantitas" || field === "hargaSatuan") {
          const qty = field === "kuantitas" ? Number(value) || 0 : row.kuantitas;
          const price = field === "hargaSatuan" ? Number(value) || 0 : row.hargaSatuan;
          updatedRow.jumlah = Math.round(qty * price);
        }
        return updatedRow;
      });

    if (isEdit) {
      setEditModal((prev) => ({ ...prev, rabItems: updater(prev.rabItems) }));
    } else {
      setRabItems((prev) => updater(prev));
    }
  };

  // Reset & buka formulir submit baru
  const handleOpenSubmitModal = () => {
    setFase("customer_validation");
    setNamaPic(currentUser?.nama || "");
    setUnitKerjaPic(getDefaultUnitKerja());
    setNoHpPic("");
    setJudulProyek(timInfo?.namaProyekInovasi || "");
    setKategoriProyek("");
    setTujuanPenggunaan("");
    setNominalDiajukan(0);
    setOutputYangDiharapkan("");
    setRabItems([
      {
        id: "row-1",
        uraian: "",
        kuantitas: 1,
        satuan: "Paket",
        hargaSatuan: 0,
        jumlah: 0,
        keterangan: "",
      },
    ]);
    setNikPic("");
    setSignatureImage(null);
    setFileDokumenUrl("");
    setIsSubmitOpen(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT ANGGARAN
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSubmitAnggaran = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Kelengkapan Data
    if (!namaPic.trim()) {
      toast.error("Nama Penanggung Jawab (PIC) wajib diisi.", "Validasi Formulir");
      return;
    }
    if (!unitKerjaPic.trim()) {
      toast.error("Unit Kerja PIC wajib diisi.", "Validasi Formulir");
      return;
    }
    if (!noHpPic.trim()) {
      toast.error("No. Handphone (WhatsApp) PIC wajib diisi.", "Validasi Formulir");
      return;
    }
    if (!kategoriProyek) {
      toast.error("Kategori Proyek Inovasi wajib dipilih.", "Validasi Formulir");
      return;
    }
    if (!tujuanPenggunaan.trim()) {
      toast.error("Tujuan Penggunaan Dana wajib diisi.", "Validasi Formulir");
      return;
    }
    if (!outputYangDiharapkan.trim()) {
      toast.error("Output yang diharapkan wajib diisi.", "Validasi Formulir");
      return;
    }
    if (nominalDiajukan <= 0) {
      toast.error("Estimasi total dana yang diajukan harus lebih dari Rp 0.", "Validasi Nominal");
      return;
    }
    if (nominalDiajukan > 20000000) {
      toast.error("Maksimal pengajuan anggaran per fase adalah Rp 20.000.000.", "Batas Maksimal");
      return;
    }
    if (totalRabSubmit !== nominalDiajukan) {
      toast.error(
        `Total keseluruhan RAB (${formatRupiah(totalRabSubmit)}) harus SAMA dengan Estimasi Total Dana Diajukan (${formatRupiah(nominalDiajukan)}). Silakan klik tombol 'Sinkronkan dengan Total RAB'.`,
        "Selisih Nominal RAB"
      );
      return;
    }
    if (rabItems.some((item) => !item.uraian.trim())) {
      toast.error("Semua baris RAB harus memiliki Uraian/Detail kegiatan.", "Validasi RAB");
      return;
    }
    if (!nikPic.trim()) {
      toast.error("NIK PIC pada Bagian Pengesahan wajib diisi.", "Validasi Pengesahan");
      return;
    }
    if (!signatureImage) {
      toast.error("Tanda tangan digital PIC wajib dibubuhkan pada Bagian Pengesahan.", "Validasi Pengesahan");
      return;
    }

    setSaving(true);
    setMsg(null);

    const detailPengajuan: AnggaranDetailPengajuan = {
      namaPic,
      unitKerjaPic,
      noHpPic,
      judulProyek: judulProyek || timInfo?.namaProyekInovasi || "Proyek Inovasi",
      kategoriProyek,
      tujuanPenggunaan,
      outputYangDiharapkan,
      rabItems,
      totalRab: totalRabSubmit,
      pengesahanPic: {
        nama: namaPic,
        nik: nikPic,
        unitKerja: unitKerjaPic,
        tanggal: new Date().toISOString(),
        signatureImage,
      },
    };

    const res = await submitAnggaranAction(timId, {
      fase,
      nominalDiajukan: Number(nominalDiajukan),
      fileDokumenUrl: fileDokumenUrl.trim() || undefined,
      detailPengajuan,
    });

    if (res.success && res.data) {
      setList([res.data, ...list]);
      setIsSubmitOpen(false);
      toast.success("Pengajuan formulir anggaran (RAB) resmi berhasil dikirim!", "Pengajuan Berhasil");
      setMsg({ type: "success", text: "Pengajuan formulir anggaran (RAB) berhasil dikirim!" });
    } else {
      const errMsg = res.error || "Gagal mengajukan anggaran.";
      toast.error(errMsg, "Gagal Pengajuan Anggaran");
    }
    setSaving(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN & SAVE EDIT ANGGARAN
  // ═══════════════════════════════════════════════════════════════════════════
  const handleOpenEdit = (item: any) => {
    const detail = (item.detailPengajuan as AnggaranDetailPengajuan) || null;

    setEditModal({
      open: true,
      id: item.id,
      fase: item.fase,
      namaPic: detail?.namaPic || currentUser?.nama || "",
      unitKerjaPic: detail?.unitKerjaPic || getDefaultUnitKerja(),
      noHpPic: detail?.noHpPic || "",
      judulProyek: detail?.judulProyek || timInfo?.namaProyekInovasi || "",
      kategoriProyek: detail?.kategoriProyek || "",
      tujuanPenggunaan: detail?.tujuanPenggunaan || "",
      outputYangDiharapkan: detail?.outputYangDiharapkan || "",
      nominalDiajukan: item.nominalDiajukan,
      rabItems:
        detail?.rabItems && detail.rabItems.length > 0
          ? detail.rabItems
          : [
              {
                id: "row-1",
                uraian: "Alokasi biaya fase " + item.fase,
                kuantitas: 1,
                satuan: "Paket",
                hargaSatuan: item.nominalDiajukan,
                jumlah: item.nominalDiajukan,
                keterangan: "",
              },
            ],
      nikPic: detail?.pengesahanPic?.nik || "",
      signatureImage: detail?.pengesahanPic?.signatureImage || null,
      fileDokumenUrl: item.fileDokumenUrl || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editModal.nominalDiajukan <= 0) {
      toast.error("Estimasi total dana harus lebih dari Rp 0.", "Validasi");
      return;
    }
    if (editModal.nominalDiajukan > 20000000) {
      toast.error("Maksimal pengajuan anggaran per fase adalah Rp 20.000.000.", "Batas Maksimal");
      return;
    }
    if (totalRabEdit !== editModal.nominalDiajukan) {
      toast.error(
        `Total keseluruhan RAB (${formatRupiah(totalRabEdit)}) harus SAMA dengan Estimasi Total Dana (${formatRupiah(editModal.nominalDiajukan)}). Silakan sinkronkan.`,
        "Selisih Nominal"
      );
      return;
    }

    setSavingEdit(true);
    setMsg(null);

    const detailPengajuan: AnggaranDetailPengajuan = {
      namaPic: editModal.namaPic,
      unitKerjaPic: editModal.unitKerjaPic,
      noHpPic: editModal.noHpPic,
      judulProyek: editModal.judulProyek || timInfo?.namaProyekInovasi || "Proyek Inovasi",
      kategoriProyek: editModal.kategoriProyek,
      tujuanPenggunaan: editModal.tujuanPenggunaan,
      outputYangDiharapkan: editModal.outputYangDiharapkan,
      rabItems: editModal.rabItems,
      totalRab: totalRabEdit,
      pengesahanPic: {
        nama: editModal.namaPic,
        nik: editModal.nikPic,
        unitKerja: editModal.unitKerjaPic,
        tanggal: new Date().toISOString(),
        signatureImage: editModal.signatureImage || undefined,
      },
    };

    const res = await updateAnggaranAction(editModal.id, timId, {
      fase: editModal.fase,
      nominalDiajukan: Number(editModal.nominalDiajukan),
      fileDokumenUrl: editModal.fileDokumenUrl.trim() || undefined,
      detailPengajuan,
    });

    if (res.success && res.data) {
      setList((prev) =>
        prev.map((item) => (item.id === editModal.id ? { ...item, ...res.data } : item))
      );
      setEditModal((prev) => ({ ...prev, open: false }));
      toast.success("Perubahan pengajuan anggaran berhasil disimpan!", "Pembaruan Berhasil");
      setMsg({ type: "success", text: "Pengajuan anggaran berhasil diperbarui!" });
    } else {
      const errMsg = res.error || "Gagal mengubah pengajuan anggaran.";
      toast.error(errMsg, "Gagal Memperbarui Anggaran");
    }
    setSavingEdit(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE & APPROVAL HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleOpenDelete = (item: any) => {
    setDeleteModal({
      open: true,
      id: item.id,
      nominal: item.nominalDiajukan,
      fase: item.fase,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    setMsg(null);

    const res = await deleteAnggaranAction(deleteModal.id, timId);

    if (res.success) {
      setList((prev) => prev.filter((item) => item.id !== deleteModal.id));
      setDeleteModal({ open: false, id: "", nominal: 0, fase: "" });
      toast.success("Pengajuan anggaran berhasil dibatalkan & dihapus.", "Penghapusan Berhasil");
      setMsg({ type: "success", text: "Pengajuan anggaran berhasil dibatalkan / dihapus!" });
    } else {
      const errMsg = res.error || "Gagal membatalkan pengajuan anggaran.";
      toast.error(errMsg, "Gagal Menghapus Anggaran");
    }
    setDeleting(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMULIR B — LPJ HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSelectRabForLpj = (rabId: string) => {
    setLpjSelectedRabId(rabId);
    const targetRab = list.find((item) => item.id === rabId);
    if (!targetRab) return;

    const d = (targetRab.detailPengajuan as AnggaranDetailPengajuan) || null;
    setLpjNamaPic(d?.namaPic || currentUser?.nama || "");
    setLpjUnitKerjaPic(d?.unitKerjaPic || getDefaultUnitKerja());
    setLpjNoHpPic(d?.noHpPic || "");
    setLpjJudulProyek(d?.judulProyek || timInfo?.namaProyekInovasi || "Proyek Inovasi");
    setLpjKategoriProyek(d?.kategoriProyek || "");
    setLpjNikPic(d?.pengesahanPic?.nik || "");
    setLpjSignatureImage(null);

    // Initial row
    setLpjItems([
      {
        id: "lpj-row-" + Math.random().toString(36).substring(2, 9),
        uraian: "",
        nominal: 0,
        keterangan: "",
        evidence: [],
      },
    ]);
  };

  const handleOpenLpjModal = (preselectedRabId?: string) => {
    const eligibleRabs = list.filter(
      (item) => (item.status === "disetujui" || item.status === "diotorisasi") && !item.lpj
    );

    if (eligibleRabs.length === 0) {
      toast.warning(
        "Tidak ada pengajuan RAB yang dapat diajukan LPJ-nya (RAB harus berstatus Disetujui dan belum memiliki LPJ).",
        "Belum Ada RAB Disetujui"
      );
      return;
    }

    const targetId =
      preselectedRabId && eligibleRabs.some((r) => r.id === preselectedRabId)
        ? preselectedRabId
        : eligibleRabs[0].id;

    handleSelectRabForLpj(targetId);
    setIsLpjFormOpen(true);
  };

  const handleAddLpjRow = () => {
    const newRow: LpjItemRow = {
      id: "lpj-row-" + Math.random().toString(36).substring(2, 9),
      uraian: "",
      nominal: 0,
      keterangan: "",
      evidence: [],
    };
    setLpjItems((prev) => [...prev, newRow]);
  };

  const handleRemoveLpjRow = (id: string) => {
    if (lpjItems.length <= 1) {
      toast.warning("Minimal harus ada 1 baris rincian pengeluaran dana LPJ.");
      return;
    }
    setLpjItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateLpjRow = (
    id: string,
    field: "uraian" | "nominal" | "keterangan",
    val: any
  ) => {
    setLpjItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleFileUploadEvidence = async (
    rowId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEvidence((prev) => ({ ...prev, [rowId]: true }));
    try {
      const formData = new FormData();
      formData.append("timId", timId);
      formData.append("file", file);

      const res = await fetch("/api/keuangan/upload-attachment", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.publicUrl) {
        const newEvidence: LpjEvidenceItem = {
          id: "ev-" + Math.random().toString(36).substring(2, 9),
          tipe: "file",
          url: data.publicUrl,
          nama: data.fileName || file.name,
          ukuran: data.fileSize || file.size,
        };

        setLpjItems((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? { ...row, evidence: [...(row.evidence || []), newEvidence] }
              : row
          )
        );
        toast.success(`Bukti "${file.name}" berhasil diunggah.`);
      } else {
        toast.error(data.message || "Gagal mengunggah file bukti.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat upload bukti.");
    } finally {
      setIsUploadingEvidence((prev) => ({ ...prev, [rowId]: false }));
      e.target.value = "";
    }
  };

  const handleAddLinkEvidence = (rowId: string, url: string, label: string) => {
    if (!url.trim()) return;
    const newEvidence: LpjEvidenceItem = {
      id: "ev-" + Math.random().toString(36).substring(2, 9),
      tipe: "link",
      url: url.trim(),
      nama: label.trim() || url.trim(),
    };
    setLpjItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, evidence: [...(row.evidence || []), newEvidence] }
          : row
      )
    );
    toast.success("Tautan bukti dokumen berhasil ditambahkan.");
  };

  const handleRemoveEvidence = (rowId: string, evidenceId: string) => {
    setLpjItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, evidence: (row.evidence || []).filter((e) => e.id !== evidenceId) }
          : row
      )
    );
  };

  const handleSubmitLpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpjSelectedRabId) {
      toast.warning("Pilih pengajuan RAB terkait terlebih dahulu.");
      return;
    }

    const selectedRab = list.find((item) => item.id === lpjSelectedRabId);
    if (!selectedRab) {
      toast.error("Pengajuan RAB terkait tidak ditemukan.");
      return;
    }

    const maxNominal = Number(selectedRab.nominalDiajukan) || 0;
    if (totalNominalLpj > maxNominal) {
      toast.error(
        `Total penggunaan dana LPJ (${formatRupiah(totalNominalLpj)}) melebihi nominal RAB yang disetujui (${formatRupiah(maxNominal)}). Harap kurangi rincian agar tidak melebihi anggaran yang disetujui.`,
        "Pagu Anggaran Terlampaui"
      );
      return;
    }

    if (totalNominalLpj <= 0) {
      toast.warning("Total penggunaan dana LPJ harus lebih dari Rp 0.");
      return;
    }

    // Validasi baris
    for (let i = 0; i < lpjItems.length; i++) {
      const row = lpjItems[i];
      if (!row.uraian.trim()) {
        toast.warning(`Uraian penggunaan pada baris ke-${i + 1} belum diisi.`);
        return;
      }
      if (!row.nominal || row.nominal <= 0) {
        toast.warning(`Nominal pada baris ke-${i + 1} harus lebih dari Rp 0.`);
        return;
      }
      if (!row.evidence || row.evidence.length === 0) {
        toast.warning(
          `Baris ke-${i + 1} ("${row.uraian}") wajib melampirkan minimal 1 bukti nota/kwitansi atau tautan bukti.`
        );
        return;
      }
    }

    if (!lpjNikPic.trim()) {
      toast.warning("NIK PIC wajib diisi pada Bagian D (Pernyataan Pengesahan).");
      return;
    }

    if (!lpjSignatureImage) {
      toast.warning("Tanda tangan digital PIC wajib dibubuhkan pada Bagian D.");
      return;
    }

    setIsSubmittingLpj(true);
    try {
      const detailLpj: LpjDetailPengajuan = {
        namaPic: lpjNamaPic.trim(),
        unitKerjaPic: lpjUnitKerjaPic.trim(),
        noHpPic: lpjNoHpPic.trim(),
        judulProyek: lpjJudulProyek.trim(),
        kategoriProyek: lpjKategoriProyek.trim(),
        items: lpjItems.map((item) => ({
          ...item,
          nominal: Number(item.nominal) || 0,
        })),
        totalNominal: totalNominalLpj,
        pernyataanPic: {
          teks: "Dengan ini saya selaku PIC Tim Inovator menyatakan bahwa seluruh penggunaan anggaran telah dilaksanakan sesuai dengan kebutuhan pelaksanaan MVP Proyek Inovasi dan dapat dipertanggungjawabkan.",
          nama: lpjNamaPic.trim(),
          nik: lpjNikPic.trim(),
          unitKerja: lpjUnitKerjaPic.trim(),
          tanggal: new Date().toISOString(),
          signatureImage: lpjSignatureImage,
        },
      };

      const res = await submitLpjAction(lpjSelectedRabId, timId, {
        detailLpj,
      });

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) =>
            item.id === lpjSelectedRabId ? { ...item, lpj: res.data } : item
          )
        );
        setIsLpjFormOpen(false);
        toast.success(
          "Formulir B (LPJ) berhasil dikirim dan tersimpan resmi!",
          "Pengiriman LPJ Berhasil"
        );
      } else {
        toast.error(res.error || "Gagal mengirimkan Formulir LPJ.", "Pengiriman Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengirim Formulir LPJ.");
    } finally {
      setIsSubmittingLpj(false);
    }
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingApproval(true);
    setMsg(null);

    if (approvalModal.type === "anggaran") {
      const status = approvalModal.action === "approve" ? "diotorisasi" : "ditolak";
      const res = await authorizeAnggaranAction(
        approvalModal.targetId,
        timId,
        status,
        approvalNotes
      );

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) => (item.id === approvalModal.targetId ? { ...item, ...res.data } : item))
        );
        const actionLabel = status === "diotorisasi" ? "diotorisasi (disetujui)" : "ditolak";
        if (status === "diotorisasi") {
          toast.success("Pengajuan anggaran RAB berhasil diotorisasi!", "Otorisasi Berhasil");
        } else {
          toast.warning("Pengajuan anggaran RAB telah ditolak.", "Penolakan Selesai");
        }
        setMsg({
          type: "success",
          text: `Pengajuan anggaran berhasil ${actionLabel}.`,
        });
        setApprovalModal({ open: false, type: "anggaran", targetId: "", action: "approve" });
        setApprovalNotes("");
      } else {
        const errMsg = res.error || "Gagal memproses otorisasi anggaran.";
        toast.error(errMsg, "Gagal Otorisasi");
      }
    } else {
      const status = approvalModal.action === "approve" ? "disetujui" : "ditolak";
      const res = await approveLpjAction(
        approvalModal.targetId,
        timId,
        status,
        approvalNotes
      );

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) =>
            item.lpj?.id === approvalModal.targetId
              ? { ...item, lpj: { ...item.lpj, ...res.data } }
              : item
          )
        );
        const actionLabel = status === "disetujui" ? "disetujui" : "ditolak";
        if (status === "disetujui") {
          toast.success("Laporan Pertanggungjawaban (LPJ) berhasil disetujui!", "Persetujuan LPJ");
        } else {
          toast.warning("Laporan Pertanggungjawaban (LPJ) telah ditolak.", "Penolakan LPJ");
        }
        setMsg({
          type: "success",
          text: `Laporan Pertanggungjawaban (LPJ) berhasil ${actionLabel}.`,
        });
        setApprovalModal({ open: false, type: "lpj", targetId: "", action: "approve" });
        setApprovalNotes("");
      } else {
        const errMsg = res.error || "Gagal memproses persetujuan LPJ.";
        toast.error(errMsg, "Gagal Persetujuan LPJ");
      }
    }

    setProcessingApproval(false);
  };

  const handleApproveWithSignature = async (dataUrl: string) => {
    if (!approveTargetId) return;
    setIsApproving(true);
    try {
      const res = await approveAnggaranWithSignatureAction(approveTargetId, timId, {
        signatureImage: dataUrl,
        unitKerja: currentUser?.unitKerja || "Innovation Center",
      });

      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) => (item.id === approveTargetId ? { ...item, ...res.data } : item))
        );
        if (detailModal.item?.id === approveTargetId) {
          setDetailModal((prev) => ({
            ...prev,
            item: { ...prev.item, ...res.data },
          }));
        }
        toast.success(
          "Pengajuan anggaran berhasil disetujui & ditandatangani oleh Kepala Departemen IC!",
          "Persetujuan Berhasil"
        );
        setIsSigPadOpen(false);
        setApproveTargetId(null);
      } else {
        toast.error(res.error || "Gagal menyetujui pengajuan anggaran.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyetujui anggaran.", "Gagal");
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.alasan.trim()) {
      toast.warning("Alasan penolakan wajib diisi.");
      return;
    }
    setIsRejecting(true);
    try {
      const res = await rejectAnggaranAction(
        rejectModal.targetId,
        timId,
        rejectModal.alasan.trim()
      );
      if (res.success && res.data) {
        setList((prev) =>
          prev.map((item) => (item.id === rejectModal.targetId ? { ...item, ...res.data } : item))
        );
        if (detailModal.item?.id === rejectModal.targetId) {
          setDetailModal((prev) => ({
            ...prev,
            item: { ...prev.item, ...res.data },
          }));
        }
        toast.warning("Pengajuan anggaran telah ditolak.", "Penolakan Selesai");
        setRejectModal({ open: false, targetId: "", alasan: "" });
      } else {
        toast.error(res.error || "Gagal menolak pengajuan anggaran.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menolak anggaran.", "Gagal");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Banner Info */}
      {canManage && !canSubmit && (
        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Mode Otorisasi / Approval:</strong> Anda memiliki kewenangan untuk meninjau, mengotorisasi, dan menyetujui pengajuan anggaran & LPJ tim ini.
            </span>
          </div>
        </div>
      )}

      {/* Header & Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Riwayat Pengajuan Anggaran (RAB & LPJ)
          </h3>
          <p className="text-xs text-gray-500">
            Maksimal pengajuan Rp 20.000.000 per fase kegiatan & akumulasi maks Rp 40.000.000 per tim.
          </p>
        </div>

        {/* Tombol Aksi HANYA muncul jika canSubmit = true */}
        {canSubmit && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleOpenSubmitModal}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs gap-1.5 font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajukan Anggaran Baru (RAB)</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleOpenLpjModal()}
              variant="outline"
              className="border-[#0F5132] text-[#0F5132] hover:bg-emerald-50 text-xs gap-1.5 font-semibold shadow-xs cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Ajukan LPJ Baru</span>
            </Button>
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-white">
          <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Belum ada pengajuan anggaran</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {canSubmit
              ? "Klik tombol di atas untuk mengisi Formulir Pengajuan Anggaran Inkubasi (RAB Resmi)."
              : "Belum ada permohonan anggaran yang diajukan oleh tim inovator."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((item) => {
            const isPendingAnggaran = item.status === "diajukan" || item.status === "dinilai";
            const isPendingLpj =
              item.lpj && (item.lpj.status === "dikirim" || item.lpj.status === "terlambat");
            const detail = (item.detailPengajuan as AnggaranDetailPengajuan) || null;

            return (
              <Card key={item.id} className="overflow-hidden border-gray-200 bg-white">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                        Fase {item.fase.replace("_", " ")}
                      </span>
                      <Badge
                        variant={
                          item.status === "disetujui" || item.status === "diotorisasi"
                            ? "secondary"
                            : item.status === "ditolak"
                            ? "destructive"
                            : "outline"
                        }
                        className={`text-[10px] font-semibold capitalize ${
                          item.status === "disetujui" || item.status === "diotorisasi"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : item.status === "ditolak"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        Status: {item.status === "disetujui" || item.status === "diotorisasi"
                          ? "Disetujui"
                          : item.status === "ditolak"
                          ? "Ditolak"
                          : "Diajukan (Menunggu Review)"}
                      </Badge>
                      {detail?.kategoriProyek && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {detail.kategoriProyek}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-lg font-extrabold text-[#0F5132]">
                        {formatRupiah(item.nominalDiajukan)}
                      </h4>
                      {detail?.namaPic && (
                        <span className="text-xs text-gray-500">
                          • PIC: <strong className="text-gray-700">{detail.namaPic}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span>Diajukan pada: {formatDateIndo(item.tanggalPengajuan)}</span>

                      {/* Tombol Lihat Detail RAB Lengkap */}
                      <button
                        type="button"
                        onClick={() => setDetailModal({ open: true, item })}
                        className="text-[#0F5132] hover:text-[#1B7A4D] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Lihat Formulir &amp; RAB</span>
                      </button>

                      {/* Tombol Unduh PDF RAB */}
                      <a
                        href={`/api/pdf/rab/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                        title="Unduh Formulir Pengajuan Anggaran (RAB) format PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Unduh PDF</span>
                      </a>

                      {item.fileDokumenUrl && (
                        <a
                          href={item.fileDokumenUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-500 hover:text-[#0F5132] hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Dokumen Pendukung</span>
                        </a>
                      )}
                    </div>

                    {item.status === "ditolak" && item.catatanPenilaian && (
                      <div className="mt-2 text-xs bg-rose-50/80 border border-rose-200 text-rose-800 p-2.5 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block text-[11px] uppercase tracking-wider text-rose-700">
                            Alasan Penolakan:
                          </strong>
                          <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">
                            {item.catatanPenilaian}
                          </p>
                        </div>
                      </div>
                    )}

                    {(item.status === "disetujui" || item.status === "diotorisasi") && item.catatanPenilaian && (
                      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100 mt-1">
                        <span className="font-semibold">Catatan Persetujuan:</span> {item.catatanPenilaian}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {/* Action Edit / Batalkan HANYA untuk pemilik izin submit saat status masih 'diajukan' */}
                    {canSubmit && item.status === "diajukan" && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="text-xs h-7 px-2.5 font-semibold text-gray-700 hover:text-gray-900 border-gray-300 gap-1 cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDelete(item)}
                          className="text-xs h-7 px-2.5 font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Batalkan</span>
                        </Button>
                      </div>
                    )}

                    {/* Status Persetujuan Anggaran Actions for Approver */}
                    {canApproveAnggaran && isPendingAnggaran && (
                      <div className="flex items-center gap-2 bg-emerald-50/60 p-1.5 rounded-xl border border-emerald-200">
                        <span className="text-[11px] font-semibold text-emerald-900 px-1">Persetujuan RAB:</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setApproveTargetId(item.id);
                            setSigPadTarget("approve");
                            setIsSigPadOpen(true);
                          }}
                          className="bg-[#0F5132] hover:bg-[#0F5132]/90 text-white h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <PenTool className="h-3 w-3" />
                          <span>Tandatangani &amp; Setujui</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectModal({
                              open: true,
                              targetId: item.id,
                              alasan: "",
                            });
                          }}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    )}

                    {/* LPJ Section */}
                    {item.status === "disetujui" || item.status === "diotorisasi" ? (
                      item.lpj ? (
                        <div className="flex flex-col items-end gap-1.5 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 font-medium">Status LPJ:</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                item.lpj.status === "terlambat"
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              LPJ {item.lpj.status === "terlambat" ? "Terkirim (Terlambat)" : "Terkirim"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            Dikirim: {formatDateIndo(item.lpj.tanggalKirim)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDetailLpjModal({ open: true, item: item.lpj, rabItem: item })
                              }
                              className="text-xs h-7 px-2.5 font-semibold text-[#0F5132] border-emerald-300 hover:bg-emerald-50 gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Lihat Detail LPJ</span>
                            </Button>

                            <a
                              href={`/api/pdf/lpj/${item.lpj.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs h-7 px-2.5 rounded-lg font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                              title="Unduh Laporan Pertanggungjawaban (LPJ) format PDF"
                            >
                              <Download className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Unduh PDF</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const deadlineInfo = calculateLpjDeadlineInfo(
                            item.detailPengajuan?.pengesahanApprover?.tanggal ||
                              item.updatedAt ||
                              item.tanggalPengajuan
                          );
                          return (
                            <div className="flex flex-col items-end gap-1.5 bg-amber-50/40 p-2.5 rounded-xl border border-amber-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-medium">Status LPJ:</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  Belum Diajukan
                                </span>
                              </div>

                              {deadlineInfo && (
                                <div className="text-[10px] flex items-center gap-1 text-right">
                                  {deadlineInfo.isLate ? (
                                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Lewat tenggat {deadlineInfo.businessDaysCount} hari kerja
                                    </span>
                                  ) : (
                                    <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Jatuh tempo dlm {deadlineInfo.businessDaysCount} hari kerja ({formatDateIndo(deadlineInfo.deadline)})
                                    </span>
                                  )}
                                </div>
                              )}

                              {canSubmit && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleOpenLpjModal(item.id)}
                                  className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-7.5 px-3 font-semibold gap-1.5 cursor-pointer shadow-xs mt-0.5"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Ajukan LPJ</span>
                                </Button>
                              )}
                            </div>
                          );
                        })()
                      )
                    ) : item.status === "diajukan" ? (
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] text-gray-400 bg-gray-50 border-gray-200">
                          LPJ: Menunggu Approval RAB
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG SUBMIT ANGGARAN (RAB RESMI JUKLAK LAMPIRAN II)                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F5132] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Lampiran II Juklak Inkubasi
                </span>
                <DialogTitle className="text-lg font-bold text-gray-900 mt-1">
                  Formulir Pengajuan Anggaran Inkubasi (Formulir A &amp; RAB)
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Lengkapi data identitas, sasaran penggunaan dana, rincian biaya dinamis, dan pengesahan PIC.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitAnggaran} className="space-y-6 pt-2">
            {/* Header Form: Fase Kegiatan */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>Fase Kegiatan Inovasi</span>
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-gray-500">
                  Batas maksimal dana operasional per fase kegiatan adalah Rp 20.000.000.
                </p>
              </div>
              <select
                className="h-9 px-3 text-xs font-semibold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5132] focus:outline-none min-w-[240px]"
                value={fase}
                onChange={(e) => setFase(e.target.value)}
              >
                <option value="customer_validation">Customer Validation (Tahap 2)</option>
                <option value="market_validation">Market Validation (Tahap 3)</option>
              </select>
            </div>

            {/* ── BAGIAN 1: IDENTITAS PENGAJUAN ──────────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Identitas Pengajuan
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span>Nama Penanggung Jawab (PIC) *</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={namaPic}
                    onChange={(e) => setNamaPic(e.target.value)}
                    placeholder="Nama PIC Tim"
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-gray-400">Default dari user yang login (dapat diedit).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <span>Unit Kerja *</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={unitKerjaPic}
                    onChange={(e) => setUnitKerjaPic(e.target.value)}
                    placeholder="Unit Kerja / Divisi"
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-gray-400">Default dari data struktur peran tim.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>No. Handphone (WhatsApp) *</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    value={noHpPic}
                    onChange={(e) => setNoHpPic(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-gray-400">Nomor aktif untuk verifikasi dana.</p>
                </div>
              </div>
            </div>

            {/* ── BAGIAN 2: RINGKASAN PENGAJUAN DANA ─────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Ringkasan Pengajuan Dana
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-gray-400" />
                    <span>Judul Proyek Inovasi (Otomatis)</span>
                  </label>
                  <Input
                    type="text"
                    readOnly
                    value={judulProyek}
                    className="h-8 text-xs bg-gray-50 text-gray-700 font-medium cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400">Tersinkronisasi otomatis dari nama proyek tim.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <span>Kategori Proyek Inovasi *</span>
                  </label>
                  <select
                    required
                    value={kategoriProyek}
                    onChange={(e) => setKategoriProyek(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5132] focus:outline-none"
                  >
                    <option value="">— Pilih Kategori Proyek Inovasi —</option>
                    {KATEGORI_PROYEK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">Pilih salah satu dari 4 kategori resmi Juklak.</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">
                  Tujuan Penggunaan Dana *
                </label>
                <Textarea
                  required
                  rows={2}
                  value={tujuanPenggunaan}
                  onChange={(e) => setTujuanPenggunaan(e.target.value)}
                  placeholder="Uraikan tujuan dan sasaran operasional yang ingin dicapai melalui pendanaan ini..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-700">
                      Estimasi Total Dana Diajukan (Rp) *
                    </label>
                    <span className="text-[10px] font-bold text-gray-500">Maks. Rp 20.000.000</span>
                  </div>
                  <Input
                    type="number"
                    max={20000000}
                    min={0}
                    required
                    value={nominalDiajukan || ""}
                    onChange={(e) => setNominalDiajukan(Number(e.target.value))}
                    className="h-8 text-xs font-bold text-[#0F5132]"
                  />
                  <p className="text-[10px] font-semibold text-gray-600">
                    Terbaca: {formatRupiah(nominalDiajukan || 0)}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Total Rencana Anggaran (RAB)
                    </span>
                    <div className="text-base font-extrabold text-[#0F5132]">
                      {formatRupiah(totalRabSubmit)}
                    </div>
                  </div>
                  {totalRabSubmit !== nominalDiajukan && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNominalDiajukan(totalRabSubmit);
                        toast.success(
                          `Estimasi Total Dana disinkronkan ke Total RAB: ${formatRupiah(totalRabSubmit)}`,
                          "Sinkronisasi Berhasil"
                        );
                      }}
                      className="text-[11px] h-7 text-[#0F5132] border-[#0F5132] hover:bg-emerald-100 font-semibold cursor-pointer gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Sinkronkan</span>
                    </Button>
                  )}
                </div>
              </div>

              {totalRabSubmit !== nominalDiajukan && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Peringatan Sinkronisasi:</strong> Estimasi Total Dana ({formatRupiah(nominalDiajukan)}) belum sama dengan akumulasi Tabel RAB ({formatRupiah(totalRabSubmit)}). Selisih:{" "}
                    <strong>{formatRupiah(Math.abs(totalRabSubmit - nominalDiajukan))}</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* ── BAGIAN 3: TUJUAN AKTIVITAS INKUBASI ─────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Tujuan Aktivitas Inkubasi
                </h4>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">
                  Output yang Diharapkan *
                </label>
                <Textarea
                  required
                  rows={2}
                  value={outputYangDiharapkan}
                  onChange={(e) => setOutputYangDiharapkan(e.target.value)}
                  placeholder="Sebutkan deliverables / output konkret yang diharapkan dari pelaksanaan aktivitas ini (misal: laporan wawancara 20 pelanggan, prototipe fungsional)..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* ── BAGIAN 4: TABEL RENCANA ANGGARAN BIAYA (RAB) ────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Rencana Anggaran Biaya (RAB)
                    </h4>
                    <p className="text-[10px] text-gray-500">Tabel rincian item belanja / biaya operasional</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-[#0F5132] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total: {formatRupiah(totalRabSubmit)}
                </div>
              </div>

              {/* Dynamic Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-[11px] text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-center w-10">No</th>
                      <th className="p-2 min-w-[200px]">Uraian / Sub / Detail *</th>
                      <th className="p-2 w-20 text-center">Kuantitas</th>
                      <th className="p-2 w-28">Satuan</th>
                      <th className="p-2 w-32">Harga Satuan (Rp)</th>
                      <th className="p-2 w-32">Jumlah (Rp)</th>
                      <th className="p-2 min-w-[150px]">Keterangan</th>
                      <th className="p-2 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rabItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="p-2 text-center text-gray-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            required
                            placeholder="Contoh: Akomodasi survei lapangan"
                            value={item.uraian}
                            onChange={(e) => handleUpdateRabRow(item.id, "uraian", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            required
                            value={item.kuantitas || 1}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "kuantitas", Number(e.target.value))
                            }
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <SatuanInputCombobox
                            value={item.satuan}
                            onChange={(val) => handleUpdateRabRow(item.id, "satuan", val)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            required
                            placeholder="0"
                            value={item.hargaSatuan || ""}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "hargaSatuan", Number(e.target.value))
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            required
                            placeholder="0"
                            value={item.jumlah || ""}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "jumlah", Number(e.target.value))
                            }
                            className="h-8 text-xs font-mono font-bold text-gray-800"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Opsional"
                            value={item.keterangan || ""}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "keterangan", e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRabRow(item.id)}
                            disabled={rabItems.length <= 1}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50/90 font-bold border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right text-gray-700 text-xs">
                        Total Keseluruhan RAB:
                      </td>
                      <td className="p-2.5 text-xs text-[#0F5132] font-mono font-extrabold whitespace-nowrap">
                        {formatRupiah(totalRabSubmit)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Data list untuk rekomendasi satuan */}
              <datalist id="satuan-options">
                {SATUAN_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddRabRow(false)}
                className="text-xs border-dashed gap-1 h-8 text-[#0F5132] border-[#0F5132] hover:bg-emerald-50 font-semibold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Baris RAB</span>
              </Button>
            </div>

            {/* ── BAGIAN 5: PENGESAHAN ────────────────────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  5
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Pengesahan (PIC &amp; Kepala Departemen IC)
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Bubuhkan tanda tangan digital PIC sebelum mengirim pengajuan. Persetujuan Kepala Departemen IC dilakukan setelah formulir diajukan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Blok 1: Dibuat Oleh (PIC Tim Inovator) */}
                <div className="p-4 rounded-xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/20 flex flex-col justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">
                        Dibuat Oleh:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        PIC Tim Inovator
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 text-sm">{namaPic || "Nama PIC"}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>{unitKerjaPic || "Unit Kerja Belum Diisi"}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <span>Tanggal:</span>
                      <span className="font-medium text-gray-700">{formatDateIndo(new Date())}</span>
                    </div>

                    <div className="pt-1.5 w-full">
                      <label className="text-[11px] font-semibold text-gray-700">
                        NIK PIC *
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="Masukkan NIK Anda"
                        value={nikPic}
                        onChange={(e) => setNikPic(e.target.value)}
                        className="h-8 text-xs font-mono mt-0.5 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-emerald-100">
                    {signatureImage ? (
                      <div className="space-y-1 text-center w-full">
                        <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs max-w-[170px] mx-auto">
                          <img
                            src={signatureImage}
                            alt="Tanda Tangan PIC"
                            className="h-14 w-auto object-contain block mx-auto"
                          />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Tanda Tangan Siap</span>
                        </span>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSigPadTarget("submit");
                              setIsSigPadOpen(true);
                            }}
                            className="h-6 text-[10px] px-2 text-gray-600 cursor-pointer"
                          >
                            Ubah
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSignatureImage(null)}
                            className="h-6 text-[10px] px-2 text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 w-full">
                        <div className="h-14 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center text-[11px] text-gray-400 italic">
                          Belum ada tanda tangan
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            setSigPadTarget("submit");
                            setIsSigPadOpen(true);
                          }}
                          className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer shadow-xs w-full justify-center"
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          <span>Bubuhkan Tanda Tangan PIC</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blok 2: Disetujui Oleh (Kepala Departemen IC) */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">
                        Disetujui Oleh:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Menunggu Pengajuan
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 text-sm">
                      {approvers.length > 0
                        ? approvers.map((a) => a.nama).join(" / ")
                        : "Kepala Departemen Innovation Center"}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      Jabatan: Kepala Departemen Innovation Center
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>Innovation Center</span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                      <span>Waktu:</span>
                      <span>Setelah form diajukan</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-dashed border-gray-200 text-center text-gray-400 text-xs italic">
                    Tanda tangan pengesahan dan persetujuan akan dibubuhkan oleh Kepala Departemen IC setelah formulir RAB ini diajukan.
                  </div>
                </div>
              </div>
            </div>

            {/* ── LAMPIRAN BUKTI DOKUMEN PENDUKUNG (OPSIONAL) ───────────────── */}
            <div className="space-y-1 p-3.5 rounded-xl border border-dashed border-gray-200 bg-slate-50/50">
              <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                <span>Link Dokumen Pendukung Tambahan (Opsional)</span>
                <span className="text-[10px] text-gray-400 font-normal">Google Drive / OneDrive</span>
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={fileDokumenUrl}
                onChange={(e) => setFileDokumenUrl(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-gray-100 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || totalRabSubmit !== nominalDiajukan || !signatureImage}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold px-5 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengirim Formulir RAB...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Kirim Pengajuan Anggaran (RAB)</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG EDIT PENGAJUAN ANGGARAN                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => {
          if (!open) setEditModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-base font-bold text-gray-900">
              Edit Pengajuan Formulir Anggaran (RAB)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Perbarui rincian nominal, tabel RAB, atau dokumen pendukung selama status masih Diajukan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Fase Kegiatan</label>
                <select
                  className="w-full h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  value={editModal.fase}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, fase: e.target.value }))}
                >
                  <option value="customer_validation">Customer Validation (Tahap 2)</option>
                  <option value="market_validation">Market Validation (Tahap 3)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Nama PIC</label>
                <Input
                  type="text"
                  required
                  value={editModal.namaPic}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, namaPic: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Unit Kerja PIC</label>
                <Input
                  type="text"
                  required
                  value={editModal.unitKerjaPic}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, unitKerjaPic: e.target.value }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">No. HP (WhatsApp)</label>
                <Input
                  type="tel"
                  value={editModal.noHpPic}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, noHpPic: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Kategori Proyek</label>
                <select
                  value={editModal.kategoriProyek}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, kategoriProyek: e.target.value }))
                  }
                  className="w-full h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                >
                  <option value="">— Pilih Kategori —</option>
                  {KATEGORI_PROYEK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">NIK PIC</label>
                <Input
                  type="text"
                  value={editModal.nikPic}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, nikPic: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Tujuan Penggunaan</label>
                <Textarea
                  rows={2}
                  value={editModal.tujuanPenggunaan}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, tujuanPenggunaan: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-700">Output yang Diharapkan</label>
                <Textarea
                  rows={2}
                  value={editModal.outputYangDiharapkan}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, outputYangDiharapkan: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
            </div>

            {/* Tabel RAB di Modal Edit */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Rincian Tabel RAB</span>
                <span className="text-xs font-bold text-[#0F5132]">
                  Total RAB: {formatRupiah(totalRabEdit)}
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-[11px] text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-center w-10">No</th>
                      <th className="p-2">Uraian / Detail</th>
                      <th className="p-2 w-20 text-center">Qty</th>
                      <th className="p-2 w-24">Satuan</th>
                      <th className="p-2 w-28">Harga (Rp)</th>
                      <th className="p-2 w-28">Jumlah (Rp)</th>
                      <th className="p-2 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editModal.rabItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-1.5 text-center text-gray-500">{idx + 1}</td>
                        <td className="p-1.5">
                          <Input
                            type="text"
                            value={item.uraian}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "uraian", e.target.value, true)
                            }
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={item.kuantitas}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "kuantitas", Number(e.target.value), true)
                            }
                            className="h-7 text-xs text-center"
                          />
                        </td>
                        <td className="p-1.5">
                          <SatuanInputCombobox
                            value={item.satuan}
                            onChange={(val) =>
                              handleUpdateRabRow(item.id, "satuan", val, true)
                            }
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min={0}
                            value={item.hargaSatuan || ""}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "hargaSatuan", Number(e.target.value), true)
                            }
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min={0}
                            value={item.jumlah || ""}
                            onChange={(e) =>
                              handleUpdateRabRow(item.id, "jumlah", Number(e.target.value), true)
                            }
                            className="h-7 text-xs font-mono font-bold text-gray-800"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRabRow(item.id, true)}
                            disabled={editModal.rabItems.length <= 1}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddRabRow(true)}
                  className="text-xs h-7 gap-1 border-dashed text-[#0F5132] border-[#0F5132]"
                >
                  <Plus className="h-3 w-3" /> Tambah Baris
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Estimasi Total Dana:</span>
                  <Input
                    type="number"
                    max={20000000}
                    value={editModal.nominalDiajukan}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        nominalDiajukan: Number(e.target.value),
                      }))
                    }
                    className="h-7 w-32 text-xs font-bold text-[#0F5132]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditModal((prev) => ({ ...prev, nominalDiajukan: totalRabEdit }));
                      toast.success(
                        `Estimasi Total Dana disinkronkan ke Total RAB: ${formatRupiah(totalRabEdit)}`,
                        "Sinkronisasi Berhasil"
                      );
                    }}
                    className="text-[10px] h-7 text-[#0F5132]"
                  >
                    Sinkronkan
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-gray-700">
                Link Dokumen Pendukung (Opsional)
              </label>
              <Input
                type="url"
                value={editModal.fileDokumenUrl}
                onChange={(e) =>
                  setEditModal((prev) => ({ ...prev, fileDokumenUrl: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingEdit || totalRabEdit !== editModal.nominalDiajukan}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG LIHAT DETAIL DOKUMEN FORMULIR RAB RESMI                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={detailModal.open}
        onOpenChange={(open) => {
          if (!open) setDetailModal({ open: false, item: null });
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-2xl">
          {detailModal.item && (
            <div className="space-y-5">
              <DialogHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F5132] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Lampiran II — Formulir A &amp; RAB
                    </span>
                    <DialogTitle className="text-lg font-bold text-gray-900 mt-1">
                      Pengajuan Anggaran Inkubasi
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-500">
                      Fase {detailModal.item.fase?.replace("_", " ")} • Diajukan pada:{" "}
                      {formatDateIndo(detailModal.item.tanggalPengajuan)}
                    </DialogDescription>
                  </div>

                  <Badge
                    className={`text-xs capitalize ${
                      detailModal.item.status === "diotorisasi"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : detailModal.item.status === "ditolak"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    Status: {detailModal.item.status}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Tampilkan detail jika data berformat baru */}
              {detailModal.item.detailPengajuan ? (
                (() => {
                  const d = detailModal.item.detailPengajuan as AnggaranDetailPengajuan;
                  return (
                    <div className="space-y-5 text-xs text-gray-800">
                      {/* Bagian 1: Identitas */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#0F5132]" />
                          <span>1. Identitas Pengajuan</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <span className="text-gray-400 text-[10px] block">Penanggung Jawab (PIC):</span>
                            <span className="font-bold text-gray-900">{d.namaPic || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-[10px] block">Unit Kerja:</span>
                            <span className="font-medium text-gray-800">{d.unitKerjaPic || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-[10px] block">No. Handphone (WhatsApp):</span>
                            <span className="font-mono text-gray-800">{d.noHpPic || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bagian 2: Ringkasan */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-[#0F5132]" />
                          <span>2. Ringkasan Pengajuan Dana</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-gray-400 text-[10px] block">Judul Proyek Inovasi:</span>
                            <span className="font-bold text-gray-900">{d.judulProyek || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-[10px] block">Kategori Proyek Inovasi:</span>
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                              {d.kategoriProyek || "-"}
                            </span>
                          </div>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-400 text-[10px] block">Tujuan Penggunaan Dana:</span>
                          <p className="text-gray-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200">
                            {d.tujuanPenggunaan || "-"}
                          </p>
                        </div>
                        <div className="pt-1 flex items-center justify-between border-t border-slate-200 mt-2">
                          <span className="font-bold text-gray-700">Estimasi Total Dana Diajukan:</span>
                          <span className="font-extrabold text-base text-[#0F5132]">
                            {formatRupiah(detailModal.item.nominalDiajukan)}
                          </span>
                        </div>
                      </div>

                      {/* Bagian 3: Output */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[#0F5132]" />
                          <span>3. Tujuan Aktivitas Inkubasi</span>
                        </h5>
                        <div className="pt-1">
                          <span className="text-gray-400 text-[10px] block">Output yang Diharapkan:</span>
                          <p className="text-gray-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200">
                            {d.outputYangDiharapkan || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Bagian 4: Tabel RAB */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700">
                            4. Rencana Anggaran Biaya (RAB)
                          </h5>
                          <span className="text-xs font-bold text-[#0F5132]">
                            Total: {formatRupiah(d.totalRab || detailModal.item.nominalDiajukan)}
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-100 text-[11px] text-gray-700 font-bold border-b border-gray-200">
                              <tr>
                                <th className="p-2 text-center w-10">No</th>
                                <th className="p-2">Uraian / Sub / Detail</th>
                                <th className="p-2 w-20 text-center">Kuantitas</th>
                                <th className="p-2 w-24">Satuan</th>
                                <th className="p-2 w-28 text-right">Harga Satuan</th>
                                <th className="p-2 w-28 text-right">Jumlah</th>
                                <th className="p-2">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {d.rabItems?.map((row, idx) => (
                                <tr key={row.id || idx} className="hover:bg-slate-50/50">
                                  <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                                  <td className="p-2 font-medium text-gray-900">{row.uraian}</td>
                                  <td className="p-2 text-center font-mono">{row.kuantitas}</td>
                                  <td className="p-2 text-gray-600">{row.satuan}</td>
                                  <td className="p-2 text-right font-mono">
                                    {formatRupiah(row.hargaSatuan)}
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-gray-800 bg-gray-50/50">
                                    {formatRupiah(row.jumlah)}
                                  </td>
                                  <td className="p-2 text-gray-500">{row.keterangan || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                              <tr>
                                <td colSpan={5} className="p-2 text-right text-gray-700">
                                  Total Keseluruhan:
                                </td>
                                <td className="p-2 text-right text-[#0F5132] font-mono font-extrabold">
                                  {formatRupiah(d.totalRab || detailModal.item.nominalDiajukan)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Bagian 5: Pengesahan Dua Pihak (PIC & Kepala Departemen IC) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kolom 1: Dibuat Oleh (PIC Tim Inovator) */}
                        <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 flex flex-col justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                5. Dibuat Oleh:
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                PIC Tim Inovator
                              </span>
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {d.pengesahanPic?.nama || d.namaPic}
                            </div>
                            {d.pengesahanPic?.nik && (
                              <div className="text-[11px] text-gray-600 font-mono">
                                NIK: {d.pengesahanPic.nik}
                              </div>
                            )}
                            <div className="text-[11px] text-gray-600">
                              Unit Kerja: {d.pengesahanPic?.unitKerja || d.unitKerjaPic}
                            </div>
                            {d.pengesahanPic?.tanggal && (
                              <div className="text-[10px] text-gray-400">
                                Ditandatangani pada: {formatDateIndo(d.pengesahanPic.tanggal)}
                              </div>
                            )}
                          </div>

                          {d.pengesahanPic?.signatureImage && (
                            <div className="text-center space-y-1 pt-2 border-t border-gray-200">
                              <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs max-w-[170px] mx-auto">
                                <img
                                  src={d.pengesahanPic.signatureImage}
                                  alt="Tanda Tangan PIC"
                                  className="h-14 w-auto object-contain block mx-auto"
                                />
                              </div>
                              <span className="text-[10px] text-emerald-700 font-bold">
                                Tanda Tangan PIC Terverifikasi
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Kolom 2: Disetujui Oleh (Kepala Departemen IC) */}
                        <div
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                            d.pengesahanApprover?.signatureImage ||
                            detailModal.item.status === "disetujui" ||
                            detailModal.item.status === "diotorisasi"
                              ? "bg-emerald-50/30 border-emerald-200"
                              : detailModal.item.status === "ditolak"
                              ? "bg-rose-50/30 border-rose-200"
                              : "bg-amber-50/30 border-amber-200"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Disetujui Oleh:
                              </span>
                              {d.pengesahanApprover?.signatureImage ||
                              detailModal.item.status === "disetujui" ||
                              detailModal.item.status === "diotorisasi" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Disetujui
                                </span>
                              ) : detailModal.item.status === "ditolak" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                  Ditolak
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  Menunggu Persetujuan
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-bold text-gray-900">
                              {d.pengesahanApprover?.nama ||
                                (approvers.length > 0
                                  ? approvers.map((a) => a.nama).join(" / ")
                                  : "Kepala Departemen Innovation Center")}
                            </div>
                            <div className="text-[11px] text-gray-600">
                              Jabatan: Kepala Departemen Innovation Center
                            </div>
                            <div className="text-[11px] text-gray-600">
                              Unit Kerja: {d.pengesahanApprover?.unitKerja || "Innovation Center"}
                            </div>
                            {d.pengesahanApprover?.tanggal && (
                              <div className="text-[10px] text-gray-400">
                                Disetujui pada: {formatDateIndo(d.pengesahanApprover.tanggal)}
                              </div>
                            )}
                          </div>

                          {/* Signature view atau Action buttons */}
                          {d.pengesahanApprover?.signatureImage ? (
                            <div className="text-center space-y-1 pt-2 border-t border-emerald-200">
                              <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs max-w-[170px] mx-auto">
                                <img
                                  src={d.pengesahanApprover.signatureImage}
                                  alt="Tanda Tangan Kepala Departemen IC"
                                  className="h-14 w-auto object-contain block mx-auto"
                                />
                              </div>
                              <span className="text-[10px] text-emerald-700 font-bold">
                                Tanda Tangan Persetujuan IC
                              </span>
                            </div>
                          ) : detailModal.item.status === "ditolak" ? (
                            <div className="p-3 bg-white rounded-xl border border-rose-200 text-rose-800 text-xs">
                              <strong className="font-semibold block text-[11px] text-rose-700">
                                Alasan Penolakan:
                              </strong>
                              <p className="mt-0.5 text-gray-700 leading-relaxed">
                                {detailModal.item.catatanPenilaian || "Tidak ada catatan penolakan."}
                              </p>
                            </div>
                          ) : detailModal.item.status === "diajukan" && canApproveAnggaran ? (
                            <div className="space-y-2 pt-2 border-t border-amber-200">
                              <p className="text-[11px] text-amber-900 font-medium">
                                Anda memiliki role <strong>Approve Anggaran (Kepala Departemen IC)</strong>. Silakan review dan bubuhkan tanda tangan:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setApproveTargetId(detailModal.item.id);
                                    setSigPadTarget("approve");
                                    setIsSigPadOpen(true);
                                  }}
                                  className="bg-[#0F5132] hover:bg-[#0F5132]/90 text-white text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                                >
                                  <PenTool className="h-3.5 w-3.5" />
                                  <span>Tandatangani sbg Kepala Departemen IC</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRejectModal({
                                      open: true,
                                      targetId: detailModal.item.id,
                                      alasan: "",
                                    });
                                  }}
                                  className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1 h-8 cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Tolak</span>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-white/80 rounded-xl border border-dashed border-amber-200 text-[11px] text-amber-800 italic">
                              Menunggu tanda tangan digital dari pejabat berwenang dengan role Approve Anggaran (Kepala Departemen IC).
                            </div>
                          )}
                        </div>
                      </div>

                      {detailModal.item.fileDokumenUrl && (
                        <div className="p-3 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                          <span className="text-xs text-gray-600">Dokumen Pendukung Tambahan:</span>
                          <a
                            href={detailModal.item.fileDokumenUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#0F5132] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Buka Tautan Lampiran</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* Fallback untuk pengajuan dengan format sederhana sebelumnya */
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                    Pengajuan ini dikirimkan menggunakan format sederhana sebelumnya.
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Nominal Diajukan:</span>
                      <span className="font-bold text-[#0F5132] text-sm">
                        {formatRupiah(detailModal.item.nominalDiajukan)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Fase Kegiatan:</span>
                      <span className="font-semibold text-gray-800 uppercase">
                        {detailModal.item.fase}
                      </span>
                    </div>
                    {detailModal.item.fileDokumenUrl && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">File Dokumen RAB:</span>
                        <a
                          href={detailModal.item.fileDokumenUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0F5132] font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Buka Dokumen</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <a
                  href={`/api/pdf/rab/${detailModal.item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition-all cursor-pointer mr-auto"
                  title="Unduh Formulir Pengajuan Anggaran (RAB) format PDF"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Unduh PDF RAB</span>
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModal({ open: false, item: null })}
                  className="text-xs"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SIGNATURE PAD MODAL (REUSABLE: PIC SUBMIT, EDIT, APPROVER IC, LPJ)    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SignaturePadModal
        isOpen={isSigPadOpen}
        onClose={() => {
          setIsSigPadOpen(false);
          setApproveTargetId(null);
        }}
        onSave={(dataUrl) => {
          if (sigPadTarget === "approve") {
            handleApproveWithSignature(dataUrl);
          } else if (sigPadTarget === "edit") {
            setEditModal((prev) => ({ ...prev, signatureImage: dataUrl }));
            setIsSigPadOpen(false);
            toast.success("Tanda tangan digital PIC berhasil disimpan.", "Tanda Tangan");
          } else if (sigPadTarget === "lpj") {
            setLpjSignatureImage(dataUrl);
            setIsSigPadOpen(false);
            toast.success("Tanda tangan digital PIC untuk LPJ berhasil disimpan.", "Tanda Tangan LPJ");
          } else {
            setSignatureImage(dataUrl);
            setIsSigPadOpen(false);
            toast.success("Tanda tangan digital PIC berhasil disimpan.", "Tanda Tangan");
          }
        }}
        title={
          sigPadTarget === "approve"
            ? "Tanda Tangan Digital — Disetujui Oleh (Kepala Departemen IC)"
            : sigPadTarget === "lpj"
            ? "Tanda Tangan Digital — PIC Tim Inovator (Formulir B - LPJ)"
            : "Tanda Tangan Digital — PIC Tim Inovator"
        }
        roleName="PIC Tim Inovator"
        userName={
          sigPadTarget === "approve"
            ? currentUser?.nama || "Kepala Departemen IC"
            : sigPadTarget === "edit"
            ? editModal.namaPic
            : sigPadTarget === "lpj"
            ? lpjNamaPic
            : namaPic
        }
      />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG TOLAK PENGAJUAN ANGGARAN (ALASAN WAJIB)                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={rejectModal.open}
        onOpenChange={(open) => {
          if (!open) setRejectModal({ open: false, targetId: "", alasan: "" });
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-gray-900">
                  Tolak Pengajuan Anggaran (RAB)
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-500">
                Silakan berikan alasan penolakan secara jelas. Catatan ini akan tersimpan dan dapat ditinjau oleh tim inovator pengusul.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Alasan Penolakan <span className="text-rose-600">*</span>
              </label>
              <Textarea
                required
                rows={3}
                placeholder="Contoh: Rincian biaya pada baris ke-2 belum disertai justifikasi kebutuhan pilot..."
                value={rejectModal.alasan}
                onChange={(e) =>
                  setRejectModal((prev) => ({ ...prev, alasan: e.target.value }))
                }
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRejecting}
                onClick={() => setRejectModal({ open: false, targetId: "", alasan: "" })}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRejecting || !rejectModal.alasan.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menolak...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Tolak Pengajuan</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG KONFIRMASI HAPUS / BATALKAN ANGGARAN                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!open) setDeleteModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Batalkan &amp; Hapus Pengajuan Anggaran?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Apakah Anda yakin ingin membatalkan pengajuan anggaran sebesar{" "}
              <strong>{formatRupiah(deleteModal.nominal)}</strong> untuk Fase{" "}
              <strong>{deleteModal.fase?.replace("_", " ")}</strong>?
              <br />
              <span className="text-red-500 font-medium">Tindakan ini tidak dapat diurungkan.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModal((prev) => ({ ...prev, open: false }))}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={deleting}
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Ya, Batalkan Pengajuan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG FORMULIR B — LPJ RESMI (JUKLAK LAMPIRAN III)                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isLpjFormOpen} onOpenChange={setIsLpjFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F5132] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Formulir B — Lampiran III Juklak
                </span>
                <DialogTitle className="text-base font-bold text-gray-900 mt-1">
                  Laporan Pertanggungjawaban (LPJ) Penggunaan Anggaran Inkubasi
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Pertanggungjawaban realisasi dana pelaksanaan MVP program inkubasi inovasi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitLpj} className="space-y-6 pt-2">
            {/* ── DROPDOWN WAJIB: PILIH PENGAJUAN RAB TERKAIT ─────────────────── */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-[#0F5132]" />
                  <span>Pilih Pengajuan RAB Terkait <span className="text-rose-600">*</span></span>
                </label>
                {selectedRabForLpj && (
                  <span className="text-xs font-bold text-[#0F5132] bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    Pagu Disetujui: {formatRupiah(approvedRabNominal)}
                  </span>
                )}
              </div>

              <select
                required
                value={lpjSelectedRabId}
                onChange={(e) => handleSelectRabForLpj(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
              >
                <option value="" disabled>-- Pilih Pengajuan Anggaran (RAB) Disetujui --</option>
                {list
                  .filter((item) => (item.status === "disetujui" || item.status === "diotorisasi") && !item.lpj)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      Fase {item.fase.replace("_", " ").toUpperCase()} — {formatRupiah(item.nominalDiajukan)} (Diajukan: {formatDateIndo(item.tanggalPengajuan)})
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-gray-500">
                Hanya menampilkan RAB berstatus Disetujui yang belum memiliki LPJ terkait.
              </p>
            </div>

            {/* ── BAGIAN A: IDENTITAS PENGAJUAN INOVATOR ───────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Identitas Pengajuan Inovator
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Data penanggung jawab pelaksanaan dan penggunaan dana inkubasi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span>Nama Penanggung Jawab (PIC) *</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Nama lengkap PIC"
                    value={lpjNamaPic}
                    onChange={(e) => setLpjNamaPic(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>Unit Kerja *</span>
                    </span>
                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                      Auto-fill Tim
                    </span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Divisi / Unit Kerja"
                    value={lpjUnitKerjaPic}
                    onChange={(e) => setLpjUnitKerjaPic(e.target.value)}
                    className="h-8 text-xs font-medium text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>No. Handphone (WhatsApp) *</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="0812xxxx"
                    value={lpjNoHpPic}
                    onChange={(e) => setLpjNoHpPic(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ── BAGIAN B: INFORMASI INOVASI ─────────────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Informasi Inovasi
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Konteks proyek inovasi yang didanai melalui anggaran ini.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Judul Proyek Inovasi *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Judul Proyek Inovasi"
                    value={lpjJudulProyek}
                    onChange={(e) => setLpjJudulProyek(e.target.value)}
                    className="h-8 text-xs font-medium text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Kategori Proyek Inovasi *
                  </label>
                  <select
                    required
                    value={lpjKategoriProyek}
                    onChange={(e) => setLpjKategoriProyek(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132]"
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {KATEGORI_PROYEK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── BAGIAN C: RINGKASAN PENGGUNAAN ANGGARAN PELAKSANAAN MVP (TABEL DINAMIS) ── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                    C
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Ringkasan Penggunaan Anggaran Pelaksanaan MVP
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      Rincian pengeluaran aktual beserta bukti foto/nota/kwitansi (wajib diisi per baris).
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Total Penggunaan LPJ:</span>
                  <span className={`text-xs font-extrabold font-mono ${totalNominalLpj > approvedRabNominal ? "text-rose-600" : "text-[#0F5132]"}`}>
                    {formatRupiah(totalNominalLpj)}
                  </span>
                </div>
              </div>

              {/* Tabel Dinamis */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-[11px] text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-center w-8">No</th>
                      <th className="p-2 w-48">Uraian Penggunaan</th>
                      <th className="p-2 w-32">Nominal (Rp)</th>
                      <th className="p-2 w-36">Keterangan</th>
                      <th className="p-2">Evidence (Bukti/Nota/Kwitansi) *</th>
                      <th className="p-2 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lpjItems.map((row, idx) => (
                      <tr key={row.id} className="align-top hover:bg-slate-50/50">
                        <td className="p-2 text-center text-gray-400 font-medium pt-3">{idx + 1}</td>
                        <td className="p-2">
                          <Input
                            type="text"
                            required
                            placeholder="Contoh: Honor narasumber interview"
                            value={row.uraian}
                            onChange={(e) => handleUpdateLpjRow(row.id, "uraian", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            required
                            min={1}
                            placeholder="Rp 0"
                            value={row.nominal || ""}
                            onChange={(e) => handleUpdateLpjRow(row.id, "nominal", Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            placeholder="Catatan tambahan..."
                            value={row.keterangan || ""}
                            onChange={(e) => handleUpdateLpjRow(row.id, "keterangan", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <div className="space-y-1.5">
                            {/* Evidence list tags */}
                            {row.evidence && row.evidence.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {row.evidence.map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 max-w-[200px] truncate"
                                    title={ev.nama}
                                  >
                                    {ev.tipe === "file" ? (
                                      <Paperclip className="h-3 w-3 shrink-0 text-emerald-600" />
                                    ) : (
                                      <Link2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                    )}
                                    <span className="truncate">{ev.nama}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEvidence(row.id, ev.id)}
                                      className="text-gray-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                                Wajib melampirkan bukti
                              </span>
                            )}

                            {/* Tombol aksi upload / link */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 px-2 py-1 rounded-md shadow-2xs">
                                {isUploadingEvidence[row.id] ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Upload...</span>
                                  </>
                                ) : (
                                  <>
                                    <Paperclip className="h-3 w-3" />
                                    <span>Upload File</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  disabled={isUploadingEvidence[row.id]}
                                  onChange={(e) => handleFileUploadEvidence(row.id, e)}
                                  className="hidden"
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  setLinkInputModal({
                                    open: true,
                                    rowId: row.id,
                                    url: "",
                                    label: "",
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded-md shadow-2xs cursor-pointer"
                              >
                                <Link2 className="h-3 w-3" />
                                <span>Tautan Link</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center pt-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={lpjItems.length <= 1}
                            onClick={() => handleRemoveLpjRow(row.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLpjRow}
                  className="text-xs border-dashed gap-1 h-8 text-[#0F5132] border-[#0F5132] hover:bg-emerald-50 font-semibold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Baris Penggunaan Dana</span>
                </Button>

                {/* Ringkasan & Komparasi Dana */}
                <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1 text-xs text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-gray-500">Pagu RAB Disetujui:</span>
                    <span className="font-bold text-gray-800 font-mono">{formatRupiah(approvedRabNominal)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-gray-500">Total Penggunaan LPJ:</span>
                    <span className={`font-extrabold font-mono ${totalNominalLpj > approvedRabNominal ? "text-rose-600" : "text-[#0F5132]"}`}>
                      {formatRupiah(totalNominalLpj)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-1">
                    <span className="text-gray-500">Sisa Anggaran (Efisiensi):</span>
                    <span className="font-bold font-mono text-gray-700">
                      {formatRupiah(Math.max(0, approvedRabNominal - totalNominalLpj))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning jika melebihi plafon */}
              {totalNominalLpj > approvedRabNominal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-rose-700">Pagu Anggaran Terlampaui!</strong>
                    <span>
                      Total pengeluaran dana LPJ ({formatRupiah(totalNominalLpj)}) melebihi nominal RAB yang telah disetujui ({formatRupiah(approvedRabNominal)}). Harap sesuaikan kembali nominal agar tidak melebihi pagu.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── BAGIAN D: PERNYATAAN & PENGESAHAN ────────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="h-6 w-6 rounded-full bg-[#0F5132] text-white flex items-center justify-center text-xs font-bold">
                  D
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Pernyataan Pertanggungjawaban
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Pernyataan resmi penanggung jawab atas akuntabilitas dan keabsahan penggunaan dana.
                  </p>
                </div>
              </div>

              {/* Teks Statis Resmi Pernyataan */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-gray-800 leading-relaxed italic">
                &ldquo;Dengan ini saya selaku PIC Tim Inovator menyatakan bahwa seluruh penggunaan anggaran telah dilaksanakan sesuai dengan kebutuhan pelaksanaan MVP Proyek Inovasi dan dapat dipertanggungjawabkan.&rdquo;
              </div>

              {/* Blok Tanda Tangan PIC */}
              <div className="p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-xs w-full sm:w-auto">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Penanggung Jawab (PIC Tim Inovator):
                  </span>
                  <div className="font-bold text-gray-900 text-sm">{lpjNamaPic || "Nama PIC"}</div>
                  <div className="text-[11px] text-gray-600">
                    Unit Kerja: {lpjUnitKerjaPic || "-"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Tanggal: {formatDateIndo(new Date())}
                  </div>

                  <div className="pt-1.5 w-full max-w-xs">
                    <label className="text-[11px] font-semibold text-gray-700">
                      NIK PIC *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Masukkan NIK Anda"
                      value={lpjNikPic}
                      onChange={(e) => setLpjNikPic(e.target.value)}
                      className="h-8 text-xs font-mono mt-0.5 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  {lpjSignatureImage ? (
                    <div className="space-y-1 text-center">
                      <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs max-w-[170px]">
                        <img
                          src={lpjSignatureImage}
                          alt="Tanda Tangan PIC LPJ"
                          className="h-14 w-auto object-contain block mx-auto"
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Tanda Tangan Siap</span>
                      </span>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSigPadTarget("lpj");
                            setIsSigPadOpen(true);
                          }}
                          className="h-6 text-[10px] px-2 text-gray-600 cursor-pointer"
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLpjSignatureImage(null)}
                          className="h-6 text-[10px] px-2 text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="h-14 w-44 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center text-[11px] text-gray-400 italic">
                        Belum ada tanda tangan
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setSigPadTarget("lpj");
                          setIsSigPadOpen(true);
                        }}
                        className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer shadow-xs"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        <span>Bubuhkan Tanda Tangan PIC</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLpjFormOpen(false)}
                className="text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmittingLpj ||
                  !lpjSelectedRabId ||
                  totalNominalLpj <= 0 ||
                  totalNominalLpj > approvedRabNominal ||
                  !lpjNikPic.trim() ||
                  !lpjSignatureImage
                }
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 px-4 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingLpj ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengirimkan LPJ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Kirim Formulir LPJ Resmi</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG LIHAT DETAIL LPJ (FORMULIR B RESMI)                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={detailLpjModal.open}
        onOpenChange={(open) => !open && setDetailLpjModal({ open: false, item: null, rabItem: null })}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F5132] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Formulir B — Lampiran III Juklak
                  </span>
                  <Badge
                    className={`text-[10px] font-bold ${
                      detailLpjModal.item?.status === "terlambat"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}
                  >
                    LPJ {detailLpjModal.item?.status === "terlambat" ? "Terkirim (Terlambat)" : "Terkirim"}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-gray-900 mt-1">
                  Laporan Pertanggungjawaban (LPJ) Penggunaan Anggaran Inkubasi
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Dokumen pertanggungjawaban resmi yang telah dikirimkan oleh PIC Tim Inovator.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailLpjModal.item && (() => {
            const d = (detailLpjModal.item.detailLpj as LpjDetailPengajuan) || null;
            return (
              <div className="space-y-5 pt-2">
                {/* Bagian A: Identitas */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#0F5132]" />
                    <span>A. Identitas Pengajuan Inovator</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-gray-400 text-[10px] block">Nama Penanggung Jawab (PIC):</span>
                      <span className="font-bold text-gray-900">{d?.namaPic || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">Unit Kerja:</span>
                      <span className="font-medium text-gray-800">{d?.unitKerjaPic || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">No. Handphone (WhatsApp):</span>
                      <span className="font-mono text-gray-800">{d?.noHpPic || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Bagian B: Informasi Inovasi */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-[#0F5132]" />
                    <span>B. Informasi Inovasi</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-gray-400 text-[10px] block">Judul Proyek Inovasi:</span>
                      <span className="font-bold text-gray-900">{d?.judulProyek || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] block">Kategori Proyek Inovasi:</span>
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        {d?.kategoriProyek || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bagian C: Ringkasan Penggunaan Dana */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[11px] uppercase tracking-wider text-gray-700">
                      C. Ringkasan Penggunaan Anggaran Pelaksanaan MVP
                    </h5>
                    <span className="text-xs font-bold text-[#0F5132]">
                      Total LPJ: {formatRupiah(d?.totalNominal || 0)}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-100 text-[11px] text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2 text-center w-10">No</th>
                          <th className="p-2">Uraian Penggunaan</th>
                          <th className="p-2 w-32 text-right">Nominal (Rp)</th>
                          <th className="p-2 w-44">Keterangan</th>
                          <th className="p-2">Bukti (Evidence)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {d?.items?.map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-50/50 align-top">
                            <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                            <td className="p-2 font-medium text-gray-900">{row.uraian}</td>
                            <td className="p-2 text-right font-mono font-bold text-gray-800 bg-gray-50/50">
                              {formatRupiah(row.nominal)}
                            </td>
                            <td className="p-2 text-gray-600">{row.keterangan || "-"}</td>
                            <td className="p-2">
                              {row.evidence && row.evidence.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {row.evidence.map((ev) => (
                                    <a
                                      key={ev.id}
                                      href={ev.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer"
                                    >
                                      {ev.tipe === "file" ? (
                                        <Paperclip className="h-3 w-3 text-emerald-600" />
                                      ) : (
                                        <Link2 className="h-3 w-3 text-emerald-600" />
                                      )}
                                      <span>{ev.nama}</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                        <tr>
                          <td colSpan={2} className="p-2 text-right text-gray-700">
                            Total Pengeluaran LPJ:
                          </td>
                          <td className="p-2 text-right text-[#0F5132] font-mono font-extrabold">
                            {formatRupiah(d?.totalNominal || 0)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Bagian D: Pernyataan & Tanda Tangan */}
                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                    D. Pernyataan &amp; Pengesahan PIC
                  </span>

                  <p className="text-xs text-gray-800 italic bg-white p-3 rounded-lg border border-gray-200">
                    &ldquo;{d?.pernyataanPic?.teks || "Dengan ini saya selaku PIC Tim Inovator menyatakan bahwa seluruh penggunaan anggaran telah dilaksanakan sesuai dengan kebutuhan pelaksanaan MVP Proyek Inovasi dan dapat dipertanggungjawabkan."}&rdquo;
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-gray-900 text-sm">
                        {d?.pernyataanPic?.nama || d?.namaPic}
                      </div>
                      {d?.pernyataanPic?.nik && (
                        <div className="text-[11px] text-gray-600 font-mono">
                          NIK: {d.pernyataanPic.nik}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-600">
                        Unit Kerja: {d?.pernyataanPic?.unitKerja || d?.unitKerjaPic}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Ditandatangani pada: {formatDateIndo(d?.pernyataanPic?.tanggal || detailLpjModal.item.tanggalKirim)}
                      </div>
                    </div>

                    {d?.pernyataanPic?.signatureImage && (
                      <div className="text-center space-y-1">
                        <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs max-w-[170px] mx-auto">
                          <img
                            src={d.pernyataanPic.signatureImage}
                            alt="Tanda Tangan PIC"
                            className="h-14 w-auto object-contain block mx-auto"
                          />
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          Tanda Tangan Digital Terverifikasi
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <a
                    href={`/api/pdf/lpj/${detailLpjModal.item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition-all cursor-pointer mr-auto"
                    title="Unduh Laporan Pertanggungjawaban (LPJ) format PDF"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Unduh PDF LPJ</span>
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailLpjModal({ open: false, item: null, rabItem: null })}
                    className="text-xs cursor-pointer"
                  >
                    Tutup
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG INPUT TAUTAN LINK BUKTI                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={linkInputModal.open}
        onOpenChange={(open) => !open && setLinkInputModal({ open: false, rowId: "", url: "", label: "" })}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#0F5132]">
              <Link2 className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-gray-900">
                Tambah Tautan Bukti (Evidence)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500">
              Masukkan tautan Google Drive, OneDrive, atau dokumen cloud bukti transaksi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Nama / Label Bukti *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Nota Toko ATK 12 Agustus"
                value={linkInputModal.label}
                onChange={(e) =>
                  setLinkInputModal((prev) => ({ ...prev, label: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                URL Tautan Bukti *
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={linkInputModal.url}
                onChange={(e) =>
                  setLinkInputModal((prev) => ({ ...prev, url: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinkInputModal({ open: false, rowId: "", url: "", label: "" })}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!linkInputModal.url.trim()}
              onClick={() => {
                handleAddLinkEvidence(
                  linkInputModal.rowId,
                  linkInputModal.url,
                  linkInputModal.label
                );
                setLinkInputModal({ open: false, rowId: "", url: "", label: "" });
              }}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-semibold cursor-pointer"
            >
              Simpan Tautan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG KONFIRMASI OTORISASI / APPROVAL (ADMIN / PO)                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={approvalModal.open}
        onOpenChange={(open) => {
          if (!open) setApprovalModal((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0F5132]" />
              {approvalModal.action === "approve"
                ? `Konfirmasi Otorisasi ${approvalModal.type === "anggaran" ? "Anggaran RAB" : "LPJ"}`
                : `Konfirmasi Tolak ${approvalModal.type === "anggaran" ? "Anggaran RAB" : "LPJ"}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {approvalModal.action === "approve"
                ? `Apakah Anda yakin ingin menyetujui pengajuan ${
                    approvalModal.type === "anggaran"
                      ? `anggaran ${approvalModal.nominal ? formatRupiah(approvalModal.nominal) : ""}`
                      : "LPJ"
                  } ini?`
                : `Berikan catatan alasan penolakan pengajuan ${
                    approvalModal.type === "anggaran" ? "anggaran" : "LPJ"
                  }.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmApproval} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Catatan Otorisasi / Keterangan (Opsional)
              </label>
              <Input
                placeholder="Contoh: Disetujui sesuai rincian RAB yang diajukan..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApprovalModal((prev) => ({ ...prev, open: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={processingApproval}
                size="sm"
                className={
                  approvalModal.action === "approve"
                    ? "bg-green-700 hover:bg-green-800 text-white text-xs font-bold gap-1.5 cursor-pointer"
                    : "bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
                }
              >
                {processingApproval ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : approvalModal.action === "approve" ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Konfirmasi Otorisasi
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Konfirmasi Tolak
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
