import { getTimInovatorById } from "@/app/actions/tim";
import { getCharterByTimId, getCharterRolesData } from "@/app/actions/charter";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
import { CharterFormClient } from "./CharterFormClient";

export const dynamic = 'force-dynamic';

export default async function CharterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const [initialData, rolesData] = await Promise.all([
    getCharterByTimId(tim.id),
    getCharterRolesData(tim.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Innovation Charter — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Dokumen komitmen visi inovasi, hipotesis Desirability/Feasibility/Viability, dan tata kelola ritme kerja tim
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

      <CharterFormClient
        timId={tim.id}
        initialData={initialData}
        initialRolesData={rolesData}
      />
    </div>
  );
}

