import { getCurrentUser } from "@/lib/auth/rbac";
import { getMyTasks } from "@/app/actions/tasks";
import { TugasClient } from "./TugasClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TugasPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const summary = await getMyTasks(user);

  return <TugasClient initialSummary={summary} />;
}
