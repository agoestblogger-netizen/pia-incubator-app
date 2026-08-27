import { getTimInovatorById } from "@/app/actions/tim";
import { getDiscussionCanvasListAction } from "@/app/actions/diskusi";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { DiscussionCanvasListClient } from "./DiscussionCanvasListClient";

export const dynamic = 'force-dynamic';

export default async function DiskusiListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tim = await getTimInovatorById(id);
  if (!tim) return notFound();

  const [user, canvasListRes] = await Promise.all([
    getCurrentUser(),
    getDiscussionCanvasListAction(tim.id),
  ]);

  if (!canvasListRes.success || !canvasListRes.data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm font-semibold">Gagal memuat daftar Ruang Diskusi.</p>
        <p className="text-xs text-gray-400 mt-1">{canvasListRes.error || 'Terjadi kesalahan sistem.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-6">
      <DiscussionCanvasListClient
        timId={tim.id}
        timNama={tim.namaProyekInovasi}
        canvases={canvasListRes.data.canvases}
        currentUserId={canvasListRes.data.currentUserId}
        canManageAny={canvasListRes.data.canManageAny}
      />
    </div>
  );
}
