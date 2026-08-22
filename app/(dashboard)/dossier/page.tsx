import { getDossierList } from '@/app/actions/dossier';
import { DossierListClient } from './DossierListClient';

export const dynamic = 'force-dynamic';

export default async function DossierPage() {
  const items = await getDossierList();

  return (
    <div className="max-w-7xl mx-auto py-4">
      <DossierListClient initialItems={items} />
    </div>
  );
}
