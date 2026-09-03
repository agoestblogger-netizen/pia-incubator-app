import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
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
  const timId = resolvedParams.id;
  const user = await getCurrentUser();

  const [
    tim,
    data,
    phaseGateStatus,
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
    getTimInovatorById(timId),
    getCustomerValidationData(timId),
    getTeamPhaseGateStatus(timId, undefined, user),
    getCharterRolesData(timId),
    user ? hasPermission(user, 'cust_val.edit', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'kanban.edit', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_inisiator', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_coach', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_plan.sign_po', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_inisiator', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_coach', timId) : Promise.resolve(false),
    user ? hasPermission(user, 'cv_report.sign_po', timId) : Promise.resolve(false),
  ]);

  if (!tim) return notFound();

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
