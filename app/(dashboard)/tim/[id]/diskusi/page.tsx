import { getTimInovatorById } from "@/app/actions/tim";
import { getDiscussionCanvasListAction } from "@/app/actions/diskusi";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { DiscussionCanvasListClient } from "./DiscussionCanvasListClient";
import { Lock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DiskusiListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tim = await getTimInovatorById(id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [canView, canCreateCanvas] = await Promise.all([
    user ? hasPermission(user, 'diskusi.view', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.create_canvas', tim.id) : Promise.resolve(false),
  ]);

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200/80 shadow-2xs text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-extrabold text-[#0B3D2E]">Akses Ruang Diskusi Dibatasi</h2>
        <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
          Akun Anda tidak memiliki izin (<code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">diskusi.view</code>) untuk melihat kanvas diskusi pada tim <strong>{tim.namaProyekInovasi}</strong>.
        </p>
      </div>
    );
  }

  const canvasListRes = await getDiscussionCanvasListAction(tim.id);

  if (!canvasListRes.success || !canvasListRes.data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm font-semibold">Gagal memuat daftar Ruang Diskusi.</p>
        <p className="text-xs text-gray-400 mt-1">{canvasListRes.error || 'Terjadi kesalahan sistem.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <DiscussionCanvasListClient
        timId={tim.id}
        timNama={tim.namaProyekInovasi}
        canvases={canvasListRes.data.canvases}
        currentUserId={canvasListRes.data.currentUserId}
        canManageAny={canvasListRes.data.canManageAny}
        canCreateCanvas={canCreateCanvas}
      />
    </div>
  );
}
