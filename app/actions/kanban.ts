"use server";

import { db } from "@/lib/db";
import {
  kanbanCard,
  kanbanColumn,
  taskAttachment,
  taskLink,
  kanbanSubtask,
  kanbanComment,
  kanbanActivityLog,
  anggotaTim,
  teamMemberCapacity,
  users,
} from "@/lib/db/schema";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPredefinedSubtasks } from "@/lib/data/subtask-templates";
import { generateDynamicSubtasksForCard } from "@/lib/ai/subtask-generator";
import { detectCvBakuCardType } from "@/lib/utils/cv-cards";
import { detectMvBakuCardType, isMvMandatoryCard } from "@/lib/utils/mv-cards";

export async function logKanbanActivity(params: {
  taskId: string;
  userId?: string | null;
  actionType: 'status_change' | 'owner_change' | 'estimate_change' | 'sprint_change' | 'created';
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  try {
    await db.insert(kanbanActivityLog).values({
      taskId: params.taskId,
      userId: params.userId || null,
      actionType: params.actionType,
      fieldName: params.fieldName,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
    });
  } catch (err) {
    console.error("[logKanbanActivity] Error inserting activity log:", err);
  }
}

export async function getKanbanData(timId: string) {
  const columns = await db
    .select()
    .from(kanbanColumn)
    .where(eq(kanbanColumn.timInovatorId, timId))
    .orderBy(asc(kanbanColumn.urutan));

  const rawCards = await db
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
      estimasiJam: kanbanCard.estimasiJam,
      storyPoint: kanbanCard.storyPoint,
      suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
      customDocumentData: kanbanCard.customDocumentData,
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

  // Query subtask totals for all cards in this team (Paket 24a)
  const subtaskRows = await db
    .select({
      taskId: kanbanSubtask.taskId,
      subtasksCount: sql<number>`cast(count(${kanbanSubtask.id}) as int)`,
      totalSubtaskHours: sql<number>`cast(coalesce(sum(${kanbanSubtask.estimatedHours}), 0) as int)`,
    })
    .from(kanbanSubtask)
    .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
    .where(eq(kanbanCard.timInovatorId, timId))
    .groupBy(kanbanSubtask.taskId);

  const subtaskMap = new Map<string, { subtasksCount: number; totalSubtaskHours: number }>();
  for (const st of subtaskRows) {
    subtaskMap.set(st.taskId, {
      subtasksCount: st.subtasksCount || 0,
      totalSubtaskHours: st.totalSubtaskHours || 0,
    });
  }

  const cards = rawCards.map((c) => {
    const stInfo = subtaskMap.get(c.id);
    const rawSubtaskEst = stInfo?.totalSubtaskHours || 0;
    // Subtask duration in minutes is converted to hours for capacity calculation
    const calculatedHours = rawSubtaskEst >= 15
      ? Number((rawSubtaskEst / 60).toFixed(2))
      : rawSubtaskEst;

    return {
      ...c,
      subtasksCount: stInfo?.subtasksCount || 0,
      totalSubtaskHours: calculatedHours || c.estimasiJam || 0,
    };
  });

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
        estimasiJam: cardData.estimasiJam ?? null,
        storyPoint: cardData.storyPoint ?? 3,
      })
      .returning();

    // Insert _initialSubtasks if provided (e.g. from AI Compilation)
    if (Array.isArray((cardData as any)._initialSubtasks) && (cardData as any)._initialSubtasks.length > 0) {
      const subtaskInserts = (cardData as any)._initialSubtasks
        .map((st: any, idx: number) => ({
          taskId: card.id,
          title: String(st.title || '').trim(),
          estimatedHours: typeof st.estimatedHours === 'number' && st.estimatedHours > 0 ? st.estimatedHours : null,
          isDone: false,
          orderIndex: idx,
          createdBy: user.id,
        }))
        .filter((st: any) => Boolean(st.title));

      if (subtaskInserts.length > 0) {
        await db.insert(kanbanSubtask).values(subtaskInserts);
      }
    }

    await logKanbanActivity({
      taskId: card.id,
      userId: user.id,
      actionType: "created",
      fieldName: "card",
      oldValue: null,
      newValue: card.judul,
    });

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

    const [oldCard] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!oldCard) {
      return { success: false, error: "Kartu tidak ditemukan." };
    }

    // ── BAGIAN C: Validasi Kartu Template Baku CV & MV wajib selesai semua subtask wajib sebelum Done ──
    if (newStatusKolom === "Done") {
      const isBakuCv = detectCvBakuCardType(oldCard.judul, oldCard.tahap || undefined);
      const isBakuMv = isMvMandatoryCard(oldCard.judul, oldCard.tahap || undefined);
      if (isBakuCv || isBakuMv) {
        const mandatorySubtasks = await db
          .select({
            id: kanbanSubtask.id,
            isDone: kanbanSubtask.isDone,
            title: kanbanSubtask.title,
          })
          .from(kanbanSubtask)
          .where(
            and(
              eq(kanbanSubtask.taskId, cardId),
              inArray(kanbanSubtask.subtaskType, ["mandatory_simple", "mandatory_complex"])
            )
          );

        const incompleteMandatory = mandatorySubtasks.filter((st) => !st.isDone);
        if (incompleteMandatory.length > 0) {
          return {
            success: false,
            error: "⚠ Kartu ini punya subtask wajib yang belum diisi. Lengkapi dulu sebelum menandai Done.",
          };
        }
      }
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

    if (oldCard) {
      if (oldCard.statusKolom !== newStatusKolom) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "status_change",
          fieldName: "Status Kolom",
          oldValue: oldCard.statusKolom,
          newValue: newStatusKolom,
        });
      }
      if (newSprintNumber !== undefined && oldCard.sprintNumber !== newSprintNumber) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "sprint_change",
          fieldName: "Sprint",
          oldValue: oldCard.sprintNumber !== null && oldCard.sprintNumber !== undefined ? `Sprint ${oldCard.sprintNumber}` : "Backlog",
          newValue: newSprintNumber !== null && newSprintNumber !== undefined ? `Sprint ${newSprintNumber}` : "Backlog",
        });
      }
    }

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

    const [oldCard] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    await db
      .update(kanbanCard)
      .set({
        sprintNumber: newSprintNumber,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCard.id, cardId));

    if (oldCard && oldCard.sprintNumber !== newSprintNumber) {
      await logKanbanActivity({
        taskId: cardId,
        userId: user.id,
        actionType: "sprint_change",
        fieldName: "Sprint",
        oldValue: oldCard.sprintNumber !== null && oldCard.sprintNumber !== undefined ? `Sprint ${oldCard.sprintNumber}` : "Backlog",
        newValue: newSprintNumber !== null && newSprintNumber !== undefined ? `Sprint ${newSprintNumber}` : "Backlog",
      });
    }

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

    const [oldCard] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

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
    if (cardData.estimasiJam !== undefined) updatePayload.estimasiJam = cardData.estimasiJam;
    if (cardData.storyPoint !== undefined) updatePayload.storyPoint = cardData.storyPoint;
    if (cardData.suggestedSprintNumber !== undefined) updatePayload.suggestedSprintNumber = cardData.suggestedSprintNumber;
    if (cardData.customDocumentData !== undefined) updatePayload.customDocumentData = cardData.customDocumentData;

    const [updated] = await db
      .update(kanbanCard)
      .set(updatePayload)
      .where(eq(kanbanCard.id, cardId))
      .returning();

    // Automatic Activity Logging
    if (oldCard) {
      if (cardData.statusKolom !== undefined && oldCard.statusKolom !== cardData.statusKolom) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "status_change",
          fieldName: "Status Kolom",
          oldValue: oldCard.statusKolom,
          newValue: cardData.statusKolom,
        });
      }
      if (cardData.sprintNumber !== undefined && oldCard.sprintNumber !== cardData.sprintNumber) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "sprint_change",
          fieldName: "Sprint",
          oldValue: oldCard.sprintNumber !== null && oldCard.sprintNumber !== undefined ? `Sprint ${oldCard.sprintNumber}` : "Backlog",
          newValue: cardData.sprintNumber !== null && cardData.sprintNumber !== undefined ? `Sprint ${cardData.sprintNumber}` : "Backlog",
        });
      }
      if (cardData.storyPoint !== undefined && oldCard.storyPoint !== cardData.storyPoint) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "estimate_change",
          fieldName: "Story Point",
          oldValue: oldCard.storyPoint !== null && oldCard.storyPoint !== undefined ? `${oldCard.storyPoint} SP` : "Belum diisi",
          newValue: cardData.storyPoint !== null && cardData.storyPoint !== undefined ? `${cardData.storyPoint} SP` : "Belum diisi",
        });
      }
      if (cardData.estimasiJam !== undefined && oldCard.estimasiJam !== cardData.estimasiJam) {
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "estimate_change",
          fieldName: "Estimasi Jam",
          oldValue: oldCard.estimasiJam !== null && oldCard.estimasiJam !== undefined ? `${oldCard.estimasiJam} jam` : "0 jam",
          newValue: cardData.estimasiJam !== null && cardData.estimasiJam !== undefined ? `${cardData.estimasiJam} jam` : "0 jam",
        });
      }
      if (cardData.ownerAnggotaId !== undefined && oldCard.ownerAnggotaId !== cardData.ownerAnggotaId) {
        let oldOwnerName = "Belum Ditugaskan";
        let newOwnerName = "Belum Ditugaskan";
        const ownerIds = [oldCard.ownerAnggotaId, cardData.ownerAnggotaId].filter(Boolean) as string[];
        if (ownerIds.length > 0) {
          const members = await db
            .select({ id: anggotaTim.id, nama: anggotaTim.nama })
            .from(anggotaTim)
            .where(inArray(anggotaTim.id, ownerIds));
          const map = new Map(members.map((m) => [m.id, m.nama]));
          if (oldCard.ownerAnggotaId) oldOwnerName = map.get(oldCard.ownerAnggotaId) || "Anggota Tim";
          if (cardData.ownerAnggotaId) newOwnerName = map.get(cardData.ownerAnggotaId) || "Anggota Tim";
        }
        await logKanbanActivity({
          taskId: cardId,
          userId: user.id,
          actionType: "owner_change",
          fieldName: "Owner / PIC",
          oldValue: oldOwnerName,
          newValue: newOwnerName,
        });
      }
    }

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

