"use server";

import { db } from "@/lib/db";
import { kanbanCard, kanbanColumn } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export async function getKanbanData(timId: string) {
  const columns = await db
    .select()
    .from(kanbanColumn)
    .where(eq(kanbanColumn.timInovatorId, timId))
    .orderBy(asc(kanbanColumn.urutan));

  const cards = await db
    .select()
    .from(kanbanCard)
    .where(eq(kanbanCard.timInovatorId, timId))
    .orderBy(asc(kanbanCard.urutan));

  return { columns, cards };
}

export async function createKanbanCardAction(timId: string, cardData: Partial<typeof kanbanCard.$inferInsert>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'kanban.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk menambah kartu di Kanban board tim ini.',
      };
    }

    const [card] = await db.insert(kanbanCard).values({
      timInovatorId: timId,
      judul: cardData.judul || 'Kartu Baru',
      deskripsi: cardData.deskripsi,
      statusKolom: cardData.statusKolom || 'To Do',
      tahap: cardData.tahap || 'umum',
      sprintNumber: cardData.sprintNumber,
      label: cardData.label,
      tanggalMulai: cardData.tanggalMulai ? new Date(cardData.tanggalMulai) : null,
      tanggalSelesai: cardData.tanggalSelesai ? new Date(cardData.tanggalSelesai) : null,
      acceptanceCriteria: cardData.acceptanceCriteria,
      dependencyRisiko: cardData.dependencyRisiko,
      urutan: cardData.urutan || 0,
    }).returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'KANBAN_CARD_CREATE',
      entity: 'kanban_card',
      entityId: card.id,
      details: { timId, judul: card.judul, statusKolom: card.statusKolom, tahap: card.tahap },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: card };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat kartu.' };
  }
}

export async function updateKanbanCardStatusAction(
  timId: string,
  cardId: string,
  newStatusKolom: string,
  newUrutan: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'kanban.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk memindahkan kartu di Kanban board tim ini.',
      };
    }

    await db.update(kanbanCard).set({
      statusKolom: newStatusKolom,
      urutan: newUrutan,
      updatedAt: new Date(),
    }).where(eq(kanbanCard.id, cardId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'KANBAN_CARD_MOVE',
      entity: 'kanban_card',
      entityId: cardId,
      details: { timId, newStatusKolom, newUrutan },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal update kartu.' };
  }
}
