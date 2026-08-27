import { getTimInovatorById } from "@/app/actions/tim";
import { getDiskusiCanvasData } from "@/app/actions/diskusi";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { DiskusiCanvasClient } from "../DiskusiCanvasClient";

export const dynamic = 'force-dynamic';

export default async function SingleCanvasPage({
  params,
}: {
  params: Promise<{ id: string; canvasId: string }>;
}) {
  const { id, canvasId } = await params;
  const tim = await getTimInovatorById(id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [canvasDataRes, sprints] = await Promise.all([
    getDiskusiCanvasData({ timId: tim.id, canvasId }),
    getSprintsByTimId(tim.id),
  ]);

  if (!canvasDataRes.success || !canvasDataRes.data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm font-semibold">Gagal memuat Kanvas Diskusi.</p>
        <p className="text-xs text-gray-400 mt-1">{canvasDataRes.error || 'Kanvas tidak ditemukan.'}</p>
      </div>
    );
  }

  const totalSprints = sprints.length > 0 ? sprints.length : 6;

  const currentUser = {
    id: user?.id ?? 'anon-' + Math.random().toString(36).slice(2),
    nama: user?.nama ?? 'Anonim',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  };

  return (
    <div className="w-full">
      <DiskusiCanvasClient
        initialData={canvasDataRes.data}
        timId={tim.id}
        canvasId={canvasId}
        timNama={tim.namaProyekInovasi}
        canvasJudul={canvasDataRes.data.canvas.judul}
        currentUser={currentUser}
        isCvUnlocked={true}
        isMvUnlocked={true}
        totalSprints={totalSprints}
      />
    </div>
  );
}
