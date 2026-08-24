import { getTimInovatorById } from "@/app/actions/tim";
import { getKanbanData } from "@/app/actions/kanban";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { KanbanClient } from "./kanban/KanbanClient";

export const dynamic = 'force-dynamic';

export default async function TimMainWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const user = await getCurrentUser();
  const [{ columns, cards }, sprints, phaseGateStatus, canEdit] = await Promise.all([
    getKanbanData(tim.id),
    getSprintsByTimId(tim.id),
    getTeamPhaseGateStatus(tim.id),
    user ? hasPermission(user, 'kanban.edit', tim.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      {/* 6-Box Phase Gate Header Navigation */}
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      {/* Main Workspace: Kanban Board & Roadmap */}
      <KanbanClient
        timId={tim.id}
        initialColumns={columns}
        initialCards={cards}
        initialSprints={sprints}
        anggotaTim={tim.anggota}
        canEdit={canEdit}
        currentUser={user}
        phaseGateStatus={phaseGateStatus}
      />
    </div>
  );
}
