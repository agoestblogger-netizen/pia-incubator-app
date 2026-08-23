import { redirect } from "next/navigation";

export default async function KanbanRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/tim/${resolvedParams.id}`);
}
