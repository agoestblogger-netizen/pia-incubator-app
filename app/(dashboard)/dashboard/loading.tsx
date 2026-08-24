import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function DashboardLoading() {
  return (
    <PageLoadingSkeleton
      variant="dashboard"
      title="Dashboard Program Inkubasi"
      subtitle="Memuat metrik, perkembangan tim, dan milestone inkubasi..."
    />
  );
}
