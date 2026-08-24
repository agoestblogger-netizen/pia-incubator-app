import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function TugasLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Tugas & Penugasan Saya"
      subtitle="Memuat daftar kartu kerja, checklist eksekusi, dan review tertunda..."
    />
  );
}
