'use server';

import { db } from '@/lib/db';
import { users, roles, userRoleTim, timInovator, auditLogs, anggotaTim } from '@/lib/db/schema';
import { eq, ilike, or, desc, count } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/db/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getUsersListAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (!(await hasPermission(currentUser, 'user.view')) && !(await hasPermission(currentUser, 'user.manage')))) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengelola user.' };
  }

  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    // Fetch all userRoleTim assignments
    const assignments = await db
      .select({
        userId: userRoleTim.userId,
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
        timId: userRoleTim.timInovatorId,
        timNama: timInovator.namaProyekInovasi,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .leftJoin(timInovator, eq(userRoleTim.timInovatorId, timInovator.id));

    // Group assignments by userId
    const assignmentsMap = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = assignmentsMap.get(a.userId) || [];
      list.push(a);
      assignmentsMap.set(a.userId, list);
    }

    const result = allUsers.map((u) => {
      const userAssignments = assignmentsMap.get(u.id) || [];
      const timCount = new Set(userAssignments.filter((a) => a.timId).map((a) => a.timId)).size;
      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        statusAktif: u.statusAktif,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt ? u.createdAt.toISOString() : null,
        timCount,
        assignments: userAssignments.map((a) => ({
          roleCode: a.roleCode,
          roleName: a.roleName,
          timId: a.timId,
          timNama: a.timNama || 'Role Global (Tanpa Tim)',
        })),
      };
    });

    return { success: true, users: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat daftar user.' };
  }
}

export async function searchUsersAction(query: string = '') {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
  }

  try {
    const trimmed = query.trim();
    const queryBuilder = db.select({
      id: users.id,
      nama: users.nama,
      email: users.email,
      statusAktif: users.statusAktif,
    }).from(users);

    let userList;
    if (trimmed) {
      userList = await queryBuilder
        .where(
          or(
            ilike(users.nama, `%${trimmed}%`),
            ilike(users.email, `%${trimmed}%`)
          )
        )
        .limit(30);
    } else {
      userList = await queryBuilder.limit(30);
    }

    return { success: true, users: userList };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mencari user.' };
  }
}

export async function createUserAction(data: {
  nama: string;
  email: string;
  password: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
  }

  const isUserAdmin = await hasPermission(currentUser, 'user.manage');
  const isCharterEditor = await hasPermission(currentUser, 'charter.edit');

  if (!isUserAdmin && !isCharterEditor) {
    return { success: false, error: 'Forbidden: Anda tidak memiliki izin untuk membuat user baru.' };
  }

  const nama = (data.nama || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const password = data.password || '';

  if (!nama) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Alamat email tidak valid.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password minimal 6 karakter.' };
  }

  try {
    // Check if user already exists in DB
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return {
        success: false,
        error: `User dengan email ${email} sudah terdaftar di sistem.`,
      };
    }

    // Create user in Supabase Auth Admin API
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: nama,
        full_name: nama,
      },
    });

    if (authError) {
      return {
        success: false,
        error: `Gagal membuat akun autentikasi: ${authError.message}`,
      };
    }

    if (!authData.user) {
      return { success: false, error: 'Supabase Auth tidak mengembalikan data user.' };
    }

    // Insert or update in public.users table
    const [newUser] = await db
      .insert(users)
      .values({
        id: authData.user.id,
        nama,
        email,
        statusAktif: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          id: authData.user.id,
          nama,
          statusAktif: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.nama,
      action: 'USER_CREATE',
      entity: 'users',
      entityId: newUser.id,
      details: {
        createdUserId: newUser.id,
        nama: newUser.nama,
        email: newUser.email,
      },
    });

    revalidatePath('/admin/roles');
    return {
      success: true,
      user: {
        id: newUser.id,
        nama: newUser.nama,
        email: newUser.email,
        statusAktif: newUser.statusAktif,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Terjadi kesalahan saat membuat user baru.',
    };
  }
}

export async function updateUserNameAction(userId: string, nama: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await hasPermission(currentUser, 'user.manage'))) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit data user.' };
  }

  const trimmedNama = (nama || '').trim();
  if (!trimmedNama) {
    return { success: false, error: 'Nama lengkap tidak boleh kosong.' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return { success: false, error: 'User tidak ditemukan.' };
    }

    // Update in users table
    const [updated] = await db
      .update(users)
      .set({
        nama: trimmedNama,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Update Supabase Auth metadata
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          name: trimmedNama,
          full_name: trimmedNama,
        },
      });
    } catch (e: any) {
      console.warn('Supabase Auth metadata update warning:', e.message);
    }

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.nama,
      action: 'USER_UPDATE_NAME',
      entity: 'users',
      entityId: userId,
      details: {
        userId,
        namaLama: targetUser.nama,
        namaBaru: trimmedNama,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, user: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui nama user.' };
  }
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await hasPermission(currentUser, 'user.manage'))) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin me-reset password user.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password baru minimal 6 karakter.' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return { success: false, error: 'User tidak ditemukan.' };
    }

    const supabaseAdmin = createAdminClient();
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (resetError) {
      return { success: false, error: `Gagal me-reset password di auth: ${resetError.message}` };
    }

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.nama,
      action: 'USER_RESET_PASSWORD',
      entity: 'users',
      entityId: userId,
      details: {
        userId,
        email: targetUser.email,
        nama: targetUser.nama,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, message: `Password untuk ${targetUser.nama} berhasil di-reset.` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal me-reset password.' };
  }
}

