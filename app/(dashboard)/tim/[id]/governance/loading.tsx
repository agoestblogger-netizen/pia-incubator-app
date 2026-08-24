import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function GovernanceLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Governance & Kepatuhan Inovasi"
      subtitle="Memuat tinjauan kepatuhan, matriks risiko, dan dokumen governance tim..."
    />
  );
}
