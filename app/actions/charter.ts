"use server";

import { db } from "@/lib/db";
import { charter, roles, userRoleTim, anggotaTim, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export type RoleAssignmentItem = {
  roleCode: 'sponsor' | 'promotor' | 'project_owner' | 'inisiator' | 'co_creator' | 'coach' | 'sme';
  userId: string | null;
  userName?: string;
  userEmail?: string;
  jabatan: string;
  unitKerja: string;
};

export async function getCharterByTimId(timId: string) {
  const [data] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
  return data || null;
}

export async function getCharterRolesData(timId: string) {
  try {
    const allRoles = await db.select().from(roles);
    const existingAssignments = await db
      .select({
        id: userRoleTim.id,
        roleId: userRoleTim.roleId,
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
        userId: userRoleTim.userId,
        userName: users.nama,
        userEmail: users.email,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .innerJoin(users, eq(userRoleTim.userId, users.id))
      .where(eq(userRoleTim.timInovatorId, timId));

    const existingAnggota = await db
      .select()
      .from(anggotaTim)
      .where(eq(anggotaTim.timInovatorId, timId));

    return {
      success: true,
      roles: allRoles,
      assignments: existingAssignments,
      anggotaTim: existingAnggota,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat data role tim.' };
  }
}

export async function saveCharterAction(
  timId: string,
  values: Partial<typeof charter.$inferInsert>,
  roleAssignments?: RoleAssignmentItem[]
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'charter.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Innovation Charter tim ini.',
      };
    }

    // 1. Save or update Charter
    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
    let charterId = existing?.id;

    if (existing) {
      await db.update(charter).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(charter.id, existing.id));
    } else {
      const [inserted] = await db.insert(charter).values({
        timInovatorId: timId,
        ...values,
      }).returning();
      charterId = inserted.id;
    }

    // 2. Process Role & Accountability Assignments if provided
    if (Array.isArray(roleAssignments) && roleAssignments.length > 0) {
      const allRoles = await db.select().from(roles);
      const roleMap = new Map(allRoles.map((r) => [r.kodeRole, r]));

      for (const item of roleAssignments) {
        const targetRole = roleMap.get(item.roleCode);
        if (!targetRole) continue;

        // A. Remove existing user_role_tim for this (timInovatorId, roleId)
        await db
          .delete(userRoleTim)
          .where(
            and(
              eq(userRoleTim.timInovatorId, timId),
              eq(userRoleTim.roleId, targetRole.id)
            )
          );

        // B. If a user is assigned
        if (item.userId) {
          // Verify user in db
          const [assignedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, item.userId))
            .limit(1);

          if (assignedUser) {
            // Insert user_role_tim
            await db
              .insert(userRoleTim)
              .values({
                userId: item.userId,
                roleId: targetRole.id,
                timInovatorId: timId,
              })
              .onConflictDoNothing();

            // Upsert anggota_tim record
            const [existingAnggota] = await db
              .select()
              .from(anggotaTim)
              .where(
                and(
                  eq(anggotaTim.timInovatorId, timId),
                  eq(anggotaTim.userId, item.userId)
                )
              )
              .limit(1);

            if (existingAnggota) {
              await db
                .update(anggotaTim)
                .set({
                  nama: assignedUser.nama,
                  jabatan: item.jabatan || existingAnggota.jabatan || targetRole.namaRole,
                  unitKerja: item.unitKerja || existingAnggota.unitKerja || 'PT Pegadaian',
                  komitmenDukungan: `Role: ${targetRole.namaRole}`,
                  updatedAt: new Date(),
                })
                .where(eq(anggotaTim.id, existingAnggota.id));
            } else {
              await db.insert(anggotaTim).values({
                timInovatorId: timId,
                userId: item.userId,
                nama: assignedUser.nama,
                jabatan: item.jabatan || targetRole.namaRole,
                unitKerja: item.unitKerja || 'PT Pegadaian',
                komitmenDukungan: `Role: ${targetRole.namaRole}`,
              });
            }
          }
        }
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_SAVE',
      entity: 'charter',
      entityId: charterId,
      details: {
        timId,
        projectMission: values.projectMission,
        rolesCount: roleAssignments?.length || 0,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/admin/roles`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan Charter.' };
  }
}