export async function checkUserReferencesAction(userId: string) {
  try {
    const [auditCountRes] = await db.select({ count: count() }).from(auditLogs).where(eq(auditLogs.userId, userId));
    const [anggotaCountRes] = await db.select({ count: count() }).from(anggotaTim).where(eq(anggotaTim.userId, userId));
    const [roleCountRes] = await db.select({ count: count() }).from(userRoleTim).where(eq(userRoleTim.userId, userId));

    const auditCount = Number(auditCountRes?.count || 0);
    const anggotaCount = Number(anggotaCountRes?.count || 0);
    const roleCount = Number(roleCountRes?.count || 0);
    const totalRefs = auditCount + anggotaCount + roleCount;

    return {
      success: true,
      hasReferences: totalRefs > 0,
      references: {
        auditLogs: auditCount,
        anggotaTim: anggotaCount,
        userRoleTim: roleCount,
        total: totalRefs,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message, hasReferences: true };
  }
}

export async function deleteUserSmartAction(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await hasPermission(currentUser, 'user.manage'))) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus user.' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return { success: false, error: 'User tidak ditemukan.' };
    }

    // Check references in audit_logs, anggota_tim, user_role_tim
    const [auditCountRes] = await db.select({ count: count() }).from(auditLogs).where(eq(auditLogs.userId, userId));
    const [anggotaCountRes] = await db.select({ count: count() }).from(anggotaTim).where(eq(anggotaTim.userId, userId));
    const [roleCountRes] = await db.select({ count: count() }).from(userRoleTim).where(eq(userRoleTim.userId, userId));

    const auditCount = Number(auditCountRes?.count || 0);
    const anggotaCount = Number(anggotaCountRes?.count || 0);
    const roleCount = Number(roleCountRes?.count || 0);
    const totalRefs = auditCount + anggotaCount + roleCount;

    if (totalRefs > 0) {
      // User has references: fallback to soft deactivate
      await db
        .update(users)
        .set({
          statusAktif: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await logAudit({
        userId: currentUser.id,
        userName: currentUser.nama,
        action: 'USER_SOFT_DELETE_FALLBACK',
        entity: 'users',
        entityId: userId,
        details: {
          targetUserId: userId,
          nama: targetUser.nama,
          email: targetUser.email,
          reason: 'User memiliki riwayat aktivitas/tim, otomatis dinonaktifkan.',
          references: {
            auditLogs: auditCount,
            anggotaTim: anggotaCount,
            userRoleTim: roleCount,
          },
        },
      });

      revalidatePath('/admin/roles');
      return {
        success: true,
        mode: 'soft_deleted' as const,
        message: `User ${targetUser.nama} sudah memiliki riwayat aktivitas di sistem (${totalRefs} referensi terkait), sehingga tidak dapat dihapus permanen. Akun otomatis dinonaktifkan sebagai gantinya.`,
      };
    }

    // No references: safe to HARD DELETE
    // Log audit log entry BEFORE hard deleting user
    await logAudit({
      userId: currentUser.id,
      userName: currentUser.nama,
      action: 'USER_HARD_DELETE',
      entity: 'users',
      entityId: userId,
      details: {
        deletedUserId: userId,
        nama: targetUser.nama,
        email: targetUser.email,
        actionType: 'HARD_DELETE_PERMANENT',
      },
    });

    // Delete from public.users table
    await db.delete(users).where(eq(users.id, userId));

    // Delete from Supabase Auth
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (authDelErr: any) {
      console.warn('Supabase Auth deleteUser warning:', authDelErr.message);
    }

    revalidatePath('/admin/roles');
    return {
      success: true,
      mode: 'hard_deleted' as const,
      message: `User ${targetUser.nama} (${targetUser.email}) berhasil dihapus permanen dari sistem.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Terjadi kesalahan saat menghapus user.',
    };
  }
}

export async function toggleUserStatusAction(userId: string, statusAktif: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await hasPermission(currentUser, 'user.manage'))) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengelola status user.' };
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        statusAktif,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return { success: false, error: 'User tidak ditemukan.' };
    }

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.nama,
      action: 'USER_TOGGLE_STATUS',
      entity: 'users',
      entityId: userId,
      details: {
        userId,
        statusAktif,
      },
    });

    revalidatePath('/admin/roles');
    return { success: true, user: updated };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Gagal mengubah status user.',
    };
  }
}
