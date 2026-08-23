"use server";

import { db } from "@/lib/db";
import { charter, roles, userRoleTim, anggotaTim, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export type RoleAssignmentItem = {
  id?: string; // local temporary id for UI list keys
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
    if (Array.isArray(roleAssignments)) {
      const allRoles = await db.select().from(roles);
      const roleMap = new Map(allRoles.map((r) => [r.kodeRole, r]));

      const standardRoleCodes: RoleAssignmentItem['roleCode'][] = [
        'sponsor',
        'promotor',
        'project_owner',
        'inisiator',
        'co_creator',
        'coach',
        'sme',
      ];

      const allActiveUserIds = new Set<string>();

      for (const roleCode of standardRoleCodes) {
        const targetRole = roleMap.get(roleCode);
        if (!targetRole) continue;

        const submittedItems = roleAssignments.filter(
          (r) => r.roleCode === roleCode && r.userId
        );

        // Delete existing user_role_tim assignments for this role in this team
        await db
          .delete(userRoleTim)
          .where(
            and(
              eq(userRoleTim.timInovatorId, timId),
              eq(userRoleTim.roleId, targetRole.id)
            )
          );

        for (const item of submittedItems) {
          if (!item.userId) continue;
          allActiveUserIds.add(item.userId);

          const [assignedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, item.userId))
            .limit(1);

          if (assignedUser) {
            await db
              .insert(userRoleTim)
              .values({
                userId: item.userId,
                roleId: targetRole.id,
                timInovatorId: timId,
              })
              .onConflictDoNothing();

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

      // Clean up anggota_tim rows for users no longer assigned to ANY role in this team
      const existingTeamAnggota = await db
        .select()
        .from(anggotaTim)
        .where(eq(anggotaTim.timInovatorId, timId));

      for (const ang of existingTeamAnggota) {
        if (ang.userId && !allActiveUserIds.has(ang.userId)) {
          await db.delete(anggotaTim).where(eq(anggotaTim.id, ang.id));
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

export async function approveCharterAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'charter.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Hanya Promotor inovasi yang memiliki izin menyetujui Innovation Charter tim ini.',
      };
    }

    const [existingCharter] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!existingCharter) {
      return {
        success: false,
        error: 'Innovation Charter belum disimpan oleh tim. Silakan simpan draf terlebih dahulu sebelum disetujui.',
      };
    }

    // Get user's jabatan and unitKerja from anggotaTim if available
    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(
        and(
          eq(anggotaTim.timInovatorId, timId),
          eq(anggotaTim.userId, user.id)
        )
      )
      .limit(1);

    const approvalData = {
      userId: user.id,
      nama: user.nama,
      jabatan: anggota?.jabatan || 'Promotor Inovasi',
      unit: anggota?.unitKerja || 'PT Pegadaian',
      tanggal: new Date().toISOString(),
      status: 'approved',
    };

    await db
      .update(charter)
      .set({
        ttdDisetujui: approvalData,
        updatedAt: new Date(),
      })
      .where(eq(charter.id, existingCharter.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_APPROVE',
      entity: 'charter',
      entityId: existingCharter.id,
      details: {
        timId,
        approvedBy: user.nama,
        email: user.email,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true, ttdDisetujui: approvalData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyetujui Innovation Charter.' };
  }
}

export async function revokeCharterApprovalAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'charter.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk membatalkan persetujuan Innovation Charter tim ini.',
      };
    }

    const [existingCharter] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!existingCharter) {
      return { success: false, error: 'Innovation Charter tidak ditemukan.' };
    }

    await db
      .update(charter)
      .set({
        ttdDisetujui: null,
        updatedAt: new Date(),
      })
      .where(eq(charter.id, existingCharter.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_REVOKE_APPROVAL',
      entity: 'charter',
      entityId: existingCharter.id,
      details: {
        timId,
        revokedBy: user.nama,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan persetujuan Innovation Charter.' };
  }
}
