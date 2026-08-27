'use server';

import { db } from '@/lib/db';
import {
  diskusiBoard,
  discussionCanvas,
  diskusiNote,
  diskusiFrame,
  diskusiDocument,
  timInovator,
  dossierPiaArchive,
  kanbanCard,
  kanbanSubtask,
  users,
} from '@/lib/db/schema';
import { eq, and, sql, desc, inArray, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { compileStickyNotesToBacklog, type CompiledBacklogDraft } from '@/lib/ai/diskusi-compiler';

const PASTEL_COLORS = [
  '#FEF3C7', // Amber / Yellow
  '#DBEAFE', // Blue
  '#D1FAE5', // Emerald / Green
  '#FCE7F3', // Pink
  '#EDE9FE', // Violet / Purple
  '#FEE2E2', // Rose / Red
  '#E0F2FE', // Sky
  '#FFEDD5', // Orange
];

function getRandomPastelColor(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

function isUserAdminOrCoach(user: any, timId: string): boolean {
  if (!user) return false;
  const adminCoachRoles = ['admin', 'admin_ic', 'divisi_ic', 'coach'];
  if (user.globalRoles?.some((r: string) => adminCoachRoles.includes(r))) return true;
  if (user.timRoles?.some((tr: any) => tr.timId === timId && adminCoachRoles.includes(tr.roleCode))) return true;
  return false;
}

// ─── 0. Multi-Canvas List & Management Actions ───────────────────────────────

export type DiscussionCanvasListItem = {
  id: string;
  timInovatorId: string;
  judul: string;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  stickyCount: number;
  frameCount: number;
  pinCount: number;
};

export async function getDiscussionCanvasListAction(timId: string) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(timId);
    if (!isUuid) return { success: false, error: 'ID Tim tidak valid' };

    const user = await getCurrentUser();
    const canManageAny = isUserAdminOrCoach(user, timId);

    // Ensure board exists for auto-seeding documents
    await getOrCreateDiskusiBoard(timId);

    // Fetch canvases with creator user
    const rows = await db
      .select({
        id: discussionCanvas.id,
        timInovatorId: discussionCanvas.timInovatorId,
        judul: discussionCanvas.judul,
        createdByUserId: discussionCanvas.createdByUserId,
        createdByName: users.nama,
        createdAt: discussionCanvas.createdAt,
        updatedAt: discussionCanvas.updatedAt,
      })
      .from(discussionCanvas)
      .leftJoin(users, eq(discussionCanvas.createdByUserId, users.id))
      .where(eq(discussionCanvas.timInovatorId, timId))
      .orderBy(desc(discussionCanvas.updatedAt), desc(discussionCanvas.createdAt));

    // Fetch notes & frames count per canvas
    const canvasIds = rows.map((r) => r.id);
    let countsByCanvas: Record<string, { sticky: number; pin: number; frame: number }> = {};

    if (canvasIds.length > 0) {
      const [noteCounts, frameCounts] = await Promise.all([
        db
          .select({
            canvasId: diskusiNote.canvasId,
            type: diskusiNote.type,
            count: sql<number>`count(*)::int`,
          })
          .from(diskusiNote)
          .where(inArray(diskusiNote.canvasId, canvasIds))
          .groupBy(diskusiNote.canvasId, diskusiNote.type),
        db
          .select({
            canvasId: diskusiFrame.canvasId,
            count: sql<number>`count(*)::int`,
          })
          .from(diskusiFrame)
          .where(inArray(diskusiFrame.canvasId, canvasIds))
          .groupBy(diskusiFrame.canvasId),
      ]);

      for (const nc of noteCounts) {
        if (!nc.canvasId) continue;
        if (!countsByCanvas[nc.canvasId]) countsByCanvas[nc.canvasId] = { sticky: 0, pin: 0, frame: 0 };
        if (nc.type === 'sticky') countsByCanvas[nc.canvasId].sticky += nc.count;
        if (nc.type === 'pin') countsByCanvas[nc.canvasId].pin += nc.count;
      }

      for (const fc of frameCounts) {
        if (!fc.canvasId) continue;
        if (!countsByCanvas[fc.canvasId]) countsByCanvas[fc.canvasId] = { sticky: 0, pin: 0, frame: 0 };
        countsByCanvas[fc.canvasId].frame += fc.count;
      }
    }

    const canvases: DiscussionCanvasListItem[] = rows.map((r) => ({
      ...r,
      stickyCount: countsByCanvas[r.id]?.sticky || 0,
      frameCount: countsByCanvas[r.id]?.frame || 0,
      pinCount: countsByCanvas[r.id]?.pin || 0,
    }));

    return {
      success: true,
      data: {
        canvases,
        currentUserId: user?.id ?? null,
        canManageAny,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat daftar kanvas' };
  }
}

export async function createDiscussionCanvasAction({
  timId,
  judul,
}: {
  timId: string;
  judul: string;
}) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(timId);
    if (!isUuid) return { success: false, error: 'ID Tim tidak valid' };

    const trimmedJudul = judul?.trim();
    if (!trimmedJudul) {
      return { success: false, error: 'Judul diskusi harus diisi' };
    }

    const user = await getCurrentUser();

    // Ensure board exists
    await getOrCreateDiskusiBoard(timId);

    const [newCanvas] = await db
      .insert(discussionCanvas)
      .values({
        timInovatorId: timId,
        judul: trimmedJudul,
        createdByUserId: user?.id ?? null,
      })
      .returning();

    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newCanvas };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat kanvas diskusi baru' };
  }
}

