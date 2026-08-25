"use server";

import { db } from "@/lib/db";
import { teamMemberCapacity, anggotaTim, kanbanCard, kanbanSubtask } from "@/lib/db/schema";
import { eq, and, sql, gt } from "drizzle-orm";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/db/audit";

export interface MemberCapacityInfo {
  anggotaTimId: string;
  nama: string;
  jabatan: string;
  kapasitasSp: number;
  kapasitasJam?: number;
  isAiSuggested?: boolean;
}

/** Hitung rasio jam per SP dari kartu-kartu yang sudah memiliki subtasks dengan jam terisi */
export async function calculateTeamHoursPerSpRatio(timId: string): Promise<number> {
  try {
    const rows = await db
      .select({
        taskId: kanbanSubtask.taskId,
        totalHours: sql<number>`cast(coalesce(sum(${kanbanSubtask.estimatedHours}), 0) as int)`,
        storyPoint: kanbanCard.storyPoint,
      })
      .from(kanbanSubtask)
      .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          gt(kanbanSubtask.estimatedHours, 0),
          gt(kanbanCard.storyPoint, 0)
        )
      )
      .groupBy(kanbanSubtask.taskId, kanbanCard.storyPoint);

    if (rows.length >= 3) {
      const totalHours = rows.reduce((acc, r) => acc + (r.totalHours || 0), 0);
      const totalSp = rows.reduce((acc, r) => acc + (r.storyPoint || 0), 0);
      if (totalSp > 0 && totalHours > 0) {
        const ratio = totalHours / totalSp;
        return Math.max(2, Math.min(8, Math.round(ratio * 10) / 10));
      }
    }
  } catch (err) {
    console.warn("[calculateTeamHoursPerSpRatio] Failed to calculate ratio, using default 4:", err);
  }

  // Default baseline: ~4 jam / 1 SP (asumsi 60 jam / 4 = 15 SP)
  return 4;
}

/** Ambil kapasitas per anggota tim untuk satu sprint dalam Story Point (SP). Default saran AI ~15 SP. */
export async function getTeamCapacityForSprint(
  timId: string,
  sprintNumber: number
): Promise<MemberCapacityInfo[]> {
  const anggota = await db
    .select({ id: anggotaTim.id, nama: anggotaTim.nama, jabatan: anggotaTim.jabatan })
    .from(anggotaTim)
    .where(eq(anggotaTim.timInovatorId, timId));

  const capacityRecords = await db
    .select()
    .from(teamMemberCapacity)
    .where(
      and(
        eq(teamMemberCapacity.timInovatorId, timId),
        eq(teamMemberCapacity.sprintNumber, sprintNumber)
      )
    );

  const hoursPerSp = await calculateTeamHoursPerSpRatio(timId);
  // Asumsi jam kerja efektif per orang per sprint ~60 jam -> SP = 60 / hoursPerSp
  const suggestedSp = Math.max(8, Math.min(30, Math.round(60 / hoursPerSp)));

  return anggota.map((a) => {
    const record = capacityRecords.find((c) => c.anggotaTimId === a.id);
    const hasManualSp = record?.kapasitasSp !== null && record?.kapasitasSp !== undefined;
    const finalSp = hasManualSp ? record!.kapasitasSp! : suggestedSp;

    return {
      anggotaTimId: a.id,
      nama: a.nama,
      jabatan: a.jabatan,
      kapasitasSp: finalSp,
      kapasitasJam: record?.kapasitasJam ?? 80,
      isAiSuggested: !hasManualSp,
    };
  });
}

/** Simpan/update kapasitas SP seorang anggota untuk sprint tertentu. */
export async function upsertMemberCapacityAction(
  timId: string,
  anggotaTimId: string,
  sprintNumber: number,
  kapasitasSp: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) return { success: false, error: "Forbidden: Tidak ada izin." };
    if (kapasitasSp < 0 || kapasitasSp > 999)
      return { success: false, error: "Kapasitas Story Point harus antara 0-999 SP." };

    await db
      .insert(teamMemberCapacity)
      .values({ timInovatorId: timId, anggotaTimId, sprintNumber, kapasitasSp, kapasitasJam: kapasitasSp * 4 })
      .onConflictDoUpdate({
        target: [teamMemberCapacity.anggotaTimId, teamMemberCapacity.sprintNumber],
        set: { kapasitasSp, kapasitasJam: kapasitasSp * 4, updatedAt: new Date() },
      });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CAPACITY_UPSERT",
      entity: "team_member_capacity",
      entityId: anggotaTimId,
      details: { timId, anggotaTimId, sprintNumber, kapasitasSp },
    });

    revalidatePath(`/tim/${timId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan kapasitas." };
  }
}

/** Total estimasi Story Point per anggota untuk sprint (dari kartu yang sudah di-assign di DB). */
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
