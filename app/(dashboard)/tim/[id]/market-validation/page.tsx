import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getTeamPhaseGateStatus } from "@/app/actions/phase-gate";
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
  const [data, phaseGateStatus, canEdit, canApprove] = await Promise.all([
    getMarketValidationData(tim.id),
    getTeamPhaseGateStatus(tim.id),
    user ? hasPermission(user, 'market_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'market_val.approve', tim.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <TimPhaseGateNav phaseGateStatus={phaseGateStatus} />

      <MarketValidationClient
        timId={tim.id}
        initialData={data}
        canEdit={canEdit}
        canApprove={canApprove}
        currentUser={user}
      />
    </div>
  );
}
