import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function ImportLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Import Data Calon Peserta PIA"
      subtitle="Memuat modul upload ZIP, parser proposal, dan riwayat batch import..."
    />
  );
}
