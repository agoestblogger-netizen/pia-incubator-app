import { getDossierDetail, canUserEditKlasifikasi } from '@/app/actions/dossier';
import { getCurrentUser } from '@/lib/auth/rbac';
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
  const user = await getCurrentUser();
  const [dossier, canEditKlasifikasi] = await Promise.all([
    getDossierDetail(decodedId),
    canUserEditKlasifikasi(user),
  ]);

  if (!dossier) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto py-4">
      <DossierDetailClient
        dossier={dossier}
        canEditKlasifikasi={canEditKlasifikasi}
      />
    </div>
  );
}
