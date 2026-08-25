"use server";

import { db } from "@/lib/db";
import { sprint, sprintLog, kanbanCard } from "@/lib/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export async function getSprintsByTimId(timId: string) {
  let list = await db
    .select()
    .from(sprint)
    .where(eq(sprint.timInovatorId, timId))
    .orderBy(asc(sprint.nomorSprint));

  // If no sprints exist yet, initialize 4 default sprints
  if (list.length === 0) {
    const defaultSprints = [
      { timInovatorId: timId, nomorSprint: 1, status: "belum_dimulai", tujuan: "Problem Validation & Setup" },
      { timInovatorId: timId, nomorSprint: 2, status: "belum_dimulai", tujuan: "Solution Exploration & Prototyping" },
      { timInovatorId: timId, nomorSprint: 3, status: "belum_dimulai", tujuan: "MVP Development & Testing" },
      { timInovatorId: timId, nomorSprint: 4, status: "belum_dimulai", tujuan: "Market Validation & Pitch Preparation" },
    ];

    await db.insert(sprint).values(defaultSprints).onConflictDoNothing();

    list = await db
      .select()
      .from(sprint)
      .where(eq(sprint.timInovatorId, timId))
      .orderBy(asc(sprint.nomorSprint));
  }

  return list;
}

export async function saveCharterSprintsAction(
  timId: string,
  sprintRows: Array<{
    nomorSprint: number;
    tanggalMulaiRencana?: string | null;
    tanggalSelesaiRencana?: string | null;
    tujuan?: string | null;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "charter.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit Charter tim ini.",
      };
    }

    for (const row of sprintRows) {
      const [existing] = await db
        .select()
        .from(sprint)
        .where(
          and(
            eq(sprint.timInovatorId, timId),
            eq(sprint.nomorSprint, row.nomorSprint)
          )
        )
        .limit(1);

      const tMulai = row.tanggalMulaiRencana ? new Date(row.tanggalMulaiRencana) : null;
      const tSelesai = row.tanggalSelesaiRencana ? new Date(row.tanggalSelesaiRencana) : null;

      if (existing) {
        await db
          .update(sprint)
          .set({
            tanggalMulaiRencana: tMulai,
            tanggalSelesaiRencana: tSelesai,
            tujuan: row.tujuan || existing.tujuan,
            updatedAt: new Date(),
          })
          .where(eq(sprint.id, existing.id));
      } else {
        await db.insert(sprint).values({
          timInovatorId: timId,
          nomorSprint: row.nomorSprint,
          tanggalMulaiRencana: tMulai,
          tanggalSelesaiRencana: tSelesai,
          tujuan: row.tujuan,
          status: "belum_dimulai",
        });
      }
    }

    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan data milestone sprint." };
  }
}

export async function updateSprintCountAction(
  timId: string,
  targetCount: number,
  alasan: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    if (!alasan || !alasan.trim()) {
      return { success: false, error: "Alasan perubahan jumlah sprint wajib diisi." };
    }

    if (targetCount < 1) {
      return { success: false, error: "Jumlah sprint minimal 1." };
    }

    const currentSprints = await getSprintsByTimId(timId);
    const jumlahLama = currentSprints.length;
    const jumlahBaru = targetCount;

    if (jumlahLama === jumlahBaru) {
      return { success: true, message: "Jumlah sprint tidak berubah." };
    }

    if (jumlahBaru > jumlahLama) {
      // Add sprints
      const toAdd = [];
      for (let num = jumlahLama + 1; num <= jumlahBaru; num++) {
        toAdd.push({
          timInovatorId: timId,
          nomorSprint: num,
          status: "belum_dimulai",
          tujuan: `Sprint ${num}`,
        });
      }
      if (toAdd.length > 0) {
        await db.insert(sprint).values(toAdd).onConflictDoNothing();
      }
    } else {
      // Reduce sprints: reassign cards in removed sprints to Backlog (sprint_number = null)
      const removedSprintNumbers: number[] = [];
      for (let num = jumlahBaru + 1; num <= jumlahLama; num++) {
        removedSprintNumbers.push(num);
      }

      if (removedSprintNumbers.length > 0) {
        await db
          .update(kanbanCard)
          .set({ sprintNumber: null, updatedAt: new Date() })
          .where(
            and(
              eq(kanbanCard.timInovatorId, timId),
              inArray(kanbanCard.sprintNumber, removedSprintNumbers)
            )
          );

        for (const num of removedSprintNumbers) {
          await db
            .delete(sprint)
            .where(
              and(
                eq(sprint.timInovatorId, timId),
                eq(sprint.nomorSprint, num)
              )
            );
        }
      }
    }

    // Log to sprint_log
    await db.insert(sprintLog).values({
      timInovatorId: timId,
      jumlahLama,
      jumlahBaru,
      alasan: alasan.trim(),
      diubahOleh: user.nama || user.email,
      tanggalPerubahan: new Date(),
    });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_COUNT_CHANGE",
      entity: "sprint",
      entityId: timId,
      details: { timId, jumlahLama, jumlahBaru, alasan },
    });

    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengubah jumlah sprint." };
  }
}

