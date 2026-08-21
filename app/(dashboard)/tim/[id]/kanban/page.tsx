import { getTimInovatorById } from "@/app/actions/tim";
import { getKanbanData } from "@/app/actions/kanban";
import { notFound } from "next/navigation";
import { TimNavTabs } from "@/components/layout/TimNavTabs";
import { KanbanClient } from "./KanbanClient";

export const dynamic = 'force-dynamic';

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tim = await getTimInovatorById(resolvedParams.id);
  if (!tim) return notFound();

  const { columns, cards } = await getKanbanData(tim.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Kanban Board & Roadmap — {tim.namaProyekInovasi}
        </h1>
        <p className="text-xs text-gray-500">
          Manajemen backlog charter, sprint MVP, preliminary SME review, dan visualisasi timeline roadmap
        </p>
      </div>

      <TimNavTabs timId={tim.id} />

      <KanbanClient
        timId={tim.id}
        initialColumns={columns}
        initialCards={cards}
        anggotaTim={tim.anggota}
      />
    </div>
  );
}
