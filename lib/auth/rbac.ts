import { db } from '../db';
import { users, roles, permissions, rolePermissions, userRoleTim, timInovator } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createClient } from '../supabase/server';

export type UserProfile = {
  id: string;
  nama: string;
  email: string;
  statusAktif: boolean;
  mustChangePassword?: boolean;
  avatarUrl: string | null;
  globalRoles: string[];
  timRoles: { timId: string; roleCode: string; roleName: string; timNama?: string; timKategori?: string }[];
  hasGlobalScope?: boolean;
};

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return null;

    // Find or create user in public.users table
    let [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);

    if (!dbUser) {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
      [dbUser] = await db.insert(users).values({
        id: user.id,
        nama: fullName,
        email: user.email,
        statusAktif: true,
        mustChangePassword: false,
        avatarUrl: user.user_metadata?.avatar_url || null,
      }).returning();
    }

    // Fetch assigned roles
    const assignments = await db
      .select({
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
        roleScope: roles.scope,
        timId: userRoleTim.timInovatorId,
        timNama: timInovator.namaProyekInovasi,
        timKategori: timInovator.kategoriPia,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .leftJoin(timInovator, eq(userRoleTim.timInovatorId, timInovator.id))
      .where(eq(userRoleTim.userId, dbUser.id));

    const globalRoles = assignments
      .filter(a => a.roleScope === 'global' || !a.timId)
      .map(a => a.roleCode);

    const timRoles = assignments
      .filter(a => a.timId !== null)
      .map(a => ({
        timId: a.timId!,
        roleCode: a.roleCode,
        roleName: a.roleName,
        timNama: a.timNama || undefined,
        timKategori: a.timKategori || undefined,
      }));

    const hasGlobalScope = assignments.some(a => a.roleScope === 'global' || !a.timId);

    return {
      id: dbUser.id,
      nama: dbUser.nama,
      email: dbUser.email,
      statusAktif: dbUser.statusAktif,
      mustChangePassword: dbUser.mustChangePassword ?? false,
      avatarUrl: dbUser.avatarUrl,
      globalRoles,
      timRoles,
      hasGlobalScope,
    };
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}

export async function hasPermission(
  user: UserProfile,
  permissionCode: string,
  timId?: string
): Promise<boolean> {
  // Admin IC has global access
  if (user.globalRoles.includes('admin_ic')) return true;

  // Get active roles for this context
  const activeRoleCodes: string[] = [...user.globalRoles];
  if (timId) {
    user.timRoles
      .filter(tr => tr.timId === timId)
      .forEach(tr => activeRoleCodes.push(tr.roleCode));
  } else {
    // If no specific timId is provided, evaluate all active roles the user has across any team.
    // This allows per_tim roles (e.g. Coach) to execute global actions (like user.manage)
    // if that permission is granted to their role.
    user.timRoles.forEach(tr => {
      if (!activeRoleCodes.includes(tr.roleCode)) {
        activeRoleCodes.push(tr.roleCode);
      }
    });
  }

  if (activeRoleCodes.length === 0) return false;

  const roleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.kodeRole, activeRoleCodes));

  if (roleRows.length === 0) return false;
  const roleIds = roleRows.map(r => r.id);

  const [perm] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.kodePermission, permissionCode))
    .limit(1);

  if (!perm) return false;

  const allowed = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        inArray(rolePermissions.roleId, roleIds),
        eq(rolePermissions.permissionId, perm.id),
        eq(rolePermissions.diizinkan, true)
      )
    );

  return allowed.length > 0;
}

/**
 * Menentukan cakupan (scope) izin pengguna untuk kode permission tertentu:
 * - 'global': User memiliki izin melalui role ber-scope 'global' (atau admin_ic). Berlaku lintas tim / seluruh aplikasi.
 * - string[]: Daftar timInovatorId tempat user memiliki izin melalui role ber-scope 'per_tim'. HANYA berlaku di tim tersebut.
 * - null: User tidak memiliki izin ini di scope manapun.
 */
export async function getEffectivePermissionScope(
  user: UserProfile,
  permissionCode: string
): Promise<'global' | string[] | null> {
  if (user.globalRoles.includes('admin_ic')) return 'global';

  const [perm] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.kodePermission, permissionCode))
    .limit(1);

  if (!perm) return null;

  // 1. Cek apakah ada role di globalRoles yang memiliki izin ini
  if (user.globalRoles.length > 0) {
    const globalRoleRows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          inArray(roles.kodeRole, user.globalRoles),
          eq(roles.scope, 'global')
        )
      );

    if (globalRoleRows.length > 0) {
      const allowedGlobal = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            inArray(rolePermissions.roleId, globalRoleRows.map(r => r.id)),
            eq(rolePermissions.permissionId, perm.id),
            eq(rolePermissions.diizinkan, true)
          )
        )
        .limit(1);

      if (allowedGlobal.length > 0) {
        return 'global';
      }
    }
  }

  // 2. Cek apakah ada timRoles yang memiliki izin ini
  if (user.timRoles.length === 0) return null;

  const timRoleCodes = Array.from(new Set(user.timRoles.map(tr => tr.roleCode)));
  const perTimRoleRows = await db
    .select({ id: roles.id, kodeRole: roles.kodeRole })
    .from(roles)
    .where(inArray(roles.kodeRole, timRoleCodes));

  if (perTimRoleRows.length === 0) return null;

  const allowedRp = await db
    .select({ roleId: rolePermissions.roleId })
    .from(rolePermissions)
    .where(
      and(
        inArray(rolePermissions.roleId, perTimRoleRows.map(r => r.id)),
        eq(rolePermissions.permissionId, perm.id),
        eq(rolePermissions.diizinkan, true)
      )
    );

  if (allowedRp.length === 0) return null;

  const allowedRoleIds = new Set(allowedRp.map(rp => rp.roleId));
  const allowedRoleCodes = new Set(
    perTimRoleRows.filter(r => allowedRoleIds.has(r.id)).map(r => r.kodeRole)
  );

  const matchedTimIds = user.timRoles
    .filter(tr => allowedRoleCodes.has(tr.roleCode))
    .map(tr => tr.timId);

  return matchedTimIds.length > 0 ? Array.from(new Set(matchedTimIds)) : null;
}
