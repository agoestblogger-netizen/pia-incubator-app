import { getTimInovatorById } from "@/app/actions/tim";
import { getKeuanganData } from "@/app/actions/keuangan";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
import { KeuanganClient } from "./KeuanganClient";

export const dynamic = 'force-dynamic';

export default async function KeuanganPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const list = await getKeuanganData(tim.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Pengajuan Anggaran (RAB) & LPJ — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Plafon anggaran maksimal Rp 20.000.000 per fase untuk validasi pelanggan dan validasi pasar (Grup F)
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

      <KeuanganClient timId={tim.id} initialList={list} />
    </div>
  );
}
