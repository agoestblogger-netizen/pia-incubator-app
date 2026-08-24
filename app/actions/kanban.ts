"use server";

import { db } from "@/lib/db";
import { kanbanCard, kanbanColumn, taskAttachment, taskLink } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getKanbanData(timId: string) {
  const columns = await db
    .select()
    .from(kanbanColumn)
    .where(eq(kanbanColumn.timInovatorId, timId))
    .orderBy(asc(kanbanColumn.urutan));

  const cards = await db
    .select({
      id: kanbanCard.id,
      timInovatorId: kanbanCard.timInovatorId,
      judul: kanbanCard.judul,
      deskripsi: kanbanCard.deskripsi,
      sprintNumber: kanbanCard.sprintNumber,
      tahap: kanbanCard.tahap,
      statusKolom: kanbanCard.statusKolom,
      ownerAnggotaId: kanbanCard.ownerAnggotaId,
      tanggalMulai: kanbanCard.tanggalMulai,
      tanggalSelesai: kanbanCard.tanggalSelesai,
      acceptanceCriteria: kanbanCard.acceptanceCriteria,
      dependencyRisiko: kanbanCard.dependencyRisiko,
      urutan: kanbanCard.urutan,
      label: kanbanCard.label,
      reviewStatus: kanbanCard.reviewStatus,
      createdAt: kanbanCard.createdAt,
      updatedAt: kanbanCard.updatedAt,
      attachmentsCount: sql<number>`cast(count(distinct ${taskAttachment.id}) as int)`,
      linksCount: sql<number>`cast(count(distinct ${taskLink.id}) as int)`,
    })
    .from(kanbanCard)
    .leftJoin(taskAttachment, eq(taskAttachment.taskId, kanbanCard.id))
    .leftJoin(taskLink, eq(taskLink.taskId, kanbanCard.id))
    .where(eq(kanbanCard.timInovatorId, timId))
    .groupBy(kanbanCard.id)
    .orderBy(asc(kanbanCard.urutan));

  return { columns, cards };
}

export async function createKanbanCardAction(
  timId: string,
  cardData: Partial<typeof kanbanCard.$inferInsert>
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
        error: "Forbidden: Anda tidak memiliki izin untuk menambah kartu di Kanban board tim ini.",
      };
    }

    const [card] = await db
      .insert(kanbanCard)
      .values({
        timInovatorId: timId,
        judul: cardData.judul || "Kartu Baru",
        deskripsi: cardData.deskripsi,
        statusKolom: cardData.statusKolom || "To Do",
        tahap: cardData.tahap || "umum",
        sprintNumber: cardData.sprintNumber !== undefined ? cardData.sprintNumber : null,
        ownerAnggotaId: cardData.ownerAnggotaId || null,
        label: cardData.label,
        tanggalMulai: cardData.tanggalMulai ? new Date(cardData.tanggalMulai) : null,
        tanggalSelesai: cardData.tanggalSelesai ? new Date(cardData.tanggalSelesai) : null,
        acceptanceCriteria: cardData.acceptanceCriteria,
        dependencyRisiko: cardData.dependencyRisiko,
        urutan: cardData.urutan || 0,
        reviewStatus: 'adopted', // kartu manual selalu adopted
      })
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_CREATE",
      entity: "kanban_card",
      entityId: card.id,
      details: {
        timId,
        judul: card.judul,
        statusKolom: card.statusKolom,
        tahap: card.tahap,
        sprintNumber: card.sprintNumber,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: card };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membuat kartu." };
  }
}

export async function updateKanbanCardStatusAction(
  timId: string,
  cardId: string,
  newStatusKolom: string,
  newUrutan: number,
  newSprintNumber?: number | null
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
        error: "Forbidden: Anda tidak memiliki izin untuk memindahkan kartu di Kanban board tim ini.",
      };
    }

    const updatePayload: any = {
      statusKolom: newStatusKolom,
      urutan: newUrutan,
      updatedAt: new Date(),
    };

    if (newSprintNumber !== undefined) {
      updatePayload.sprintNumber = newSprintNumber;
    }

    await db
      .update(kanbanCard)
      .set(updatePayload)
      .where(eq(kanbanCard.id, cardId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_MOVE",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, newStatusKolom, newUrutan, newSprintNumber },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal update status kartu." };
  }
}

