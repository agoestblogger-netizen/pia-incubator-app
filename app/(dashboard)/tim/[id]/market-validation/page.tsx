import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getUserTeamUnitKerja } from "@/app/actions/keuangan";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCharterRolesData } from "@/app/actions/charter";
import { getCurrentUser, type UserProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { MarketValidationClient } from "./MarketValidationClient";

export const dynamic = 'force-dynamic';

async function getTeamPermissionsSet(user: UserProfile | null, timId: string) {
  if (!user) {
    return new Set<string>();
  }

  // Admin IC memiliki akses global penuh tanpa perlu query role_permissions
  if (user.globalRoles.includes('admin_ic')) {
    return {
      has: (_code: string) => true,
    };
  }

  const activeRoleCodes = [
    ...user.globalRoles,
    ...user.timRoles.filter((tr) => tr.timId === timId).map((tr) => tr.roleCode),
  ];

  if (activeRoleCodes.length === 0) {
    return new Set<string>();
  }

  // 1 query batch tunggal untuk seluruh permission yang dimiliki role-role user pada tim ini
  const allowedRows = await db
    .select({ kodePermission: permissions.kodePermission })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        inArray(roles.kodeRole, activeRoleCodes),
        eq(rolePermissions.diizinkan, true)
      )
    );

  return new Set(allowedRows.map((r) => r.kodePermission));
}

export default async function MarketValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const timId = resolvedParams.id;
  const user = await getCurrentUser();

  const tim = await getTimInovatorById(timId);
  if (!tim) return notFound();

  const [
    data,
    phaseGateStatus,
    rolesData,
    userUnitKerja,
    userPerms,
  ] = await Promise.all([
    getMarketValidationData(timId, tim),
    getTeamPhaseGateStatus(timId, tim, user),
    getCharterRolesData(timId, tim.anggota, true),
    user ? getUserTeamUnitKerja(user.id, timId) : Promise.resolve(""),
    getTeamPermissionsSet(user, timId),
  ]);

  const canEdit = userPerms.has('market_val.edit');
  const canApprove = userPerms.has('market_val.approve');
  const canEditKanban = userPerms.has('kanban.edit');
  const canSubmitAnggaran = userPerms.has('anggaran.submit');
  const canManageAnggaran = userPerms.has('anggaran.manage');
  const canSignMvPlanPo = userPerms.has('mv_plan.sign_po');
  const canSignMvPlanCoach = userPerms.has('mv_plan.sign_coach');
  const canSignMvPlanPromotor = userPerms.has('mv_plan.sign_promotor');
  const canSignMvReportPo = userPerms.has('mv_report.sign_po');
  const canSignMvReportCoach = userPerms.has('mv_report.sign_coach');
  const canSignMvReportPromotor = userPerms.has('mv_report.sign_promotor');

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
