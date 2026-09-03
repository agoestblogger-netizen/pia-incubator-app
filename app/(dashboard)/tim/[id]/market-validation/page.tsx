import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getUserTeamUnitKerja } from "@/app/actions/keuangan";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCharterRolesData } from "@/app/actions/charter";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { MarketValidationClient } from "./MarketValidationClient";

export const dynamic = 'force-dynamic';

export default async function MarketValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const timId = resolvedParams.id;
  const user = await getCurrentUser();

  const [
    tim,
    data,
    phaseGateStatus,
    rolesData,
    canEdit,
    canApprove,
    canEditKanban,
    canSubmitAnggaran,
    canManageAnggaran,
    userUnitKerja,
    canSignMvPlanPo,
    canSignMvPlanCoach,
    canSignMvPlanPromotor,
    canSignMvReportPo,
    canSignMvReportCoach,
    canSignMvReportPromotor,
  ] = await Promise.all([
    getTimInovatorById(timId),
    getMarketValidationData(timId),
    getTeamPhaseGateStatus(timId, undefined, user),
    getCharterRolesData(timId),
    user ? hasPermission(user, 'market_val.edit', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'market_val.approve', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'anggaran.submit', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'anggaran.manage', timId) : Promise.resolve(false),
    user ? getUserTeamUnitKerja(user.id, timId) : Promise.resolve(""),
    user ? hasPermission(user, 'mv_plan.sign_po', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_plan.sign_coach', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_plan.sign_promotor', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_po', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_coach', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_promotor', timId) : Promise.resolve(false),
  ]);

  if (!tim) return notFound();

  const signPermissions = {
    plan: {
      po: canSignMvPlanPo,
      coach: canSignMvPlanCoach,
      promotor: canSignMvPlanPromotor,
    },
    report: {
      po: canSignMvReportPo,
      coach: canSignMvReportCoach,
      promotor: canSignMvReportPromotor || canApprove,
    },
  };

  const hasApproveRole = Boolean(
    user?.globalRoles?.includes('approve_anggaran') ||
    user?.timRoles?.some((r: any) => r.roleCode === 'approve_anggaran')
  );
  const canApproveAnggaran = hasApproveRole || canManageAnggaran;

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <MarketValidationClient
        timId={tim.id}
        timInfo={{
          namaProyekInovasi: tim.namaProyekInovasi,
          klasifikasiInovasi: tim.klasifikasiInovasi || tim.kategoriPia || 'BREAKTHROUGH',
        }}
        roleAssignments={rolesData?.assignments || []}
        initialData={data}
        anggotaTim={tim.anggota}
        canEdit={canEdit}
        canApprove={canApprove || canSignMvReportPromotor}
        canEditKanban={canEditKanban}
        canSubmitAnggaran={canSubmitAnggaran}
        canManageAnggaran={canManageAnggaran}
        canApproveAnggaran={canApproveAnggaran}
        currentUser={user ? { ...user, unitKerja: userUnitKerja } : null}
        phaseGateStatus={phaseGateStatus}
        signPermissions={signPermissions}
      />
    </div>
  );
}