export async function updateKanbanCardSprintAction(
  timId: string,
  cardId: string,
  newSprintNumber: number | null
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
        error: "Forbidden: Anda tidak memiliki izin untuk mengubah sprint kartu ini.",
      };
    }

    await db
      .update(kanbanCard)
      .set({
        sprintNumber: newSprintNumber,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCard.id, cardId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_SPRINT_ASSIGN",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, newSprintNumber },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengubah sprint kartu." };
  }
}

export async function updateKanbanCardFullAction(
  timId: string,
  cardId: string,
  cardData: Partial<typeof kanbanCard.$inferInsert>
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
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit kartu di Kanban board tim ini.",
      };
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (cardData.judul !== undefined) updatePayload.judul = cardData.judul;
    if (cardData.deskripsi !== undefined) updatePayload.deskripsi = cardData.deskripsi;
    if (cardData.statusKolom !== undefined) updatePayload.statusKolom = cardData.statusKolom;
    if (cardData.tahap !== undefined) updatePayload.tahap = cardData.tahap;
    if (cardData.sprintNumber !== undefined) updatePayload.sprintNumber = cardData.sprintNumber;
    if (cardData.ownerAnggotaId !== undefined) updatePayload.ownerAnggotaId = cardData.ownerAnggotaId;
    if (cardData.label !== undefined) updatePayload.label = cardData.label;
    if (cardData.tanggalMulai !== undefined) {
      updatePayload.tanggalMulai = cardData.tanggalMulai ? new Date(cardData.tanggalMulai) : null;
    }
    if (cardData.tanggalSelesai !== undefined) {
      updatePayload.tanggalSelesai = cardData.tanggalSelesai ? new Date(cardData.tanggalSelesai) : null;
    }
    if (cardData.acceptanceCriteria !== undefined) updatePayload.acceptanceCriteria = cardData.acceptanceCriteria;
    if (cardData.dependencyRisiko !== undefined) updatePayload.dependencyRisiko = cardData.dependencyRisiko;
    if (cardData.reviewStatus !== undefined) updatePayload.reviewStatus = cardData.reviewStatus;

    const [updated] = await db
      .update(kanbanCard)
      .set(updatePayload)
      .where(eq(kanbanCard.id, cardId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_UPDATE",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, judul: updated?.judul, statusKolom: updated?.statusKolom },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengupdate kartu." };
  }
}

export async function deleteKanbanCardAction(timId: string, cardId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk menghapus kartu di Kanban board tim ini.",
      };
    }

    const [deleted] = await db
      .delete(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_DELETE",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, judul: deleted?.judul },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus kartu." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK ATTACHMENTS & LINKS ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTaskAttachmentsAction(taskId: string) {
  try {
    const attachments = await db
      .select()
      .from(taskAttachment)
      .where(eq(taskAttachment.taskId, taskId))
      .orderBy(asc(taskAttachment.uploadedAt));

    return { success: true, data: attachments };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil lampiran." };
  }
}

export async function addTaskAttachmentAction(
  taskId: string,
  timId: string,
  payload: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    source?: "upload" | "proposal_dossier";
  }
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
        error: "Forbidden: Anda tidak memiliki izin menambah lampiran di kartu tim ini.",
      };
    }

    const [attachment] = await db
      .insert(taskAttachment)
      .values({
        taskId,
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        fileType: payload.fileType,
        fileSize: payload.fileSize,
        source: payload.source || "upload",
        uploadedBy: payload.source === "proposal_dossier" ? null : user.id,
      })
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "TASK_ATTACHMENT_ADD",
      entity: "task_attachment",
      entityId: attachment.id,
      details: { taskId, timId, fileName: payload.fileName, source: payload.source },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: attachment };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menambahkan lampiran." };
  }
}

export async function deleteTaskAttachmentAction(
  attachmentId: string,
  timId: string
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
        error: "Forbidden: Anda tidak memiliki izin menghapus lampiran di kartu tim ini.",
      };
    }

    const [att] = await db
      .select()
      .from(taskAttachment)
      .where(eq(taskAttachment.id, attachmentId))
      .limit(1);

    if (!att) {
      return { success: false, error: "Lampiran tidak ditemukan." };
    }

    // If upload source, delete physical file in task-attachments bucket
    if (att.source === "upload" && att.fileUrl) {
      try {
        const supabaseAdmin = createAdminClient();
        // Parse storage path from URL
        const marker = "/task-attachments/";
        if (att.fileUrl.includes(marker)) {
          const path = att.fileUrl.split(marker)[1];
          if (path) {
            await supabaseAdmin.storage.from("task-attachments").remove([decodeURIComponent(path)]);
          }
        }
      } catch (storageErr) {
        console.warn("[deleteTaskAttachmentAction] Storage cleanup warning:", storageErr);
      }
    }

    await db.delete(taskAttachment).where(eq(taskAttachment.id, attachmentId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "TASK_ATTACHMENT_DELETE",
      entity: "task_attachment",
      entityId: attachmentId,
      details: { taskId: att.taskId, timId, fileName: att.fileName, source: att.source },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus lampiran." };
  }
}