export async function adoptAiCardAction(
  timId: string,
  cardId: string,
  targetSprintNumber?: number | null,
  cardOverrides?: {
    judul?: string;
    deskripsi?: string;
    acceptanceCriteria?: string;
    estimasiJam?: number | null;
    storyPoint?: number | null;
    ownerAnggotaId?: string | null;
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
        error: "Forbidden: Anda tidak memiliki izin untuk mengadopsi kartu backlog.",
      };
    }

    const updatePayload: any = {
      reviewStatus: 'adopted',
      updatedAt: new Date(),
    };

    if (targetSprintNumber !== undefined) {
      updatePayload.sprintNumber = targetSprintNumber;
    }
    if (cardOverrides?.judul) updatePayload.judul = cardOverrides.judul;
    if (cardOverrides?.deskripsi !== undefined) updatePayload.deskripsi = cardOverrides.deskripsi;
    if (cardOverrides?.acceptanceCriteria !== undefined) updatePayload.acceptanceCriteria = cardOverrides.acceptanceCriteria;
    if (cardOverrides?.estimasiJam !== undefined) updatePayload.estimasiJam = cardOverrides.estimasiJam;
    if (cardOverrides?.storyPoint !== undefined) updatePayload.storyPoint = cardOverrides.storyPoint;
    if (cardOverrides?.ownerAnggotaId !== undefined) updatePayload.ownerAnggotaId = cardOverrides.ownerAnggotaId;

    const [updated] = await db
      .update(kanbanCard)
      .set(updatePayload)
      .where(eq(kanbanCard.id, cardId))
      .returning();

    await logKanbanActivity({
      taskId: cardId,
      userId: user.id,
      actionType: "created",
      fieldName: "Adopsi Backlog",
      oldValue: "Backlog Referensi",
      newValue: targetSprintNumber ? `Sprint ${targetSprintNumber}` : "Backlog",
    });

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "KANBAN_CARD_ADOPT",
      entity: "kanban_card",
      entityId: cardId,
      details: { timId, judul: updated?.judul, targetSprintNumber },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengadopsi kartu." };
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

    const [card] = await db
      .select({
        id: kanbanCard.id,
        judul: kanbanCard.judul,
        tahap: kanbanCard.tahap,
        label: kanbanCard.label,
      })
      .from(kanbanCard)
      .where(eq(kanbanCard.id, cardId))
      .limit(1);

    if (!card) {
      return { success: false, error: "Kartu tidak ditemukan." };
    }

    const isBakuCv =
      detectCvBakuCardType(card.judul, card.tahap || undefined) !== null ||
      card.label === "Template Baku CV";
    const isBakuMv =
      detectMvBakuCardType(card.judul, card.tahap || undefined) !== null ||
      card.label === "Template Baku MV";

    if (isBakuCv || isBakuMv) {
      return {
        success: false,
        error: `Kartu ${isBakuCv ? "Template Baku CV" : "Template Baku MV"} tidak dapat dihapus karena merupakan struktur baku resmi Juklak.`,
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
// SUBTASKS ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTaskSubtasksAction(taskId: string) {
  try {
    const subtasks = await db
      .select({
        id: kanbanSubtask.id,
        taskId: kanbanSubtask.taskId,
        title: kanbanSubtask.title,
        estimatedHours: kanbanSubtask.estimatedHours,
        isDone: kanbanSubtask.isDone,
        orderIndex: kanbanSubtask.orderIndex,
        assigneeUserId: kanbanSubtask.assigneeUserId,
        attachmentData: kanbanSubtask.attachmentData,
        subtaskType: kanbanSubtask.subtaskType,
        reportFieldMapping: kanbanSubtask.reportFieldMapping,
        createdBy: kanbanSubtask.createdBy,
        createdAt: kanbanSubtask.createdAt,
        assigneeName: users.nama,
        assigneeAvatar: users.avatarUrl,
      })
      .from(kanbanSubtask)
      .leftJoin(users, eq(kanbanSubtask.assigneeUserId, users.id))
      .where(eq(kanbanSubtask.taskId, taskId))
      .orderBy(asc(kanbanSubtask.orderIndex), asc(kanbanSubtask.createdAt));

    return { success: true, data: subtasks };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil subtask." };
  }
}

export async function createTaskSubtaskAction(
  taskId: string,
  timId: string,
  title: string,
  estimatedHours?: number | null,
  assigneeUserId?: string | null
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
        error: "Forbidden: Anda tidak memiliki izin menambah subtask pada kartu tim ini.",
      };
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Judul subtask tidak boleh kosong." };
    }

    // Validasi blocking kapasitas jika assigneeUserId diisi (Paket 24b)
    if (assigneeUserId) {
      const [cardRow] = await db
        .select({ sprintNumber: kanbanCard.sprintNumber })
        .from(kanbanCard)
        .where(eq(kanbanCard.id, taskId))
        .limit(1);

      const targetSprint = cardRow?.sprintNumber;
      if (targetSprint) {
        const [member] = await db
          .select({ id: anggotaTim.id, nama: anggotaTim.nama })
          .from(anggotaTim)
          .where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, assigneeUserId)))
          .limit(1);

        if (member) {
          const [capacityRow] = await db
            .select({ kapasitasSubtask: teamMemberCapacity.kapasitasSubtask })
            .from(teamMemberCapacity)
            .where(
              and(
                eq(teamMemberCapacity.timInovatorId, timId),
                eq(teamMemberCapacity.anggotaTimId, member.id),
                eq(teamMemberCapacity.sprintNumber, targetSprint)
              )
            )
            .limit(1);

          const maxCap = capacityRow?.kapasitasSubtask;
          if (maxCap !== null && maxCap !== undefined && maxCap > 0) {
            const [countResult] = await db
              .select({
                count: sql<number>`cast(count(${kanbanSubtask.id}) as int)`,
              })
              .from(kanbanSubtask)
              .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
              .where(
                and(
                  eq(kanbanCard.timInovatorId, timId),
                  eq(kanbanCard.sprintNumber, targetSprint),
                  eq(kanbanSubtask.assigneeUserId, assigneeUserId)
                )
              );

            if ((countResult?.count || 0) + 1 > maxCap) {
              return {
                success: false,
                error: `⚠ ${member.nama} sudah mencapai kapasitas ${maxCap} subtask di Sprint ${targetSprint}.`,
              };
            }
          }
        }
      }
    }

    const [subtask] = await db
      .insert(kanbanSubtask)
      .values({
        taskId,
        title: trimmed,
        estimatedHours: typeof estimatedHours === 'number' ? Math.max(0, estimatedHours) : null,
        assigneeUserId: assigneeUserId || null,
        isDone: false,
        createdBy: user.id,
      })
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: subtask };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membuat subtask." };
  }
}

