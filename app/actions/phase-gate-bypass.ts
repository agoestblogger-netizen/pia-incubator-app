"use server";

import { db } from "@/lib/db";
import { phaseGateBypassRoleConfig } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { revalidatePath } from "next/cache";

export interface PhaseGateBypassRoleItem {
  id: string;
  roleCode: string;
  roleName: string;
  isBypass: boolean;
}

const DEFAULT_BYPASS_ROLES = [
  { roleCode: "co_creator", roleName: "Co-creator", isBypass: false },
  { roleCode: "coach", roleName: "Innovation Coach", isBypass: false },
  { roleCode: "inisiator", roleName: "Inisiator", isBypass: false },
  { roleCode: "project_owner", roleName: "Project Owner", isBypass: false },
  { roleCode: "sponsor", roleName: "Sponsor", isBypass: false },
  { roleCode: "promotor", roleName: "Promotor", isBypass: false },
  { roleCode: "sme", roleName: "Collaborator / SME", isBypass: false },
  { roleCode: "divisi_ic", roleName: "Divisi IC", isBypass: false },
  { roleCode: "admin_ic", roleName: "Admin IC", isBypass: true },
];

/** Ambil seluruh konfigurasi bypass gerbang CV->MV per role (auto-seed jika kosong). */
export async function getPhaseGateBypassRoleConfigAction(): Promise<PhaseGateBypassRoleItem[]> {
  try {
    let rows = await db
      .select()
      .from(phaseGateBypassRoleConfig)
      .orderBy(asc(phaseGateBypassRoleConfig.roleCode));

    if (rows.length === 0) {
      await db.insert(phaseGateBypassRoleConfig).values(DEFAULT_BYPASS_ROLES).onConflictDoNothing();
      rows = await db
        .select()
        .from(phaseGateBypassRoleConfig)
        .orderBy(asc(phaseGateBypassRoleConfig.roleCode));
    }

    return rows.map((r) => ({
      id: r.id,
      roleCode: r.roleCode,
      roleName: r.roleName,
      isBypass: r.isBypass,
    }));
  } catch (err) {
    console.error("[getPhaseGateBypassRoleConfigAction] Error:", err);
    return DEFAULT_BYPASS_ROLES.map((r, i) => ({
      id: String(i),
      roleCode: r.roleCode,
      roleName: r.roleName,
      isBypass: r.isBypass,
    }));
  }
}

/** Toggle status bypass gerbang CV->MV untuk suatu role. */
export async function togglePhaseGateBypassRoleAction(roleCode: string, isBypass: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const isAdmin =
      user.globalRoles.includes("admin_ic") ||
      user.globalRoles.includes("super_admin") ||
      user.globalRoles.includes("admin");

    if (!isAdmin) {
      return { success: false, error: "Forbidden: Hanya Admin yang dapat mengubah konfigurasi ini." };
    }

    await db
      .insert(phaseGateBypassRoleConfig)
      .values({
        roleCode,
        roleName: DEFAULT_BYPASS_ROLES.find((d) => d.roleCode === roleCode)?.roleName || roleCode,
        isBypass,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: phaseGateBypassRoleConfig.roleCode,
        set: { isBypass, updatedAt: new Date() },
      });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "PHASE_GATE_BYPASS_ROLE_TOGGLE",
      entity: "phase_gate_bypass_role_config",
      entityId: roleCode,
      details: { roleCode, isBypass },
    });

    revalidatePath("/admin/roles");
    revalidatePath("/tim");
    return { success: true };
  } catch (error: any) {
    console.error("[togglePhaseGateBypassRoleAction] Error:", error);
    return { success: false, error: error.message || "Gagal mengubah konfigurasi bypass role." };
  }
}

/**
 * Memeriksa apakah user berhak melewati gerbang fase Market Validation untuk tim tertentu
 * berdasarkan role global atau role tim yang dimiliki user.
 */
export async function canUserBypassMarketValidationGate(
  user: any | null,
  timId: string
): Promise<boolean> {
  if (!user) return false;

  // 1. Admin selalu bypass
  const isAdmin = Boolean(
    user.globalRoles?.some((r: string) => ["super_admin", "admin_ic", "admin"].includes(r))
  );
  if (isAdmin) return true;

  // 2. Kumpulkan seluruh role code aktif milik user untuk tim ini
  const userRoleCodes: string[] = [];

  if (Array.isArray(user.globalRoles)) {
    userRoleCodes.push(...user.globalRoles);
  }

  if (Array.isArray(user.timRoles)) {
    for (const tr of user.timRoles) {
      if (tr.timId === timId && tr.roleCode) {
        userRoleCodes.push(tr.roleCode);
      }
    }
  }

  if (userRoleCodes.length === 0) return false;

  try {
    const bypassConfigs = await db
      .select({ roleCode: phaseGateBypassRoleConfig.roleCode, isBypass: phaseGateBypassRoleConfig.isBypass })
      .from(phaseGateBypassRoleConfig)
      .where(
        inArray(phaseGateBypassRoleConfig.roleCode, userRoleCodes)
      );

    return bypassConfigs.some((cfg) => cfg.isBypass === true);
  } catch (err) {
    console.error("[canUserBypassMarketValidationGate] Error querying bypass config:", err);
    return false;
  }
}
