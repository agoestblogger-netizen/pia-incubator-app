"use server";

import { db } from "@/lib/db";
import {
  teamMemberCapacity,
  anggotaTim,
  kanbanCard,
  kanbanSubtask,
  sprintCapacityRoleConfig,
  userRoleTim,
  roles,
} from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/db/audit";
import { getSprintCapacityRoleConfigAction } from "./sprint-role-config";

export interface MemberCapacityInfo {
  anggotaTimId: string;
  userId?: string | null;
  nama: string;
  jabatan: string;
  roleCode?: string;
  roleName?: string;
  kapasitasJam: number; // default 2 jam per orang per sprint (Paket 24a)
  kapasitasSp: number; // derived: 1 SP = 60 menit
  kapasitasSubtask: number | null; // Paket 24b: null = tanpa batas, integer = batas subtask
  subtasksCount: number; // jumlah subtask yang diambil di sprint ini
  isIncludedInCapacity: boolean;
}

/** Ambil kapasitas per anggota tim untuk satu sprint (Paket 24a & 24b). */
export async function getTeamCapacityForSprint(
  timId: string,
  sprintNumber: number
): Promise<MemberCapacityInfo[]> {
  const [anggotaList, capacityRecords, roleConfigs, userRolesList] = await Promise.all([
    db.select().from(anggotaTim).where(eq(anggotaTim.timInovatorId, timId)),
    db
      .select()
      .from(teamMemberCapacity)
      .where(
        and(
          eq(teamMemberCapacity.timInovatorId, timId),
          eq(teamMemberCapacity.sprintNumber, sprintNumber)
        )
      ),
    getSprintCapacityRoleConfigAction(),
    db
      .select({
        userId: userRoleTim.userId,
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .where(eq(userRoleTim.timInovatorId, timId)),
  ]);

  // Query jumlah subtask teralokasi per user pada sprint ini (Paket 24b)
  const subtaskCountRows = await db
    .select({
      assigneeUserId: kanbanSubtask.assigneeUserId,
      count: sql<number>`cast(count(${kanbanSubtask.id}) as int)`,
    })
    .from(kanbanSubtask)
    .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
    .where(
      and(
        eq(kanbanCard.timInovatorId, timId),
        eq(kanbanCard.sprintNumber, sprintNumber),
        sql`${kanbanSubtask.assigneeUserId} IS NOT NULL`
      )
    )
    .groupBy(kanbanSubtask.assigneeUserId);

  const subtaskCountMap = new Map<string, number>();
  for (const row of subtaskCountRows) {
    if (row.assigneeUserId) {
      subtaskCountMap.set(row.assigneeUserId, row.count || 0);
    }
  }

  const roleConfigMap = new Map<string, boolean>();
  for (const rc of roleConfigs) {
    roleConfigMap.set(rc.roleCode, rc.isIncluded);
  }

  const DEFAULT_JAM_PER_ORANG = 2;

  return anggotaList.map((a) => {
    const record = capacityRecords.find((c) => c.anggotaTimId === a.id);
    const hasManualJam = record?.kapasitasJam !== null && record?.kapasitasJam !== undefined;
    const finalJam = hasManualJam ? record!.kapasitasJam! : DEFAULT_JAM_PER_ORANG;
    const kapasitasSubtask = record?.kapasitasSubtask ?? null;

    // Tentukan roleCode untuk anggota tim ini
    const userRole = a.userId ? userRolesList.find((ur) => ur.userId === a.userId) : null;
    let determinedRoleCode = userRole?.roleCode || "co_creator";
    let determinedRoleName = userRole?.roleName || "Inovator";

    // Fallback heuristik dari teks jabatan / komitmenDukungan jika belum ada di userRoleTim
    const textToCheck = `${a.jabatan} ${a.komitmenDukungan || ""}`.toLowerCase();
    if (textToCheck.includes("coach")) {
      determinedRoleCode = "coach";
      determinedRoleName = "Innovation Coach";
    } else if (textToCheck.includes("inisiator") || textToCheck.includes("pengusul")) {
      determinedRoleCode = "inisiator";
      determinedRoleName = "Inisiator";
    } else if (textToCheck.includes("project owner") || textToCheck.includes("po")) {
      determinedRoleCode = "project_owner";
      determinedRoleName = "Project Owner";
    } else if (textToCheck.includes("sponsor")) {
      determinedRoleCode = "sponsor";
      determinedRoleName = "Sponsor";
    } else if (textToCheck.includes("promotor")) {
      determinedRoleCode = "promotor";
      determinedRoleName = "Promotor";
    } else if (textToCheck.includes("sme") || textToCheck.includes("collaborator")) {
      determinedRoleCode = "sme";
      determinedRoleName = "Collaborator / SME";
    }

    const isIncluded = roleConfigMap.has(determinedRoleCode)
      ? Boolean(roleConfigMap.get(determinedRoleCode))
      : true; // default true jika tidak terdaftar

    const subtasksCount = a.userId ? subtaskCountMap.get(a.userId) || 0 : 0;

    return {
      anggotaTimId: a.id,
      userId: a.userId,
      nama: a.nama,
      jabatan: a.jabatan,
      roleCode: determinedRoleCode,
      roleName: determinedRoleName,
      kapasitasJam: finalJam,
      kapasitasSp: finalJam,
      kapasitasSubtask,
      subtasksCount,
      isIncludedInCapacity: isIncluded,
    };
  });
}

/** Simpan/update kapasitas (jam dan/atau jumlah subtask) seorang anggota untuk sprint tertentu. */
export async function upsertMemberCapacityAction(
  timId: string,
  anggotaTimId: string,
  sprintNumber: number,
  params: { kapasitasJam?: number; kapasitasSubtask?: number | null }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) return { success: false, error: "Forbidden: Tidak ada izin." };

    const { kapasitasJam = 2, kapasitasSubtask = null } = params;

    if (kapasitasJam < 0 || kapasitasJam > 999)
      return { success: false, error: "Kapasitas jam harus antara 0-999 jam." };
    if (kapasitasSubtask !== null && (kapasitasSubtask < 0 || kapasitasSubtask > 999))
      return { success: false, error: "Kapasitas subtask harus antara 0-999." };

    await db
      .insert(teamMemberCapacity)
      .values({
        timInovatorId: timId,
        anggotaTimId,
        sprintNumber,
        kapasitasJam,
        kapasitasSp: kapasitasJam,
        kapasitasSubtask: kapasitasSubtask === undefined ? null : kapasitasSubtask,
      })
      .onConflictDoUpdate({
        target: [teamMemberCapacity.anggotaTimId, teamMemberCapacity.sprintNumber],
        set: {
          kapasitasJam,
          kapasitasSp: kapasitasJam,
          kapasitasSubtask: kapasitasSubtask === undefined ? null : kapasitasSubtask,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CAPACITY_UPSERT",
      entity: "team_member_capacity",
      entityId: anggotaTimId,
      details: { timId, anggotaTimId, sprintNumber, kapasitasJam, kapasitasSubtask },
    });

    revalidatePath(`/tim/${timId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan kapasitas." };
  }
}

/** Total estimasi Story Point per anggota untuk sprint. */
export async function getSprintWorkloadByAnggota(
  timId: string,
  sprintNumber: number
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      ownerAnggotaId: kanbanCard.ownerAnggotaId,
      totalSp: sql<number>`cast(coalesce(sum(${kanbanCard.storyPoint}), 0) as int)`,
    })
    .from(kanbanCard)
    .where(and(eq(kanbanCard.timInovatorId, timId), eq(kanbanCard.sprintNumber, sprintNumber)))
    .groupBy(kanbanCard.ownerAnggotaId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    if (row.ownerAnggotaId) result[row.ownerAnggotaId] = row.totalSp ?? 0;
  }
  return result;
}
