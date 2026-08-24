import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function CustomerValidationLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Customer & Problem Validation"
      subtitle="Memuat hasil wawancara, pain points, dan validasi audiens..."
    />
  );
}