export async function renameDiscussionCanvasAction({
  canvasId,
  timId,
  judul,
}: {
  canvasId: string;
  timId: string;
  judul: string;
}) {
  try {
    const trimmedJudul = judul?.trim();
    if (!trimmedJudul) {
      return { success: false, error: 'Judul diskusi tidak boleh kosong' };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.' };
    }

    const [canvas] = await db
      .select()
      .from(discussionCanvas)
      .where(and(eq(discussionCanvas.id, canvasId), eq(discussionCanvas.timInovatorId, timId)))
      .limit(1);

    if (!canvas) {
      return { success: false, error: 'Kanvas diskusi tidak ditemukan' };
    }

    const isCreator = canvas.createdByUserId === user.id;
    const isCoachOrAdmin = isUserAdminOrCoach(user, timId);

    if (!isCreator && !isCoachOrAdmin) {
      return {
        success: false,
        error: 'Hanya pembuat kanvas, Admin, atau Innovation Coach yang dapat mengubah nama kanvas ini.',
      };
    }

    const [updated] = await db
      .update(discussionCanvas)
      .set({
        judul: trimmedJudul,
        updatedAt: new Date(),
      })
      .where(eq(discussionCanvas.id, canvasId))
      .returning();

    revalidatePath(`/tim/${timId}/diskusi`);
    revalidatePath(`/tim/${timId}/diskusi/${canvasId}`);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah nama kanvas' };
  }
}

export async function deleteDiscussionCanvasAction({
  canvasId,
  timId,
}: {
  canvasId: string;
  timId: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.' };
    }

    const isCoachOrAdmin = isUserAdminOrCoach(user, timId);
    if (!isCoachOrAdmin) {
      return {
        success: false,
        error: 'Hanya Admin atau Innovation Coach yang memiliki wewenang untuk menghapus kanvas diskusi.',
      };
    }

    const [canvas] = await db
      .select()
      .from(discussionCanvas)
      .where(and(eq(discussionCanvas.id, canvasId), eq(discussionCanvas.timInovatorId, timId)))
      .limit(1);

    if (!canvas) {
      return { success: false, error: 'Kanvas diskusi tidak ditemukan' };
    }

    await db.delete(discussionCanvas).where(eq(discussionCanvas.id, canvasId));

    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus kanvas diskusi' };
  }
}

