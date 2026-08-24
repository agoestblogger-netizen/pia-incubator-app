import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function DossierDetailLoading() {
  return (
    <PageLoadingSkeleton
      variant="dossier_detail"
      title="Detail Dossier Arsip PIA"
      subtitle="Memuat ringkasan data kurasi, dokumen asli, dan penampil PDF..."
    />
  );
}
