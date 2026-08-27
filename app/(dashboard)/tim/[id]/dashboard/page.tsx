import { notFound } from "next/navigation";
import { getTimDashboardDataAction } from "@/app/actions/dashboard-tim";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function TimDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const timId = resolvedParams.id;

  const [dashboardRes, phaseGateStatus] = await Promise.all([
    getTimDashboardDataAction(timId),
    getTeamPhaseGateStatus(timId),
  ]);

  if (!dashboardRes.success || !dashboardRes.data) {
    notFound();
  }

  return (
    <DashboardClient
      dashboardData={dashboardRes.data}
      phaseGateStatus={phaseGateStatus}
    />
  );
}
