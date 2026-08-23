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
  const [initialData, rolesData, initialSprints, phaseGateStatus, canEdit, canApprove] = await Promise.all([
    getCharterByTimId(tim.id),
    getCharterRolesData(tim.id),
    getSprintsByTimId(tim.id),
    getTeamPhaseGateStatus(tim.id),
    user ? hasPermission(user, 'charter.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'charter.approve', tim.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <CharterFormClient
        timId={tim.id}
        initialData={initialData.charter}
        initialRolesData={rolesData}
        initialSprints={initialSprints}
        autoFilledFields={initialData.autoFilledFields}
        usulanPromotorHint={initialData.usulanPromotorHint}
        canEdit={canEdit}
        canApprove={canApprove}
        currentUser={user}
      />
    </div>
  );
}
