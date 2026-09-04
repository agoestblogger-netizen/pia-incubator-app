import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
import { getKanbanData } from "@/app/actions/kanban";
import { getSprintsByTimId } from "@/app/actions/sprint";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { getCharterRolesData } from "@/app/actions/charter";
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
  const [
    data,
    phaseGateStatus,
    kanbanData,
    sprints,
    rolesData,
    canEditCv,
    canEditKanban,
    canSignCvPlanInisiator,
    canSignCvPlanCoach,
    canSignCvPlanPo,
    canSignCvReportInisiator,
    canSignCvReportCoach,
    canSignCvReportPo,
  ] = await Promise.all([
    getCustomerValidationData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    getKanbanData(tim.id),
    getSprintsByTimId(tim.id),
    getCharterRolesData(tim.id, true),
    user ? hasPermission(user, 'cust_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_inisiator', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_coach', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_po', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_inisiator', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_coach', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_po', tim.id) : Promise.resolve(false),
  ]);

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
        initialColumns={kanbanData.columns}
        initialCards={kanbanData.cards}
        initialSprints={sprints}
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
