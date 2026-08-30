import { getRbacMatrixData } from "@/app/actions/admin-roles";
import { getSprintCapacityRoleConfigAction } from "@/app/actions/sprint-role-config";
import { getPhaseGateBypassRoleConfigAction } from "@/app/actions/phase-gate-bypass";
import { getCurrentUser, getEffectivePermissionScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { userRoleTim, anggotaTim } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RolesClient } from "./RolesClient";
import { ShieldCheck } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [manageScope, createScope, editNameScope] = await Promise.all([
    getEffectivePermissionScope(user, "user.manage"),
    getEffectivePermissionScope(user, "user.create"),
    getEffectivePermissionScope(user, "user.edit_name"),
  ]);

  const canManageUsers = manageScope === "global" || Array.isArray(manageScope);
  const canCreateUser = createScope === "global" || Array.isArray(createScope);
  const canEditName = editNameScope === "global" || Array.isArray(editNameScope);

  const canAccess = canManageUsers || canCreateUser || canEditName;
  if (!canAccess) {
    redirect("/dashboard");
  }

  const isGlobalUserScope = manageScope === "global" || createScope === "global" || editNameScope === "global";

  const [data, sprintRoleConfigs, phaseGateBypassConfigs] = await Promise.all([
    getRbacMatrixData(),
    getSprintCapacityRoleConfigAction(),
    getPhaseGateBypassRoleConfigAction(),
  ]);

  // Jika caller hanya memiliki scope per_tim, filter daftar pengguna hanya tim pemanggil
  let isPerTimScope = false;
  let callerTimIds: string[] = [];

  if (!isGlobalUserScope) {
    isPerTimScope = true;
    const timIdSet = new Set<string>();
    if (Array.isArray(manageScope)) manageScope.forEach((id) => timIdSet.add(id));
    if (Array.isArray(createScope)) createScope.forEach((id) => timIdSet.add(id));
    if (Array.isArray(editNameScope)) editNameScope.forEach((id) => timIdSet.add(id));
    callerTimIds = Array.from(timIdSet);

    if (callerTimIds.length > 0) {
      const [roleUsers, memberUsers] = await Promise.all([
        db
          .select({ userId: userRoleTim.userId })
          .from(userRoleTim)
          .where(inArray(userRoleTim.timInovatorId, callerTimIds)),
        db
          .select({ userId: anggotaTim.userId })
          .from(anggotaTim)
          .where(inArray(anggotaTim.timInovatorId, callerTimIds)),
      ]);

      const allowedUserIds = new Set<string>([
        user.id,
        ...roleUsers.map((r) => r.userId),
        ...(memberUsers.map((m) => m.userId).filter(Boolean) as string[]),
      ]);

      data.users = (data.users || []).filter((u: any) => allowedUserIds.has(u.id));
    } else {
      data.users = (data.users || []).filter((u: any) => u.id === user.id);
    }
  }

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
          canCreateUser,
          canEditName,
          isPerTimScope,
          callerTimIds,
        }}
      />
    </div>
  );
}