/** Update PIC penugasan subtask dengan validasi kapasitas (Paket 24b). */
export async function updateSubtaskAssigneeAction(
  subtaskId: string,
  timId: string,
  assigneeUserId: string | null,
  sprintNumber?: number | null
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
        error: "Forbidden: Anda tidak memiliki izin mengubah penugasan subtask.",
      };
    }

    // Ambil detail subtask & card terkait
    const [subtaskRow] = await db
      .select({
        id: kanbanSubtask.id,
        taskId: kanbanSubtask.taskId,
        currentAssignee: kanbanSubtask.assigneeUserId,
        cardSprint: kanbanCard.sprintNumber,
      })
      .from(kanbanSubtask)
      .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
      .where(eq(kanbanSubtask.id, subtaskId))
      .limit(1);

    if (!subtaskRow) {
      return { success: false, error: "Subtask tidak ditemukan." };
    }

    const targetSprint = sprintNumber || subtaskRow.cardSprint;

    // Validasi Blocking Kapasitas Subtask (Paket 24b)
    if (assigneeUserId && targetSprint) {
      const [member] = await db
        .select({
          id: anggotaTim.id,
          nama: anggotaTim.nama,
        })
        .from(anggotaTim)
        .where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, assigneeUserId)))
        .limit(1);

      if (member) {
        const [capacityRow] = await db
          .select({ kapasitasSubtask: teamMemberCapacity.kapasitasSubtask })
          .from(teamMemberCapacity)
          .where(
            and(
              eq(teamMemberCapacity.timInovatorId, timId),
              eq(teamMemberCapacity.anggotaTimId, member.id),
              eq(teamMemberCapacity.sprintNumber, targetSprint)
            )
          )
          .limit(1);

        const maxSubtaskCap = capacityRow?.kapasitasSubtask;

        // Jika kapasitas_subtask SUDAH DIISI (bukan NULL) -> lakukan validasi blocking
        if (maxSubtaskCap !== null && maxSubtaskCap !== undefined && maxSubtaskCap > 0) {
          const [countResult] = await db
            .select({
              count: sql<number>`cast(count(${kanbanSubtask.id}) as int)`,
            })
            .from(kanbanSubtask)
            .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
            .where(
              and(
                eq(kanbanCard.timInovatorId, timId),
                eq(kanbanCard.sprintNumber, targetSprint),
                eq(kanbanSubtask.assigneeUserId, assigneeUserId),
                sql`${kanbanSubtask.id} != ${subtaskId}` // jangan hitung subtask yang sedang diubah
              )
            );

          const currentCount = countResult?.count || 0;
          if (currentCount + 1 > maxSubtaskCap) {
            return {
              success: false,
              error: `⚠ ${member.nama} sudah mencapai kapasitas ${maxSubtaskCap} subtask di Sprint ${targetSprint}.`,
            };
          }
        }
      }
    }

    const [updated] = await db
      .update(kanbanSubtask)
      .set({ assigneeUserId: assigneeUserId || null })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui PIC subtask." };
  }
}

