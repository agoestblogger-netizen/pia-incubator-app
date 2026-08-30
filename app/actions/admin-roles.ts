"use server";

import { db } from "@/lib/db";
import { roles, permissions, rolePermissions, users, userRoleTim, timInovator } from "@/lib/db/schema";
import { eq, and, ne, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

const SYSTEM_DEFAULT_ROLE_CODES = [
  'admin_ic',
  'divisi_ic',
  'sponsor',
  'promotor',
  'project_owner',
  'inisiator',
  'co_creator',
  'coach',
  'sme',
];

export async function getRbacMatrixData() {
  const allRoles = await db.select().from(roles).orderBy(roles.createdAt);
  const allPermissions = await db.select().from(permissions);
  const allRolePermissions = await db.select().from(rolePermissions);
  const allUsers = await db.select().from(users);
  const allTeams = await db.select({ id: timInovator.id, nama: timInovator.namaProyekInovasi }).from(timInovator);
  
  const allUserRoles = await db
    .select({
      id: userRoleTim.id,
      userId: userRoleTim.userId,
      roleId: userRoleTim.roleId,
      timInovatorId: userRoleTim.timInovatorId,
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
    teams: allTeams,
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

export async function assignUserRoleTimAction(data: {
  userId: string;
  roleId: string;
  timInovatorId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat menetapkan role pengguna ke tim.',
      };
    }

    const [targetRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, data.roleId))
      .limit(1);

    if (!targetRole) {
      return { success: false, error: 'Role yang dipilih tidak valid.' };
    }

    let finalTimId: string | null = data.timInovatorId || null;
    if (targetRole.scope === 'per_tim') {
      if (!finalTimId) {
        return {
          success: false,
          error: `Role "${targetRole.namaRole}" berscope "per_tim", wajib memilih Tim Inovator sasaran.`,
        };
      }
    } else {
      finalTimId = null;
    }

    // Cek duplikasi
    const duplicateConditions = [
      eq(userRoleTim.userId, data.userId),
      eq(userRoleTim.roleId, data.roleId),
    ];
    if (finalTimId) {
      duplicateConditions.push(eq(userRoleTim.timInovatorId, finalTimId));
    }

    const [duplicate] = await db
      .select()
      .from(userRoleTim)
      .where(and(...duplicateConditions))
      .limit(1);

    if (duplicate) {
      return {
        success: false,
        error: `Pengguna ini sudah memiliki penugasan role "${targetRole.namaRole}" untuk ${finalTimId ? 'tim yang dipilih' : 'scope global'}.`,
      };
    }

    const [inserted] = await db.insert(userRoleTim).values({
      userId: data.userId,
      roleId: data.roleId,
      timInovatorId: finalTimId,
    }).returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'USER_ROLE_ASSIGN',
      entity: 'user_role_tim',
      entityId: inserted.id,
      details: { targetUserId: data.userId, roleId: data.roleId, timInovatorId: finalTimId },
    });

    revalidatePath('/admin/roles');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menetapkan role pengguna.' };
  }
}