export async function startSprintAction(
  timId: string,
  sprintId: string,
  cardAssignments?: Array<{
    cardId: string;
    storyPoint?: number | null;
    estimasiJam?: number | null;
    ownerAnggotaId?: string | null;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengelola sprint tim ini.",
      };
    }

    // Check if another sprint is currently active
    const [activeSprint] = await db
      .select()
      .from(sprint)
      .where(and(eq(sprint.timInovatorId, timId), eq(sprint.status, "aktif")))
      .limit(1);

    if (activeSprint && activeSprint.id !== sprintId) {
      return {
        success: false,
        error: `Sprint ${activeSprint.nomorSprint} saat ini masih aktif. Selesaikan Sprint ${activeSprint.nomorSprint} terlebih dahulu sebelum memulai sprint baru.`,
      };
    }

    const [targetSprint] = await db
      .select()
      .from(sprint)
      .where(eq(sprint.id, sprintId))
      .limit(1);

    if (!targetSprint) {
      return { success: false, error: "Sprint tidak ditemukan." };
    }

    // Update target sprint status
    await db
      .update(sprint)
      .set({
        status: "aktif",
        tanggalMulaiAktual: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sprint.id, sprintId));

    // Update card assignments if provided
    if (cardAssignments && cardAssignments.length > 0) {
      for (const item of cardAssignments) {
        const updateData: any = {
          sprintNumber: targetSprint.nomorSprint,
          updatedAt: new Date(),
        };
        if (item.storyPoint !== undefined) updateData.storyPoint = item.storyPoint;
        if (item.estimasiJam !== undefined) updateData.estimasiJam = item.estimasiJam;
        if (item.ownerAnggotaId !== undefined) updateData.ownerAnggotaId = item.ownerAnggotaId;

        await db
          .update(kanbanCard)
          .set(updateData)
          .where(and(eq(kanbanCard.id, item.cardId), eq(kanbanCard.timInovatorId, timId)));
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_START",
      entity: "sprint",
      entityId: sprintId,
      details: {
        timId,
        nomorSprint: targetSprint.nomorSprint,
        cardsCount: cardAssignments?.length || 0,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memulai sprint." };
  }
}

export async function completeSprintAction(
  timId: string,
  sprintId: string,
  cardMovements?: Array<{ cardId: string; destination: "backlog" | "next_sprint"; nextSprintNumber?: number | null }>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk menyelesaikan sprint tim ini.",
      };
    }

    const [targetSprint] = await db
      .select()
      .from(sprint)
      .where(eq(sprint.id, sprintId))
      .limit(1);

    if (!targetSprint) {
      return { success: false, error: "Sprint tidak ditemukan." };
    }

    // Move incomplete cards if specified
    if (cardMovements && cardMovements.length > 0) {
      for (const mov of cardMovements) {
        const newSprintNumber = mov.destination === "next_sprint" ? mov.nextSprintNumber : null;
        await db
          .update(kanbanCard)
          .set({
            sprintNumber: newSprintNumber || null,
            updatedAt: new Date(),
          })
          .where(eq(kanbanCard.id, mov.cardId));
      }
    }

    // Set sprint status to selesai
    await db
      .update(sprint)
      .set({
        status: "selesai",
        tanggalSelesaiAktual: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sprint.id, sprintId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_COMPLETE",
      entity: "sprint",
      entityId: sprintId,
      details: { timId, nomorSprint: targetSprint.nomorSprint, cardMovementsCount: cardMovements?.length || 0 },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyelesaikan sprint." };
  }
}

export async function getSprintLogs(timId: string) {
  return await db
    .select()
    .from(sprintLog)
    .where(eq(sprintLog.timInovatorId, timId))
    .orderBy(desc(sprintLog.tanggalPerubahan));
}
