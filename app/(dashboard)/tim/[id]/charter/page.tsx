import { getTimInovatorById } from "@/app/actions/tim";
import { getCharterByTimId, getCharterRolesData } from "@/app/actions/charter";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { CharterFormClient } from "./CharterFormClient";

export const dynamic = 'force-dynamic';

export default async function CharterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [initialData, rolesData, phaseGateStatus, sprintsData, canEdit, canApproveCharter, canSignCharterPromotor, canManageSprintCount] = await Promise.all([
    getCharterByTimId(tim.id),
    getCharterRolesData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    getSprintsByTimId(tim.id),
    user ? hasPermission(user, 'charter.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'charter.approve', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'charter.sign_promotor', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'sprint.manage_count', tim.id) : Promise.resolve(false),
  ]);

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
        canEditRoles={canEditRoles}
        canManageSprintCount={canManageSprintCount}
        currentUser={user}
      />
    </div>
  );
}
