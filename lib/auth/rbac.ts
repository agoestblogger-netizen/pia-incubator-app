import { cache } from 'react';
import { db } from '../db';
import { users, roles, permissions, rolePermissions, userRoleTim, timInovator } from '../db/schema';
import { eq } from 'drizzle-orm';
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

export const getCurrentUser = cache(async function getCurrentUser(): Promise<UserProfile | null> {
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
});

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory RBAC Matrix Cache (High-Performance Permission Resolution)
// Menghilangkan puluhan query redundan per-request untuk akun non-admin
// ─────────────────────────────────────────────────────────────────────────────
type RbacMatrixCache = {
  allowedSet: Set<string>; // "roleCode:permissionCode"
  globalRolesWithPerm: Map<string, Set<string>>; // permissionCode -> Set<roleCode>
  perTimRolesWithPerm: Map<string, Set<string>>; // permissionCode -> Set<roleCode>
  timestamp: number;
};

let cachedMatrix: RbacMatrixCache | null = null;
let matrixFetchPromise: Promise<RbacMatrixCache> | null = null;

const MATRIX_CACHE_TTL_MS = 60 * 1000; // 60 detik

export function invalidateRbacMatrixCache() {
  cachedMatrix = null;
  matrixFetchPromise = null;
}

async function getRbacMatrix(): Promise<RbacMatrixCache> {
  const now = Date.now();
  if (cachedMatrix && now - cachedMatrix.timestamp < MATRIX_CACHE_TTL_MS) {
    return cachedMatrix;
  }

  if (matrixFetchPromise) {
    return matrixFetchPromise;
  }

  matrixFetchPromise = (async () => {
    try {
      const matrixRows = await db
        .select({
          roleCode: roles.kodeRole,
          roleScope: roles.scope,
          permissionCode: permissions.kodePermission,
          diizinkan: rolePermissions.diizinkan,
        })
        .from(rolePermissions)
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

      const allowedSet = new Set<string>();
      const globalRolesWithPerm = new Map<string, Set<string>>();
      const perTimRolesWithPerm = new Map<string, Set<string>>();

      for (const row of matrixRows) {
        if (row.diizinkan) {
          allowedSet.add(`${row.roleCode}:${row.permissionCode}`);

          if (row.roleScope === 'global') {
            if (!globalRolesWithPerm.has(row.permissionCode)) {
              globalRolesWithPerm.set(row.permissionCode, new Set());
            }
            globalRolesWithPerm.get(row.permissionCode)!.add(row.roleCode);
          } else {
            if (!perTimRolesWithPerm.has(row.permissionCode)) {
              perTimRolesWithPerm.set(row.permissionCode, new Set());
            }
            perTimRolesWithPerm.get(row.permissionCode)!.add(row.roleCode);
          }
        }
      }

      const result: RbacMatrixCache = {
        allowedSet,
        globalRolesWithPerm,
        perTimRolesWithPerm,
        timestamp: Date.now(),
      };
      cachedMatrix = result;
      return result;
    } finally {
      matrixFetchPromise = null;
    }
  })();

  return matrixFetchPromise;
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

  const matrix = await getRbacMatrix();
  return activeRoleCodes.some(rc => matrix.allowedSet.has(`${rc}:${permissionCode}`));
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

  const matrix = await getRbacMatrix();

  // 1. Cek apakah ada role di globalRoles yang memiliki izin ini
  const globalRolesForPerm = matrix.globalRolesWithPerm.get(permissionCode);
  if (globalRolesForPerm && user.globalRoles.some(r => globalRolesForPerm.has(r))) {
    return 'global';
  }

  // 2. Cek apakah ada timRoles yang memiliki izin ini
  if (user.timRoles.length === 0) return null;

  const perTimRolesForPerm = matrix.perTimRolesWithPerm.get(permissionCode);
  if (!perTimRolesForPerm) return null;

  const matchedTimIds = user.timRoles
    .filter(tr => perTimRolesForPerm.has(tr.roleCode))
    .map(tr => tr.timId);

  return matchedTimIds.length > 0 ? Array.from(new Set(matchedTimIds)) : null;
}