export async function updateTaskSubtaskHoursAction(
  subtaskId: string,
  timId: string,
  estimatedHours: number | null
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
        error: "Forbidden: Anda tidak memiliki izin mengubah estimasi jam subtask.",
      };
    }

    const parsedHours = typeof estimatedHours === 'number' ? Math.max(0, estimatedHours) : null;

    const [updated] = await db
      .update(kanbanSubtask)
      .set({ estimatedHours: parsedHours })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui jam subtask." };
  }
}

export async function updateTaskSubtaskTitleAction(
  subtaskId: string,
  timId: string,
  title: string
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
        error: "Forbidden: Anda tidak memiliki izin mengubah judul subtask.",
      };
    }

    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Judul subtask tidak boleh kosong." };
    }

    const [updated] = await db
      .update(kanbanSubtask)
      .set({ title: trimmed })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui judul subtask." };
  }
}


export async function toggleTaskSubtaskAction(
  subtaskId: string,
  timId: string,
  isDone: boolean
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
        error: "Forbidden: Anda tidak memiliki izin mengubah status subtask.",
      };
    }

    const [st] = await db
      .select()
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.id, subtaskId))
      .limit(1);

    if (!st) {
      return { success: false, error: "Subtask tidak ditemukan." };
    }

    const atts = Array.isArray(st.attachmentData) ? st.attachmentData : [];
    if (isDone && atts.length === 0) {
      return {
        success: false,
        error: "Checklist terkunci: Harap lampirkan bukti kerja terlebih dahulu.",
      };
    }

    const [updated] = await db
      .update(kanbanSubtask)
      .set({ isDone })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui status subtask." };
  }
}

