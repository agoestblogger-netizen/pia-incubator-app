'use server';

import { db } from '@/lib/db';
import { users, roles, userRoleTim, timInovator } from '@/lib/db/schema';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/db/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getUsersListAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await hasPermission(currentUser, 'user.view')) && !(await hasPermission(currentUser, 'user.manage'))) {
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
    let queryBuilder = db.select({
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
