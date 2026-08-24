import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function KeuanganLoading() {
  return (
    <PageLoadingSkeleton
      variant="keuangan"
      title="Manajemen Keuangan & Anggaran Inovasi"
      subtitle="Memuat ringkasan alokasi dana, pengajuan termin RAB, dan status LPJ..."
    />
  );
}
