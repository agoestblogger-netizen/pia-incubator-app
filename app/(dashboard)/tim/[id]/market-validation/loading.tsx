import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function MarketValidationLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Market & Solution Validation"
      subtitle="Memuat metrik traction, TAM/SAM/SOM, dan validasi eksperimen pasar..."
    />
  );
}
