import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
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
  const [tim, data, phaseGateStatus] = await Promise.all([
    getTimInovatorById(resolvedParams.id),
    getCustomerValidationData(resolvedParams.id),
    getTeamPhaseGateStatus(resolvedParams.id),
  ]);

  if (!tim) return notFound();

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <CustomerValidationClient timId={tim.id} initialData={data} />
    </div>
  );
}