export async function getTaskLinksAction(taskId: string) {
  try {
    const links = await db
      .select()
      .from(taskLink)
      .where(eq(taskLink.taskId, taskId))
      .orderBy(asc(taskLink.addedAt));

    return { success: true, data: links };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil tautan." };
  }
}

export async function addTaskLinkAction(
  taskId: string,
  timId: string,
  payload: { url: string; label?: string }
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
        error: "Forbidden: Anda tidak memiliki izin menambah tautan di kartu tim ini.",
      };
    }

    let url = payload.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: "Format URL tidak valid. Harus diawali dengan http:// atau https://" };
    }

    const [link] = await db
      .insert(taskLink)
      .values({
        taskId,
        url,
        label: payload.label?.trim() || null,
        addedBy: user.id,
      })
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "TASK_LINK_ADD",
      entity: "task_link",
      entityId: link.id,
      details: { taskId, timId, url: link.url, label: link.label },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: link };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menambahkan tautan." };
  }
}

export async function deleteTaskLinkAction(linkId: string, timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin menghapus tautan di kartu tim ini.",
      };
    }

    const [deleted] = await db
      .delete(taskLink)
      .where(eq(taskLink.id, linkId))
      .returning();

    if (deleted) {
      await logAudit({
        userId: user.id,
        userName: user.nama,
        action: "TASK_LINK_DELETE",
        entity: "task_link",
        entityId: linkId,
        details: { taskId: deleted.taskId, timId, url: deleted.url },
      });
    }

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus tautan." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI REFERENCE ADOPTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adopsi kartu AI Reference ke Backlog Kerja Resmi:
 * - Simpan semua perubahan field (jika ada)
 * - Ubah reviewStatus jadi 'adopted'
 * Dalam satu operasi atomik.
 */
export async function adoptAiCardAction(
  timId: string,
  cardId: string,
  cardData: Partial<typeof kanbanCard.$inferInsert>
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
        error: "Forbidden: Anda tidak memiliki izin mengadopsi kartu AI di tim ini.",
      };
    }

    const updatePayload: any = {
      reviewStatus: 'adopted',
      updatedAt: new Date(),
    };

    if (cardData.judul !== undefined) updatePayload.judul = cardData.judul;
    if (cardData.deskripsi !== undefined) updatePayload.deskripsi = cardData.deskripsi;
    if (cardData.statusKolom !== undefined) updatePayload.statusKolom = cardData.statusKolom;
    if (cardData.tahap !== undefined) updatePayload.tahap = cardData.tahap;
    if (cardData.sprintNumber !== undefined) updatePayload.sprintNumber = cardData.sprintNumber;
    if (cardData.ownerAnggotaId !== undefined) updatePayload.ownerAnggotaId = cardData.ownerAnggotaId;
    if (cardData.label !== undefined) updatePayload.label = cardData.label;
    if (cardData.tanggalMulai !== undefined) {
      updatePayload.tanggalMulai = cardData.tanggalMulai ? new Date(cardData.tanggalMulai) : null;
    }
    if (cardData.tanggalSelesai !== undefined) {
      updatePayload.tanggalSelesai = cardData.tanggalSelesai ? new Date(cardData.tanggalSelesai) : null;
    }
    if (cardData.acceptanceCriteria !== undefined) updatePayload.acceptanceCriteria = cardData.acceptanceCriteria;
    if (cardData.dependencyRisiko !== undefined) updatePayload.dependencyRisiko = cardData.dependencyRisiko;

    const [updated] = await db
      .update(kanbanCard)
      .set(updatePayload)
      .where(eq(kanbanCard.id, cardId))
      .returning();

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_AI_ADOPTED",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, judul: updated?.judul, sebelumnya: 'ai_reference', sesudahnya: 'adopted' },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengadopsi kartu AI." };
  }
}
