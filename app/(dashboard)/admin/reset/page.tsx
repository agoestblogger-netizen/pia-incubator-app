import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { timInovator } from '@/lib/db/schema';
import { ResetClient } from './ResetClient';

export const dynamic = 'force-dynamic';

export default async function AdminResetPage() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'system.reset_data'))) {
    redirect('/dashboard');
  }

  const teams = await db.select({
    id: timInovator.id,
    nama: timInovator.namaProyekInovasi,
    status: timInovator.status,
  }).from(timInovator);

  return (
    <div className="max-w-5xl mx-auto py-4">
      <ResetClient initialTeams={teams} />
    </div>
  );
}
