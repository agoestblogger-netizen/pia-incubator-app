import { db } from '../db';
import { users, roles, permissions, rolePermissions, userRoleTim } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createClient } from '../supabase/server';

export type UserProfile = {
  id: string;
  nama: string;
  email: string;
  statusAktif: boolean;
  avatarUrl: string | null;
  globalRoles: string[];
  timRoles: { timId: string; roleCode: string; roleName: string }[];
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
        avatarUrl: user.user_metadata?.avatar_url || null,
      }).returning();
    }

    // Fetch assigned roles
    const assignments = await db
      .select({
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
        timId: userRoleTim.timInovatorId,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .where(eq(userRoleTim.userId, dbUser.id));

    const globalRoles = assignments
      .filter(a => !a.timId)
      .map(a => a.roleCode);

    const timRoles = assignments
      .filter(a => a.timId !== null)
      .map(a => ({
        timId: a.timId!,
        roleCode: a.roleCode,
        roleName: a.roleName,
      }));

    return {
      id: dbUser.id,
      nama: dbUser.nama,
      email: dbUser.email,
      statusAktif: dbUser.statusAktif,
      avatarUrl: dbUser.avatarUrl,
      globalRoles,
      timRoles,
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
