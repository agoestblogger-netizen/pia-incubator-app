import { getDossierList, canUserEditKlasifikasi } from '@/app/actions/dossier';
import { getCurrentUser } from '@/lib/auth/rbac';
import { DossierListClient } from './DossierListClient';

export const dynamic = 'force-dynamic';

export default async function DossierPage() {
  const user = await getCurrentUser();
  const [items, canEditKlasifikasi] = await Promise.all([
    getDossierList(),
    canUserEditKlasifikasi(user),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-4">
      <DossierListClient initialItems={items} canEditKlasifikasi={canEditKlasifikasi} />
    </div>
  );
}
