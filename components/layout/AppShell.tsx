import { Navbar } from "./Navbar";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getMyTasks } from "@/app/actions/tasks";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const tasksSummary = await getMyTasks(user);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar user={user} taskCount={tasksSummary.totalCount} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Innovation Center PT Pegadaian — Program Inkubasi PIA Season 12
      </footer>
    </div>
  );
}
