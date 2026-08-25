import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TimRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/tim/${resolvedParams.id}/overview`);
}