// ─── 1. Get or Create Board & Auto-Seed Dossier Documents ─────────────────────
export async function getOrCreateDiskusiBoard(timId: string) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(timId);
    if (!isUuid) return { success: false, error: 'ID Tim tidak valid' };

    let [board] = await db
      .select()
      .from(diskusiBoard)
      .where(eq(diskusiBoard.timInovatorId, timId))
      .limit(1);

    if (!board) {
      // Create new board
      [board] = await db
        .insert(diskusiBoard)
        .values({
          timInovatorId: timId,
          nama: 'Ruang Diskusi',
        })
        .returning();

      // Auto-seed documents from dossierPiaArchive if available
      try {
        const [dossier] = await db
          .select()
          .from(dossierPiaArchive)
          .where(eq(dossierPiaArchive.timInovatorId, timId))
          .limit(1);

        if (dossier && dossier.snapshotData) {
          const snap = dossier.snapshotData as any;
          const proposalId = dossier.proposalIdAsli || snap.proposal_id || timId;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikjqozzsrnuemqgdujeg.supabase.co';
          const lampiranUrls: Record<string, string> = snap.lampiran_urls || {};
          const daftarLampiran: string[] = Array.isArray(snap.daftar_lampiran) ? snap.daftar_lampiran : [];

          const docsToInsert: Array<typeof diskusiDocument.$inferInsert> = [];

          for (const file of daftarLampiran) {
            const url =
              lampiranUrls[file] ||
              `${supabaseUrl}/storage/v1/object/public/dossier-lampiran/${proposalId}/${file}`;
            docsToInsert.push({
              boardId: board.id,
              fileName: file,
              fileUrl: url,
              fileType: file.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
              source: 'proposal_dossier',
              uploadedBy: null,
            });
          }

          if (snap.dokumen_proposal_url && !docsToInsert.some((d) => d.fileUrl === snap.dokumen_proposal_url)) {
            docsToInsert.push({
              boardId: board.id,
              fileName: 'Dokumen Proposal.pdf',
              fileUrl: snap.dokumen_proposal_url,
              fileType: 'application/pdf',
              source: 'proposal_dossier',
              uploadedBy: null,
            });
          }

          if (snap.proposal_resubmission_url && !docsToInsert.some((d) => d.fileUrl === snap.proposal_resubmission_url)) {
            docsToInsert.push({
              boardId: board.id,
              fileName: 'Proposal Resubmission.pdf',
              fileUrl: snap.proposal_resubmission_url,
              fileType: 'application/pdf',
              source: 'proposal_dossier',
              uploadedBy: null,
            });
          }

          if (snap.surat_originalitas_url && !docsToInsert.some((d) => d.fileUrl === snap.surat_originalitas_url)) {
            docsToInsert.push({
              boardId: board.id,
              fileName: 'Surat Originalitas.pdf',
              fileUrl: snap.surat_originalitas_url,
              fileType: 'application/pdf',
              source: 'proposal_dossier',
              uploadedBy: null,
            });
          }

          if (docsToInsert.length > 0) {
            await db.insert(diskusiDocument).values(docsToInsert);
          }
        }
      } catch (seedErr: any) {
        console.warn('[getOrCreateDiskusiBoard] Failed to auto-seed dossier docs:', seedErr.message);
      }
    }

    return { success: true, board };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat board diskusi' };
  }
}

