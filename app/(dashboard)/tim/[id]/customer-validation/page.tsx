import { getTimInovatorById } from "@/app/actions/tim";
import { getCustomerValidationData } from "@/app/actions/customer-validation";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
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

  const data = await getCustomerValidationData(tim.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Customer Validation (Tahap 2) — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Uji coba prototype pada early adopters, evaluasi Problem-Solution Fit (PSF), dan metrik keberhasilan
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

      <CustomerValidationClient timId={tim.id} initialData={data} />
    </div>
  );
}
