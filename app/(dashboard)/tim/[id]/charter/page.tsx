import { getTimInovatorById } from "@/app/actions/tim";
import { getCharterByTimId, getCharterRolesData } from "@/app/actions/charter";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser, type UserProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { CharterFormClient } from "./CharterFormClient";

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

export default async function CharterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [
    initialData,
    rolesData,
    phaseGateStatus,
    sprintsData,
    userPerms,
  ] = await Promise.all([
    getCharterByTimId(tim.id),
    getCharterRolesData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    getSprintsByTimId(tim.id),
    getTeamPermissionsSet(user, tim.id),
  ]);

  const canEdit = userPerms.has('charter.edit');
  const canApproveCharter = userPerms.has('charter.approve');
  const canSignCharterPromotor = userPerms.has('charter.sign_promotor');
  const canSignPo = userPerms.has('charter.sign_po');
  const canSignCoach = userPerms.has('charter.sign_coach');
  const canManageSprintCount = userPerms.has('sprint.manage_count');

  const canApprove = canApproveCharter || canSignCharterPromotor;

  const isAdmin = Boolean(
    user?.globalRoles?.some((r: string) => ["super_admin", "admin_ic", "admin"].includes(r))
  );
  const isCoach = Boolean(
    user?.timRoles?.some((tr: any) => tr.timId === tim.id && tr.roleCode === "coach") ||
    user?.globalRoles?.includes("coach")
  );
  const canEditRoles = isAdmin || isCoach;

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <CharterFormClient
        timId={tim.id}
        initialData={initialData.charter}
        initialRolesData={rolesData}
        initialSprints={sprintsData}
        autoFilledFields={initialData.autoFilledFields}
        usulanPromotorHint={initialData.usulanPromotorHint}
        usulanPoHint={initialData.usulanPoHint}
        canEdit={canEdit}
        canApprove={canApprove}
        canSignPo={canSignPo}
        canSignCoach={canSignCoach}
        canEditRoles={canEditRoles}
        canManageSprintCount={canManageSprintCount}
        currentUser={user}
        kategoriPia={tim.kategoriPia}
        klasifikasiInovasi={tim.klasifikasiInovasi}
      />
    </div>
  );
}
