import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function DossierListLoading() {
  return (
    <PageLoadingSkeleton
      variant="dossier_list"
      title="Dossier & Arsip Proposal PIA"
      subtitle="Memuat daftar arsip proposal dan status kurasi..."
    />
  );
}