export async function updateUserRoleTimAction(data: {
  assignmentId: string;
  roleId: string;
  timInovatorId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat mengubah penugasan role.',
      };
    }

    // 1. Cek assignment yang ada
    const [existingAssignment] = await db
      .select()
      .from(userRoleTim)
      .where(eq(userRoleTim.id, data.assignmentId))
      .limit(1);

    if (!existingAssignment) {
      return { success: false, error: 'Data penugasan role tidak ditemukan.' };
    }

    // 2. Ambil informasi role baru
    const [targetRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, data.roleId))
      .limit(1);

    if (!targetRole) {
      return { success: false, error: 'Role yang dipilih tidak valid.' };
    }

    // 3. Validasi scope vs timInovatorId
    let finalTimId: string | null = data.timInovatorId || null;
    if (targetRole.scope === 'per_tim') {
      if (!finalTimId) {
        return {
          success: false,
          error: `Role "${targetRole.namaRole}" berscope "per_tim", wajib memilih Tim Inovator sasaran.`,
        };
      }
    } else {
      // Role scope global -> timInovatorId dikunci null
      finalTimId = null;
    }

    // 4. Cek duplikasi: jangan sampai user sudah punya role yang sama di tim yang sama di baris lain
    const duplicateConditions = [
      eq(userRoleTim.userId, existingAssignment.userId),
      eq(userRoleTim.roleId, data.roleId),
      ne(userRoleTim.id, data.assignmentId),
    ];
    if (finalTimId) {
      duplicateConditions.push(eq(userRoleTim.timInovatorId, finalTimId));
    }

    const [duplicate] = await db
      .select()
      .from(userRoleTim)
      .where(and(...duplicateConditions))
      .limit(1);

    if (duplicate) {
      return {
        success: false,
        error: `Pengguna ini sudah memiliki penugasan role "${targetRole.namaRole}" untuk ${finalTimId ? 'tim yang dipilih' : 'scope global'}.`,
      };
    }

    // 5. Update assignment
    const [updated] = await db
      .update(userRoleTim)
      .set({
        roleId: data.roleId,
        timInovatorId: finalTimId,
        updatedAt: new Date(),
      })
      .where(eq(userRoleTim.id, data.assignmentId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'USER_ROLE_UPDATE',
      entity: 'user_role_tim',
      entityId: data.assignmentId,
      details: {
        targetUserId: existingAssignment.userId,
        oldRoleId: existingAssignment.roleId,
        oldTimId: existingAssignment.timInovatorId,
        newRoleId: data.roleId,
        newTimId: finalTimId,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui penugasan role pengguna.' };
  }
}

export async function removeUserRoleTimAction(userRoleTimId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat menghapus penugasan role.',
      };
    }

    await db.delete(userRoleTim).where(eq(userRoleTim.id, userRoleTimId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'USER_ROLE_REMOVE',
      entity: 'user_role_tim',
      entityId: userRoleTimId,
      details: { userRoleTimId },
    });

    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus penugasan role.' };
  }
}

export async function createCustomRoleAction(data: {
  namaRole: string;
  scope: 'global' | 'per_tim';
  deskripsi?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat membuat role baru.',
      };
    }

    const trimmedNama = (data.namaRole || '').trim();
    if (!trimmedNama) {
      return { success: false, error: 'Nama role wajib diisi.' };
    }

    // Generate kode role
    let baseCode = trimmedNama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!baseCode) baseCode = 'custom_role';

    // Check uniqueness
    const [existingCode] = await db.select().from(roles).where(eq(roles.kodeRole, baseCode)).limit(1);
    const finalCode = existingCode ? `${baseCode}_${Math.random().toString(36).substring(2, 6)}` : baseCode;

    const [newRole] = await db
      .insert(roles)
      .values({
        namaRole: trimmedNama,
        kodeRole: finalCode,
        scope: data.scope || 'per_tim',
        deskripsi: data.deskripsi || `Role kustom ${trimmedNama}`,
        isDefault: false,
      })
      .returning();

    // Default all permissions to false
    const allPerms = await db.select().from(permissions);
    for (const p of allPerms) {
      await db.insert(rolePermissions).values({
        roleId: newRole.id,
        permissionId: p.id,
        diizinkan: false,
      });
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ROLE_CREATE',
      entity: 'roles',
      entityId: newRole.id,
      details: {
        namaRole: newRole.namaRole,
        kodeRole: newRole.kodeRole,
        scope: newRole.scope,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, role: newRole };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat role kustom baru.' };
  }
}

export async function deleteCustomRoleAction(roleId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'user.manage');
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Khusus Admin Innovation Center yang dapat menghapus role.',
      };
    }

    const [targetRole] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!targetRole) {
      return { success: false, error: 'Role tidak ditemukan.' };
    }

    if (targetRole.isDefault || SYSTEM_DEFAULT_ROLE_CODES.includes(targetRole.kodeRole)) {
      return {
        success: false,
        error: `Role bawaan sistem "${targetRole.namaRole}" tidak dapat dihapus.`,
      };
    }

    // Smart check: is this role assigned to any user?
    const [assignedCountRes] = await db
      .select({ count: count() })
      .from(userRoleTim)
      .where(eq(userRoleTim.roleId, roleId));

    const assignedCount = Number(assignedCountRes?.count || 0);
    if (assignedCount > 0) {
      return {
        success: false,
        error: `Role "${targetRole.namaRole}" sedang ditugaskan kepada ${assignedCount} pengguna. Hapus penugasan pengguna terkait terlebih dahulu sebelum menghapus role ini.`,
      };
    }

    // Delete role_permissions first, then role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'ROLE_DELETE',
      entity: 'roles',
      entityId: roleId,
      details: {
        namaRole: targetRole.namaRole,
        kodeRole: targetRole.kodeRole,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, message: `Role "${targetRole.namaRole}" berhasil dihapus permanen.` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus role.' };
  }
}