// ─── 2. Get Canvas-Scoped Board Data (Notes, Frames, Documents, Reference Cards)
export async function getDiskusiCanvasData({
  timId,
  canvasId,
}: {
  timId: string;
  canvasId: string;
}) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(timId);
    const isCanvasUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canvasId);
    if (!isUuid || !isCanvasUuid) return { success: false, error: 'ID Tim atau ID Kanvas tidak valid' };

    // Fetch Canvas Info
    const [canvas] = await db
      .select({
        id: discussionCanvas.id,
        timInovatorId: discussionCanvas.timInovatorId,
        judul: discussionCanvas.judul,
        createdByUserId: discussionCanvas.createdByUserId,
        createdByName: users.nama,
        createdAt: discussionCanvas.createdAt,
        updatedAt: discussionCanvas.updatedAt,
      })
      .from(discussionCanvas)
      .leftJoin(users, eq(discussionCanvas.createdByUserId, users.id))
      .where(and(eq(discussionCanvas.id, canvasId), eq(discussionCanvas.timInovatorId, timId)))
      .limit(1);

    if (!canvas) {
      return { success: false, error: 'Kanvas diskusi tidak ditemukan' };
    }

    const boardRes = await getOrCreateDiskusiBoard(timId);
    if (!boardRes.success || !boardRes.board) {
      return { success: false, error: boardRes.error || 'Board tidak ditemukan' };
    }

    const board = boardRes.board;

    const [notes, frames, documents, cards] = await Promise.all([
      // Notes & Pins scoped to this canvas
      db
        .select({
          id: diskusiNote.id,
          boardId: diskusiNote.boardId,
          canvasId: diskusiNote.canvasId,
          type: diskusiNote.type,
          content: diskusiNote.content,
          kanbanCardId: diskusiNote.kanbanCardId,
          posX: diskusiNote.posX,
          posY: diskusiNote.posY,
          color: diskusiNote.color,
          frameId: diskusiNote.frameId,
          convertedToSubtaskId: diskusiNote.convertedToSubtaskId,
          convertedToCardId: diskusiNote.convertedToCardId,
          createdBy: diskusiNote.createdBy,
          createdByName: diskusiNote.createdByName,
          createdAt: diskusiNote.createdAt,
          updatedAt: diskusiNote.updatedAt,
          cardJudul: kanbanCard.judul,
          cardStoryPoint: kanbanCard.storyPoint,
          cardTahap: kanbanCard.tahap,
          cardLabel: kanbanCard.label,
          cardReviewStatus: kanbanCard.reviewStatus,
        })
        .from(diskusiNote)
        .leftJoin(kanbanCard, eq(diskusiNote.kanbanCardId, kanbanCard.id))
        .where(eq(diskusiNote.canvasId, canvasId))
        .orderBy(asc(diskusiNote.createdAt)),

      // Frames (Groups) scoped to this canvas
      db
        .select()
        .from(diskusiFrame)
        .where(eq(diskusiFrame.canvasId, canvasId))
        .orderBy(asc(diskusiFrame.createdAt)),

      // Source Documents (Team-wide / Board-wide)
      db
        .select()
        .from(diskusiDocument)
        .where(eq(diskusiDocument.boardId, board.id))
        .orderBy(desc(diskusiDocument.uploadedAt)),

      // Kanban Cards for Right Panel (Team-wide Reference & Active Work Backlog)
      db
        .select({
          id: kanbanCard.id,
          judul: kanbanCard.judul,
          deskripsi: kanbanCard.deskripsi,
          acceptanceCriteria: kanbanCard.acceptanceCriteria,
          storyPoint: kanbanCard.storyPoint,
          tahap: kanbanCard.tahap,
          label: kanbanCard.label,
          reviewStatus: kanbanCard.reviewStatus,
          statusKolom: kanbanCard.statusKolom,
          sprintNumber: kanbanCard.sprintNumber,
          suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
        })
        .from(kanbanCard)
        .where(eq(kanbanCard.timInovatorId, timId))
        .orderBy(asc(kanbanCard.urutan), asc(kanbanCard.createdAt)),
    ]);

    return {
      success: true,
      data: {
        canvas,
        board,
        notes,
        frames,
        documents,
        cards,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengambil data kanvas diskusi' };
  }
}

