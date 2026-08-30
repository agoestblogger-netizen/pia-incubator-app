import { Navbar } from "./Navbar";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { getMyTasks } from "@/app/actions/tasks";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.mustChangePassword) {
    redirect('/ganti-password');
  }

  const [
    tasksSummary,
    canManageUsers,
    canCreateUser,
    canEditUserName,
    canCreateTeam,
    canImport,
    canReset,
  ] = await Promise.all([
    getMyTasks(user),
    hasPermission(user, 'user.manage'),
    hasPermission(user, 'user.create'),
    hasPermission(user, 'user.edit_name'),
    hasPermission(user, 'tim.manage'),
    hasPermission(user, 'import.execute'),
    hasPermission(user, 'system.reset_data'),
  ]);

  const canAccessUserRoles = canManageUsers || canCreateUser || canEditUserName;

  const adminPermissions = {
    canManageUsers,
    canCreateUser,
    canEditUserName,
    canAccessUserRoles,
    canCreateTeam,
    canImport,
    canReset,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar user={user} taskCount={tasksSummary.totalCount} adminPermissions={adminPermissions} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Innovation Center PT Pegadaian (Persero) — Program Inkubasi PIA Season 12
      </footer>
    </div>
  );
}