export async function addSubtaskAttachmentAction(
  subtaskId: string,
  timId: string,
  attachment: {
    id?: string;
    type: "file" | "link";
    name: string;
    url: string;
    size?: number;
    uploadedAt?: string;
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
        error: "Forbidden: Anda tidak memiliki izin menambah lampiran subtask.",
      };
    }

    const [st] = await db
      .select()
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.id, subtaskId))
      .limit(1);

    if (!st) {
      return { success: false, error: "Subtask tidak ditemukan." };
    }

    const existingAtts = Array.isArray(st.attachmentData) ? st.attachmentData : [];
    const newAtt = {
      id: attachment.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: attachment.type,
      name: attachment.name,
      url: attachment.url,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt || new Date().toISOString(),
    };
    const updatedAtts = [...existingAtts, newAtt];

    const [updated] = await db
      .update(kanbanSubtask)
      .set({ attachmentData: updatedAtts })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menambah lampiran subtask." };
  }
}

export async function deleteSubtaskAttachmentAction(
  subtaskId: string,
  timId: string,
  attachmentId: string
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
        error: "Forbidden: Anda tidak memiliki izin menghapus lampiran subtask.",
      };
    }

    const [st] = await db
      .select()
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.id, subtaskId))
      .limit(1);

    if (!st) {
      return { success: false, error: "Subtask tidak ditemukan." };
    }

    const existingAtts = Array.isArray(st.attachmentData) ? st.attachmentData : [];
    const updatedAtts = existingAtts.filter(
      (a: any) => a.id !== attachmentId && a.url !== attachmentId
    );
    // Jika semua lampiran dihapus dan subtask sudah centang, otomatis uncheck
    const isDone = updatedAtts.length === 0 ? false : st.isDone;

    const [updated] = await db
      .update(kanbanSubtask)
      .set({
        attachmentData: updatedAtts,
        isDone,
      })
      .where(eq(kanbanSubtask.id, subtaskId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus lampiran subtask." };
  }
}

