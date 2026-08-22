import { getDossierDetail } from '@/app/actions/dossier';
import { notFound } from 'next/navigation';
import { DossierDetailClient } from './DossierDetailClient';

export const dynamic = 'force-dynamic';

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const dossier = await getDossierDetail(decodedId);

  if (!dossier) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto py-4">
      <DossierDetailClient dossier={dossier} />
    </div>
  );
}
