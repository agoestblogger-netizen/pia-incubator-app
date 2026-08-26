import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
import { getKanbanData } from "@/app/actions/kanban";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { CustomerValidationClient } from "./CustomerValidationClient";

export const dynamic = 'force-dynamic';

export default async function CustomerValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [data, phaseGateStatus, kanbanData, sprints, canEditCv, canEditKanban] = await Promise.all([
    getCustomerValidationData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    getKanbanData(tim.id),
    getSprintsByTimId(tim.id),
    user ? hasPermission(user, 'cust_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', tim.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <CustomerValidationClient
        timId={tim.id}
        timInfo={{
          namaProyekInovasi: tim.namaProyekInovasi,
          klasifikasiInovasi: tim.klasifikasiInovasi || tim.kategoriPia || 'BREAKTHROUGH',
        }}
        initialData={data}
        initialColumns={kanbanData.columns}
        initialCards={kanbanData.cards}
        initialSprints={sprints}
        anggotaTim={tim.anggota}
        canEditCv={canEditCv}
        canEditKanban={canEditKanban}
        currentUser={user}
        phaseGateStatus={phaseGateStatus}
      />
    </div>
  );
}