// ─── Legacy Fallback / Compatibility ─────────────────────────────────────────
export async function getDiskusiBoardData(timId: string) {
  try {
    const listRes = await getDiscussionCanvasListAction(timId);
    if (!listRes.success || !listRes.data || listRes.data.canvases.length === 0) {
      return { success: false, error: 'Tidak ada kanvas diskusi' };
    }
    return getDiskusiCanvasData({ timId, canvasId: listRes.data.canvases[0].id });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 3. Note / Sticky / Pin Actions ──────────────────────────────────────────
export async function createDiskusiStickyNoteAction({
  boardId,
  canvasId,
  timId,
  content = 'Ide / catatan baru...',
  posX = 150,
  posY = 150,
  color,
  frameId = null,
}: {
  boardId: string;
  canvasId?: string;
  timId: string;
  content?: string;
  posX?: number;
  posY?: number;
  color?: string;
  frameId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    const stickyColor = color || getRandomPastelColor();

    const [newNote] = await db
      .insert(diskusiNote)
      .values({
        boardId,
        canvasId: canvasId || null,
        type: 'sticky',
        content,
        posX,
        posY,
        color: stickyColor,
        frameId,
        createdBy: user?.id ?? null,
        createdByName: user?.nama ?? 'Anonim',
      })
      .returning();

    if (canvasId) {
      await db.update(discussionCanvas).set({ updatedAt: new Date() }).where(eq(discussionCanvas.id, canvasId));
      revalidatePath(`/tim/${timId}/diskusi/${canvasId}`);
    }
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newNote };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat sticky note' };
  }
}

export async function createDiskusiPinAction({
  boardId,
  canvasId,
  timId,
  cardId,
  posX = 200,
  posY = 200,
  frameId = null,
}: {
  boardId: string;
  canvasId?: string;
  timId: string;
  cardId: string;
  posX?: number;
  posY?: number;
  frameId?: string | null;
}) {
  try {
    const user = await getCurrentUser();

    // Check if card is already pinned in this canvas
    const condition = canvasId
      ? and(eq(diskusiNote.canvasId, canvasId), eq(diskusiNote.kanbanCardId, cardId))
      : and(eq(diskusiNote.boardId, boardId), eq(diskusiNote.kanbanCardId, cardId));

    const existing = await db
      .select({ id: diskusiNote.id })
      .from(diskusiNote)
      .where(condition)
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'Kartu ini sudah disematkan (pin) di kanvas ini.' };
    }

    const [newPin] = await db
      .insert(diskusiNote)
      .values({
        boardId,
        canvasId: canvasId || null,
        type: 'pin',
        kanbanCardId: cardId,
        posX,
        posY,
        color: '#FFFFFF',
        frameId,
        createdBy: user?.id ?? null,
        createdByName: user?.nama ?? 'Anonim',
      })
      .returning();

    if (canvasId) {
      await db.update(discussionCanvas).set({ updatedAt: new Date() }).where(eq(discussionCanvas.id, canvasId));
      revalidatePath(`/tim/${timId}/diskusi/${canvasId}`);
    }
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newPin };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyematkan kartu di kanvas' };
  }
}

export async function updateDiskusiNoteContentAction(noteId: string, content: string, timId: string) {
  try {
    const [updated] = await db
      .update(diskusiNote)
      .set({ content, updatedAt: new Date() })
      .where(eq(diskusiNote.id, noteId))
      .returning();

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui catatan' };
  }
}

export async function updateDiskusiNotePositionAction({
  noteId,
  posX,
  posY,
  frameId = null,
}: {
  noteId: string;
  posX: number;
  posY: number;
  frameId?: string | null;
}) {
  try {
    const [updated] = await db
      .update(diskusiNote)
      .set({ posX, posY, frameId, updatedAt: new Date() })
      .where(eq(diskusiNote.id, noteId))
      .returning();

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui posisi' };
  }
}

export async function deleteDiskusiNoteAction(noteId: string, timId: string) {
  try {
    await db.delete(diskusiNote).where(eq(diskusiNote.id, noteId));
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus catatan' };
  }
}

