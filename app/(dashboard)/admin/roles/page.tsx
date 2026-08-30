import { getRbacMatrixData } from "@/app/actions/admin-roles";
import { getSprintCapacityRoleConfigAction } from "@/app/actions/sprint-role-config";
import { getPhaseGateBypassRoleConfigAction } from "@/app/actions/phase-gate-bypass";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { RolesClient } from "./RolesClient";
import { ShieldCheck } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, "user.manage"))) {
    redirect("/dashboard");
  }

  const [data, sprintRoleConfigs, phaseGateBypassConfigs, canCreateUser, canEditName] = await Promise.all([
    getRbacMatrixData(),
    getSprintCapacityRoleConfigAction(),
    getPhaseGateBypassRoleConfigAction(),
    hasPermission(user, "user.create"),
    hasPermission(user, "user.edit_name"),
  ]);

  const canManageUsers = await hasPermission(user, "user.manage");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#9C7A2E]" />
          <h1 className="text-2xl font-bold text-gray-900">
            Panel RBAC & Pengelolaan Hak Akses Role
          </h1>
        </div>
        <p className="text-xs text-gray-500">
          Atur matriks izin per modul untuk 8 default roles (Admin, Sponsor, Promotor, PO, Inisiator, Co-creator, Coach, SME)
        </p>
      </div>

      <RolesClient
        initialData={{
          ...data,
          sprintRoleConfigs,
          phaseGateBypassConfigs,
          canManageUsers,
          canCreateUser: canManageUsers || canCreateUser,
          canEditName: canManageUsers || canEditName,
        }}
      />
    </div>
  );
}
