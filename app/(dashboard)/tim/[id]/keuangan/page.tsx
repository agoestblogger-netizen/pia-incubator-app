import { getTimInovatorById } from "@/app/actions/tim";
import { getKeuanganData, getUserTeamUnitKerja, getAnggaranApprovers } from "@/app/actions/keuangan";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { KeuanganClient } from "./KeuanganClient";

export const dynamic = 'force-dynamic';

export default async function KeuanganPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [list, phaseGateStatus, canSubmit, canManage, userUnitKerja, approvers] = await Promise.all([
    getKeuanganData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    user ? hasPermission(user, 'anggaran.submit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'anggaran.manage', tim.id) : Promise.resolve(false),
    user ? getUserTeamUnitKerja(user.id, tim.id) : Promise.resolve(""),
    getAnggaranApprovers(),
  ]);

  const hasApproveRole = Boolean(
    user?.globalRoles?.includes('approve_anggaran') ||
    user?.timRoles?.some((r: any) => r.roleCode === 'approve_anggaran')
  );
  const canApproveAnggaran = hasApproveRole || canManage;

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <KeuanganClient
        timId={tim.id}
        initialList={list}
        canSubmit={canSubmit}
        canManage={canManage}
        canApproveAnggaran={canApproveAnggaran}
        approvers={approvers}
        timInfo={{
          namaProyekInovasi: tim.namaProyekInovasi,
          kategoriPia: tim.kategoriPia,
        }}
        currentUser={{
          id: user?.id || "",
          nama: user?.nama || "",
          email: user?.email || "",
          unitKerja: userUnitKerja,
        }}
        anggotaTim={tim.anggota}
      />
    </div>
  );
}
