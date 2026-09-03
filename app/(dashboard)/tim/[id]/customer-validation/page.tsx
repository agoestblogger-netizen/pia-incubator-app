import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCharterRolesData } from "@/app/actions/charter";
import { getCurrentUser, type UserProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { CustomerValidationClient } from "./CustomerValidationClient";

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

export default async function CustomerValidationPage({
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
    rolesData,
    userPerms,
  ] = await Promise.all([
    getCustomerValidationData(timId),
    getCharterRolesData(timId, tim.anggota),
    getTeamPermissionsSet(user, timId),
  ]);

  const phaseGateStatus = await getTeamPhaseGateStatus(timId, tim, user, data.plan);

  const canEditCv = userPerms.has('cust_val.edit');
  const canEditKanban = userPerms.has('kanban.edit');
  const canSignCvPlanInisiator = userPerms.has('cv_plan.sign_inisiator');
  const canSignCvPlanCoach = userPerms.has('cv_plan.sign_coach');
  const canSignCvPlanPo = userPerms.has('cv_plan.sign_po');
  const canSignCvReportInisiator = userPerms.has('cv_report.sign_inisiator');
  const canSignCvReportCoach = userPerms.has('cv_report.sign_coach');
  const canSignCvReportPo = userPerms.has('cv_report.sign_po');

  const signPermissions = {
    plan: {
      inisiator: canSignCvPlanInisiator,
      coach: canSignCvPlanCoach,
      po: canSignCvPlanPo,
    },
    report: {
      inisiator: canSignCvReportInisiator,
      coach: canSignCvReportCoach,
      po: canSignCvReportPo,
    },
  };

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <CustomerValidationClient
        timId={tim.id}
        timInfo={{
          namaProyekInovasi: tim.namaProyekInovasi,
          klasifikasiInovasi: tim.klasifikasiInovasi || tim.kategoriPia || 'BREAKTHROUGH',
        }}
        roleAssignments={rolesData?.assignments || []}
        initialData={data}
        anggotaTim={tim.anggota}
        canEditCv={canEditCv}
        canEditKanban={canEditKanban}
        currentUser={user}
        phaseGateStatus={phaseGateStatus}
        signPermissions={signPermissions}
      />
    </div>
  );
}
