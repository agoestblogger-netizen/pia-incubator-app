import { getTimInovatorById } from "@/app/actions/tim";
import { getMarketValidationData } from "@/app/actions/market-validation";
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

  const data = await getMarketValidationData(tim.id);

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

      <MarketValidationClient timId={tim.id} initialData={data} />
    </div>
  );
}
