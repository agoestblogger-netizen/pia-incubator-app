import { getTimInovatorById } from "@/app/actions/tim";
import { getDiskusiBoardData } from "@/app/actions/diskusi";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { DiskusiCanvasClient } from "./DiskusiCanvasClient";

export const dynamic = 'force-dynamic';

export default async function DiskusiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tim = await getTimInovatorById(id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [phaseGateStatus, diskusiDataRes] = await Promise.all([
    getTeamPhaseGateStatus(tim.id),
    getDiskusiBoardData(tim.id),
  ]);

  if (!diskusiDataRes.success || !diskusiDataRes.data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm font-semibold">Gagal memuat Ruang Diskusi.</p>
        <p className="text-xs text-gray-400 mt-1">{diskusiDataRes.error || 'Terjadi kesalahan sistem.'}</p>
      </div>
    );
  }

  const currentUser = {
    id: user?.id ?? 'anon-' + Math.random().toString(36).slice(2),
    nama: user?.nama ?? 'Anonim',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  };

  return (
    <div className="space-y-4">
      {/* 5-Box Phase Gate Header Navigation */}
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      {/* Main Workspace: Ruang Diskusi Canvas */}
      <DiskusiCanvasClient
        timId={tim.id}
        timNama={tim.namaProyekInovasi}
        currentUser={currentUser}
        initialData={diskusiDataRes.data as any}
      />
    </div>
  );
}