// ─── 4. Frame / Kelompok Ide Actions ──────────────────────────────────────────
export async function createDiskusiFrameAction({
  boardId,
  canvasId,
  timId,
  label = 'Kelompok Ide',
  posX = 100,
  posY = 100,
  width = 360,
  height = 300,
}: {
  boardId: string;
  canvasId?: string;
  timId: string;
  label?: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
}) {
  try {
    const user = await getCurrentUser();

    const [newFrame] = await db
      .insert(diskusiFrame)
      .values({
        boardId,
        canvasId: canvasId || null,
        label,
        posX,
        posY,
        width,
        height,
        color: '#F8FAFC',
        createdBy: user?.id ?? null,
      })
      .returning();

    if (canvasId) {
      await db.update(discussionCanvas).set({ updatedAt: new Date() }).where(eq(discussionCanvas.id, canvasId));
      revalidatePath(`/tim/${timId}/diskusi/${canvasId}`);
    }
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newFrame };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat kelompok ide' };
  }
}

export async function updateDiskusiFrameAction({
  frameId,
  label,
  posX,
  posY,
  width,
  height,
}: {
  frameId: string;
  label?: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
}) {
  try {
    const updatePayload: any = { updatedAt: new Date() };
    if (label !== undefined) updatePayload.label = label;
    if (posX !== undefined) updatePayload.posX = posX;
    if (posY !== undefined) updatePayload.posY = posY;
    if (width !== undefined) updatePayload.width = width;
    if (height !== undefined) updatePayload.height = height;

    const [updated] = await db
      .update(diskusiFrame)
      .set(updatePayload)
      .where(eq(diskusiFrame.id, frameId))
      .returning();

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui frame' };
  }
}

export async function deleteDiskusiFrameAction(frameId: string, timId: string) {
  try {
    // Unlink notes from this frame
    await db.update(diskusiNote).set({ frameId: null }).where(eq(diskusiNote.frameId, frameId));
    await db.delete(diskusiFrame).where(eq(diskusiFrame.id, frameId));
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus kelompok ide' };
  }
}

