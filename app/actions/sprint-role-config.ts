"use server";

import { db } from "@/lib/db";
import { sprintCapacityRoleConfig } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { revalidatePath } from "next/cache";

export interface SprintRoleConfigItem {
  id: string;
  roleCode: string;
  roleName: string;
  isIncluded: boolean;
}

const DEFAULT_SPRINT_ROLES = [
  { roleCode: "co_creator", roleName: "Inovator / Co-creator", isIncluded: true },
  { roleCode: "coach", roleName: "Innovation Coach", isIncluded: true },
  { roleCode: "inisiator", roleName: "Inisiator", isIncluded: false },
  { roleCode: "project_owner", roleName: "Project Owner", isIncluded: false },
  { roleCode: "sponsor", roleName: "Sponsor", isIncluded: false },
  { roleCode: "promotor", roleName: "Promotor", isIncluded: false },
  { roleCode: "sme", roleName: "Collaborator / SME", isIncluded: false },
  { roleCode: "divisi_ic", roleName: "Divisi IC", isIncluded: false },
  { roleCode: "admin_ic", roleName: "Admin IC", isIncluded: false },
];

/** Ambil seluruh konfigurasi role untuk Kapasitas Sprint Planning (auto-seed jika kosong). */
export async function getSprintCapacityRoleConfigAction(): Promise<SprintRoleConfigItem[]> {
  try {
    let rows = await db
      .select()
      .from(sprintCapacityRoleConfig)
      .orderBy(asc(sprintCapacityRoleConfig.roleCode));

    if (rows.length === 0) {
      await db.insert(sprintCapacityRoleConfig).values(DEFAULT_SPRINT_ROLES).onConflictDoNothing();
      rows = await db
        .select()
        .from(sprintCapacityRoleConfig)
        .orderBy(asc(sprintCapacityRoleConfig.roleCode));
    }

    return rows.map((r) => ({
      id: r.id,
      roleCode: r.roleCode,
      roleName: r.roleName,
      isIncluded: r.isIncluded,
    }));
  } catch (err) {
    console.error("[getSprintCapacityRoleConfigAction] Error:", err);
    return DEFAULT_SPRINT_ROLES.map((r, i) => ({
      id: String(i),
      roleCode: r.roleCode,
      roleName: r.roleName,
      isIncluded: r.isIncluded,
    }));
  }
}

/** Toggle status keikutsertaan role dalam Kapasitas Sprint Planning. */
export async function toggleSprintCapacityRoleAction(roleCode: string, isIncluded: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const isAdmin = user.globalRoles.includes("admin_ic") || user.globalRoles.includes("super_admin");
    if (!isAdmin) {
      return { success: false, error: "Forbidden: Hanya Admin IC yang dapat mengubah konfigurasi ini." };
    }

    await db
      .insert(sprintCapacityRoleConfig)
      .values({
        roleCode,
        roleName: DEFAULT_SPRINT_ROLES.find((d) => d.roleCode === roleCode)?.roleName || roleCode,
        isIncluded,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sprintCapacityRoleConfig.roleCode,
        set: { isIncluded, updatedAt: new Date() },
      });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_CAPACITY_ROLE_TOGGLE",
      entity: "sprint_capacity_role_config",
      entityId: roleCode,
      details: { roleCode, isIncluded },
    });

    revalidatePath("/admin/roles");
    revalidatePath("/tim");
    return { success: true };
  } catch (error: any) {
    console.error("[toggleSprintCapacityRoleAction] Error:", error);
    return { success: false, error: error.message || "Gagal mengubah konfigurasi role." };
  }
}
