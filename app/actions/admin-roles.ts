"use server";

import { db } from "@/lib/db";
import { roles, permissions, rolePermissions, users, userRoleTim } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export async function getRbacMatrixData() {
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);
  const allRolePermissions = await db.select().from(rolePermissions);
  const allUsers = await db.select().from(users);
  const allUserRoles = await db
    .select({
      id: userRoleTim.id,
      userId: userRoleTim.userId,
      roleId: userRoleTim.roleId,
      roleName: roles.namaRole,
      roleCode: roles.kodeRole,
      userName: users.nama,
      userEmail: users.email,
    })
    .from(userRoleTim)
    .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
    .innerJoin(users, eq(userRoleTim.userId, users.id));

  return {
    roles: allRoles,
    permissions: allPermissions,
    rolePermissions: allRolePermissions,
    users: allUsers,
    userRoles: allUserRoles,
  };
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, allowed: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat mengubah hak akses role.',
      };
    }

    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
      .limit(1);

    if (existing) {
      await db
        .update(rolePermissions)
        .set({ diizinkan: allowed, updatedAt: new Date() })
        .where(eq(rolePermissions.id, existing.id));
    } else {
      await db.insert(rolePermissions).values({
        roleId,
        permissionId,
        diizinkan: allowed,
      });
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ROLE_PERMISSION_TOGGLE',
      entity: 'role_permissions',
      entityId: `${roleId}_${permissionId}`,
      details: { roleId, permissionId, allowed },
    });

    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah hak akses.' };
  }
}
