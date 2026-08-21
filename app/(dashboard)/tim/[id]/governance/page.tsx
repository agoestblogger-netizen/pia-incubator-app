import { getTimInovatorById } from "@/app/actions/tim";
import { getFmiData } from "@/app/actions/fmi";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
import { GovernanceClient } from "./GovernanceClient";

export const dynamic = 'force-dynamic';

export default async function GovernancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const data = await getFmiData(tim.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Forum Manajemen Inovasi (FMI) & Hasil Akhir — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Keputusan akhir Dewan Direksi/Manajemen: Lanjut Skala Nasional, Diadopsi, atau Selesai (Input manual Admin)
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

      <GovernanceClient timId={tim.id} initialData={data} />
    </div>
  );
}
