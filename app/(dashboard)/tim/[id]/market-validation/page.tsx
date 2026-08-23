import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
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
  const [data, canEdit, canApprove] = await Promise.all([
    getMarketValidationData(tim.id),
    user ? hasPermission(user, 'market_val.edit', tim.id) : Promise.resolve(false),
    user ? hasPermission(user, 'market_val.approve', tim.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Market Validation (Tahap 3) — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Rilis MVP versi awal di lokasi pilot, pemantauan adopsi pengguna, Product-Market Fit (PMF), dan rekapitulasi DFV
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

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
