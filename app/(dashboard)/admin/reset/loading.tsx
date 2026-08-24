import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function ResetLoading() {
  return (
    <PageLoadingSkeleton
      variant="default"
      title="Reset & Pembersihan Data Sistem"
      subtitle="Memuat konfigurasi pembersihan modul dan ringkasan audit log..."
    />
  );
}