export async function deleteTaskSubtaskAction(subtaskId: string, timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "kanban.edit", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin menghapus subtask.",
      };
    }

    const [st] = await db
      .select({
        id: kanbanSubtask.id,
        subtaskType: kanbanSubtask.subtaskType,
        cardJudul: kanbanCard.judul,
        cardTahap: kanbanCard.tahap,
        cardLabel: kanbanCard.label,
      })
      .from(kanbanSubtask)
      .innerJoin(kanbanCard, eq(kanbanSubtask.taskId, kanbanCard.id))
      .where(eq(kanbanSubtask.id, subtaskId))
      .limit(1);

    if (!st) {
      return { success: false, error: "Subtask tidak ditemukan." };
    }

    const isBakuCv =
      detectCvBakuCardType(st.cardJudul, st.cardTahap || undefined) !== null ||
      st.cardLabel === "Template Baku CV";
    const isBakuMv =
      detectMvBakuCardType(st.cardJudul, st.cardTahap || undefined) !== null ||
      st.cardLabel === "Template Baku MV";

    if (isBakuCv || isBakuMv) {
      return {
        success: false,
        error: `Subtask pada kartu ${isBakuCv ? "Template Baku CV" : "Template Baku MV"} tidak dapat dihapus karena merupakan bagian dari struktur baku resmi Juklak.`,
      };
    }

    if (st.subtaskType && st.subtaskType !== "regular") {
      return {
        success: false,
        error: "Subtask wajib tidak dapat dihapus.",
      };
    }

    await db.delete(kanbanSubtask).where(eq(kanbanSubtask.id, subtaskId));

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus subtask." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTaskCommentsAction(taskId: string) {
  try {
    const comments = await db
      .select({
        id: kanbanComment.id,
        taskId: kanbanComment.taskId,
        userId: kanbanComment.userId,
        content: kanbanComment.content,
        createdAt: kanbanComment.createdAt,
        userNama: users.nama,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
      })
      .from(kanbanComment)
      .leftJoin(users, eq(users.id, kanbanComment.userId))
      .where(eq(kanbanComment.taskId, taskId))
      .orderBy(asc(kanbanComment.createdAt));

    return { success: true, data: comments };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil komentar." };
  }
}

