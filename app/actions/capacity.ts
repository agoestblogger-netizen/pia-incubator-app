"use server";

import { db } from "@/lib/db";
import { teamMemberCapacity, anggotaTim, kanbanCard } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/db/audit";

export interface MemberCapacityInfo {
  anggotaTimId: string;
  nama: string;
  jabatan: string;
  kapasitasJam: number; // default 2 jam per orang per sprint (Paket 24a)
  kapasitasSp: number;  // derived/mirror: 1 SP = 1 jam = 60 menit
  isAiSuggested?: boolean;
}

/** Ambil kapasitas per anggota tim untuk satu sprint. Default 2 jam per orang (Paket 24a). */
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

  const DEFAULT_JAM_PER_ORANG = 2; // Paket 24a: Default tetap 2 jam per orang per sprint

  return anggota.map((a) => {
    const record = capacityRecords.find((c) => c.anggotaTimId === a.id);
    const hasManualJam = record?.kapasitasJam !== null && record?.kapasitasJam !== undefined;
    const finalJam = hasManualJam ? record!.kapasitasJam! : DEFAULT_JAM_PER_ORANG;

    return {
      anggotaTimId: a.id,
      nama: a.nama,
      jabatan: a.jabatan,
      kapasitasJam: finalJam,
      kapasitasSp: finalJam,
      isAiSuggested: false,
    };
  });
}

/** Simpan/update kapasitas jam seorang anggota untuk sprint tertentu. */
export async function upsertMemberCapacityAction(
  timId: string,
  anggotaTimId: string,
  sprintNumber: number,
  kapasitasJam: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) return { success: false, error: "Forbidden: Tidak ada izin." };
    if (kapasitasJam < 0 || kapasitasJam > 999)
      return { success: false, error: "Kapasitas jam harus antara 0-999 jam." };

    await db
      .insert(teamMemberCapacity)
      .values({
        timInovatorId: timId,
        anggotaTimId,
        sprintNumber,
        kapasitasJam,
        kapasitasSp: kapasitasJam,
      })
      .onConflictDoUpdate({
        target: [teamMemberCapacity.anggotaTimId, teamMemberCapacity.sprintNumber],
        set: { kapasitasJam, kapasitasSp: kapasitasJam, updatedAt: new Date() },
      });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CAPACITY_UPSERT",
      entity: "team_member_capacity",
      entityId: anggotaTimId,
      details: { timId, anggotaTimId, sprintNumber, kapasitasJam },
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
