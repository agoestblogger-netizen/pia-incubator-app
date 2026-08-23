import { getTimInovatorById } from "@/app/actions/tim";
import { getFmiData } from "@/app/actions/fmi";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
import { notFound } from "next/navigation";
import { TimPhaseGateNav } from "@/components/layout/TimPhaseGateNav";
import { GovernanceClient } from "./GovernanceClient";

export const dynamic = 'force-dynamic';

export default async function GovernancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const [tim, data, phaseGateStatus] = await Promise.all([
    getTimInovatorById(resolvedParams.id),
    getFmiData(resolvedParams.id),
    getTeamPhaseGateStatus(resolvedParams.id),
  ]);

  if (!tim) return notFound();

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <GovernanceClient timId={tim.id} initialData={data} />
    </div>
  );
}
