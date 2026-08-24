import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function TimOverviewLoading() {
  return (
    <PageLoadingSkeleton
      variant="dashboard"
      title="Overview & Profil Tim Inovator"
      subtitle="Memuat informasi tim, susunan anggota, dan ringkasan tahapan inkubasi..."
    />
  );
}
