import { getCurrentUser } from '@/lib/auth/rbac';
import { getTimInovatorById } from '@/app/actions/tim';
import { getSpikeStickiesAction } from '@/app/actions/spike-sticky';
import { notFound } from 'next/navigation';
import { SpikeBoardClient } from './SpikeBoardClient';

export const dynamic = 'force-dynamic';

export default async function DiskusiSpikePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tim, user] = await Promise.all([
    getTimInovatorById(id),
    getCurrentUser(),
  ]);

  if (!tim) return notFound();

  const stickiesRes = await getSpikeStickiesAction(tim.id);
  const initialStickies = stickiesRes.success ? stickiesRes.data ?? [] : [];

  const currentUser = {
    id: user?.id ?? 'anon-' + Math.random().toString(36).slice(2),
    nama: user?.nama ?? 'Anonim',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  };

  return (
    <SpikeBoardClient
      timId={tim.id}
      timNama={tim.namaProyekInovasi}
      currentUser={currentUser}
      initialStickies={initialStickies}
    />
  );
}
