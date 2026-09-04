import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getKanbanData } from "@/app/actions/kanban";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getKeuanganData, getUserTeamUnitKerja, getAnggaranApprovers } from "@/app/actions/keuangan";
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
  const [tim, user, approvers] = await Promise.all([
    getTimInovatorById(resolvedParams.id),
    getCurrentUser(),
    getAnggaranApprovers(),
  ]);

  if (!tim) return notFound();

  const [
    data,
    phaseGateStatus,
    kanbanData,
    sprints,
    keuanganList,
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
    getMarketValidationData(tim.id, tim),
    getTeamPhaseGateStatus(tim.id),
    getKanbanData(tim.id),
    getSprintsByTimId(tim.id),
    getKeuanganData(tim.id),
    getCharterRolesData(tim.id, true),
    user ? hasPermission(user, 'market_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'market_val.approve', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'anggaran.submit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'anggaran.manage', tim.id) : Promise.resolve(false),
    user
      ? Promise.race([
          getUserTeamUnitKerja(user.id, tim.id),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 3000)),
        ])
      : Promise.resolve(""),
    user ? hasPermission(user, 'mv_plan.sign_po', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_plan.sign_coach', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_plan.sign_promotor', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_po', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_coach', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'mv_report.sign_promotor', tim.id) : Promise.resolve(false),
  ]);

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
        initialColumns={kanbanData.columns}
        initialCards={kanbanData.cards}
        initialSprints={sprints}
        initialKeuanganList={keuanganList}
        anggotaTim={tim.anggota}
        canEdit={canEdit}
        canApprove={canApprove || canSignMvReportPromotor}
        canEditKanban={canEditKanban}
        canSubmitAnggaran={canSubmitAnggaran}
        canManageAnggaran={canManageAnggaran}
        canApproveAnggaran={canApproveAnggaran}
        approvers={approvers}
        currentUser={user ? { ...user, unitKerja: userUnitKerja } : null}
        phaseGateStatus={phaseGateStatus}
        signPermissions={signPermissions}
      />
    </div>
  );
}