export async function createTaskCommentAction(
  taskId: string,
  timId: string,
  content: string
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
        error: "Forbidden: Anda tidak memiliki izin mengirim komentar.",
      };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, error: "Komentar tidak boleh kosong." };
    }

    const [comment] = await db
      .insert(kanbanComment)
      .values({
        taskId,
        userId: user.id,
        content: trimmed,
      })
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    return {
      success: true,
      data: {
        ...comment,
        userNama: user.nama,
        userEmail: user.email,
        userAvatarUrl: user.avatarUrl,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengirim komentar." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTaskActivityLogsAction(taskId: string) {
  try {
    const logs = await db
      .select({
        id: kanbanActivityLog.id,
        taskId: kanbanActivityLog.taskId,
        userId: kanbanActivityLog.userId,
        actionType: kanbanActivityLog.actionType,
        fieldName: kanbanActivityLog.fieldName,
        oldValue: kanbanActivityLog.oldValue,
        newValue: kanbanActivityLog.newValue,
        createdAt: kanbanActivityLog.createdAt,
        userNama: users.nama,
        userAvatarUrl: users.avatarUrl,
      })
      .from(kanbanActivityLog)
      .leftJoin(users, eq(users.id, kanbanActivityLog.userId))
      .where(eq(kanbanActivityLog.taskId, taskId))
      .orderBy(desc(kanbanActivityLog.createdAt));

    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengambil log aktivitas." };
  }
}


