import { getTimInovatorById } from "@/app/actions/tim";
import { getDiskusiCanvasData } from "@/app/actions/diskusi";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { DiskusiCanvasClient } from "../DiskusiCanvasClient";
import { Lock } from "lucide-react";

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

  const [
    canView,
    canCreateCanvas,
    canAddSticky,
    canEditSticky,
    canDeleteSticky,
    canPinBacklog,
    canCompileAi,
    canAssignBacklog,
  ] = await Promise.all([
    user ? hasPermission(user, 'diskusi.view', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.create_canvas', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.add_sticky', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.edit_sticky', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.delete_sticky', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.pin_backlog', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.compile_ai', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'diskusi.assign_backlog', tim.id) : Promise.resolve(false),
  ]);

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200/80 shadow-2xs text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-extrabold text-[#0B3D2E]">Akses Kanvas Diskusi Dibatasi</h2>
        <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
          Akun Anda tidak memiliki izin (<code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">diskusi.view</code>) untuk mengakses kanvas diskusi pada tim <strong>{tim.namaProyekInovasi}</strong>.
        </p>
      </div>
    );
  }

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

  const permissions = {
    canView,
    canCreateCanvas,
    canAddSticky,
    canEditSticky,
    canDeleteSticky,
    canPinBacklog,
    canCompileAi,
    canAssignBacklog,
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
        permissions={permissions}
      />
    </div>
  );
}
