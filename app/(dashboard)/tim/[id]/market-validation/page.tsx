import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getKanbanData } from "@/app/actions/kanban";
import { getSprintsByTimId } from "@/app/actions/sprint";
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
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [
    data,
    phaseGateStatus,
    kanbanData,
    sprints,
    rolesData,
    canEdit,
    canApprove,
    canEditKanban,
  ] = await Promise.all([
    getMarketValidationData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    getKanbanData(tim.id),
    getSprintsByTimId(tim.id),
    getCharterRolesData(tim.id),
    user ? hasPermission(user, 'market_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'market_val.approve', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', tim.id) : Promise.resolve(false),
  ]);

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
        anggotaTim={tim.anggota}
        canEdit={canEdit}
        canApprove={canApprove}
        canEditKanban={canEditKanban}
        currentUser={user}
        phaseGateStatus={phaseGateStatus}
      />
    </div>
  );
}
