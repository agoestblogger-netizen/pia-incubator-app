import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';
import { ImportClient } from './ImportClient';

export const dynamic = 'force-dynamic';

export default async function AdminImportPage() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-6xl mx-auto py-4">
      <ImportClient />
    </div>
  );
}
