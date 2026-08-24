import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function TimMainLoading() {
  return (
    <PageLoadingSkeleton
      variant="kanban"
      title="Kanban Board & Eksekusi Sprint"
      subtitle="Memuat kartu kerja, status sprint, dan alur kerja tim..."
    />
  );
}