// ─── 5. Mechanism 1 & 2: Assign Sticky Note to Kanban Card as Subtask ────────
export async function assignStickyToCardSubtaskAction({
  noteId,
  cardId,
  timId,
}: {
  noteId: string;
  cardId: string;
  timId: string;
}) {
  try {
    const user = await getCurrentUser();

    // 1. Get note & validate content
    const [note] = await db.select().from(diskusiNote).where(eq(diskusiNote.id, noteId)).limit(1);
    if (!note || !note.content) {
      return { success: false, error: 'Isi sticky note ini dulu sebelum dijadikan subtask.' };
    }

    const trimmed = note.content.trim();
    const PLACEHOLDERS = ['Catatan ide baru...', 'Ide / catatan baru...', 'Ketik di sini...', 'Kosong', ''];
    if (!trimmed || PLACEHOLDERS.includes(trimmed)) {
      return { success: false, error: 'Isi sticky note ini dulu sebelum dijadikan subtask.' };
    }

    // 2. Get target card
    const [card] = await db.select().from(kanbanCard).where(eq(kanbanCard.id, cardId)).limit(1);
    if (!card) {
      return { success: false, error: 'Kartu target tidak ditemukan' };
    }

    // 3. Count existing subtasks for orderIndex
    const existingSubtasks = await db
      .select({ id: kanbanSubtask.id })
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.taskId, cardId));

    // 4. Create subtask with orderIndex and createdBy
    const [newSubtask] = await db
      .insert(kanbanSubtask)
      .values({
        taskId: cardId,
        title: trimmed,
        estimatedHours: null,
        isDone: false,
        orderIndex: existingSubtasks.length,
        createdBy: user?.id ?? null,
      })
      .returning();

    // 5. Mark sticky as converted
    const [updatedNote] = await db
      .update(diskusiNote)
      .set({
        convertedToSubtaskId: newSubtask.id,
        updatedAt: new Date(),
      })
      .where(eq(diskusiNote.id, noteId))
      .returning();

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/diskusi`);

    return {
      success: true,
      data: {
        subtask: newSubtask,
        note: updatedNote,
        cardTitle: card.judul,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menugaskan catatan sebagai subtask' };
  }
}

// ─── 6. Mechanism 3: AI Compile Sticky Notes in Frame into Backlog Draft ──────
export async function compileFrameNotesAction({
  frameId,
  timId,
}: {
  frameId: string;
  timId: string;
}) {
  try {
    // 1. Get frame
    const [frame] = await db.select().from(diskusiFrame).where(eq(diskusiFrame.id, frameId)).limit(1);
    if (!frame) {
      return { success: false, error: 'Kelompok ide tidak ditemukan.' };
    }

    // 2. Get all sticky notes inside this frame (matching frameId or spatial bounding box)
    const allCanvasNotes = await db
      .select({
        id: diskusiNote.id,
        content: diskusiNote.content,
        frameId: diskusiNote.frameId,
        posX: diskusiNote.posX,
        posY: diskusiNote.posY,
      })
      .from(diskusiNote)
      .where(
        frame.canvasId
          ? and(eq(diskusiNote.type, 'sticky'), eq(diskusiNote.canvasId, frame.canvasId))
          : and(eq(diskusiNote.type, 'sticky'), eq(diskusiNote.boardId, frame.boardId))
      );

    const notes = allCanvasNotes.filter((n) => {
      if (n.frameId === frameId) return true;
      const noteCenterX = (n.posX || 0) + 96;
      const noteCenterY = (n.posY || 0) + 60;
      return (
        noteCenterX >= frame.posX &&
        noteCenterX <= frame.posX + frame.width &&
        noteCenterY >= frame.posY &&
        noteCenterY <= frame.posY + frame.height
      );
    });

    const PLACEHOLDERS = ['Catatan ide baru...', 'Ide / catatan baru...', 'Ketik di sini...', 'Kosong', ''];
    const validNotes = notes.filter((n) => {
      const c = n.content?.trim() || '';
      return Boolean(c) && !PLACEHOLDERS.includes(c);
    });

    if (validNotes.length < 2) {
      return {
        success: false,
        error: 'Kelompok ide membutuhkan minimal 2 catatan sticky note yang terisi (bukan placeholder) untuk dikompilasi oleh AI.',
      };
    }

    const validContents = validNotes.map((n) => n.content!.trim());

    // 3. Get team info
    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);

    // 4. Call AI compiler
    const draft = await compileStickyNotesToBacklog({
      noteContents: validContents,
      frameLabel: frame.label,
      teamName: tim?.namaProyekInovasi || 'Inovasi',
      kategoriPia: tim?.kategoriPia,
    });

    return {
      success: true,
      data: {
        draft,
        sourceNoteIds: notes.map((n) => n.id),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengompilasi ide dengan AI.' };
  }
}

// ─── 7. Mark Sticky Notes Converted to Newly Created Card ────────────────────
export async function markNotesConvertedToCardAction({
  noteIds,
  cardId,
  timId,
}: {
  noteIds: string[];
  cardId: string;
  timId: string;
}) {
  try {
    if (noteIds.length > 0) {
      await db
        .update(diskusiNote)
        .set({ convertedToCardId: cardId, updatedAt: new Date() })
        .where(inArray(diskusiNote.id, noteIds));
    }
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 8. Document Actions ──────────────────────────────────────────────────────
export async function addDiskusiDocumentAction({
  boardId,
  timId,
  fileName,
  fileUrl,
  fileType = 'application/pdf',
}: {
  boardId: string;
  timId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
}) {
  try {
    const user = await getCurrentUser();

    const [newDoc] = await db
      .insert(diskusiDocument)
      .values({
        boardId,
        fileName,
        fileUrl,
        fileType,
        source: 'upload',
        uploadedBy: user?.id ?? null,
      })
      .returning();

    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newDoc };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan dokumen' };
  }
}

export async function deleteDiskusiDocumentAction(docId: string, timId: string) {
  try {
    await db.delete(diskusiDocument).where(eq(diskusiDocument.id, docId));
    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus dokumen' };
  }
}
