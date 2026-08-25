'use server';

import { db } from '@/lib/db';
import {
  diskusiBoard,
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
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
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

// ─── 2. Get Full Board Data (Notes, Frames, Documents, Reference Cards) ───────
export async function getDiskusiBoardData(timId: string) {
  try {
    const boardRes = await getOrCreateDiskusiBoard(timId);
    if (!boardRes.success || !boardRes.board) {
      return { success: false, error: boardRes.error || 'Board tidak ditemukan' };
    }

    const board = boardRes.board;

    const [notes, frames, documents, cards] = await Promise.all([
      // Notes & Pins on the canvas
      db
        .select({
          id: diskusiNote.id,
          boardId: diskusiNote.boardId,
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
        .where(eq(diskusiNote.boardId, board.id))
        .orderBy(asc(diskusiNote.createdAt)),

      // Frames (Groups)
      db
        .select()
        .from(diskusiFrame)
        .where(eq(diskusiFrame.boardId, board.id))
        .orderBy(asc(diskusiFrame.createdAt)),

      // Source Documents
      db
        .select()
        .from(diskusiDocument)
        .where(eq(diskusiDocument.boardId, board.id))
        .orderBy(desc(diskusiDocument.uploadedAt)),

      // Kanban Cards for Right Panel (both Reference & Active Work Backlog)
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
        board,
        notes,
        frames,
        documents,
        cards,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengambil data diskusi' };
  }
}

// ─── 3. Note / Sticky / Pin Actions ──────────────────────────────────────────
export async function createDiskusiStickyNoteAction({
  boardId,
  timId,
  content = 'Ide / catatan baru...',
  posX = 150,
  posY = 150,
  color,
  frameId = null,
}: {
  boardId: string;
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

    revalidatePath(`/tim/${timId}/diskusi`);
    return { success: true, data: newNote };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat sticky note' };
  }
}

export async function createDiskusiPinAction({
  boardId,
  timId,
  cardId,
  posX = 200,
  posY = 200,
  frameId = null,
}: {
  boardId: string;
  timId: string;
  cardId: string;
  posX?: number;
  posY?: number;
  frameId?: string | null;
}) {
  try {
    const user = await getCurrentUser();

    // Check if card is already pinned
    const existing = await db
      .select({ id: diskusiNote.id })
      .from(diskusiNote)
      .where(and(eq(diskusiNote.boardId, boardId), eq(diskusiNote.kanbanCardId, cardId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'Kartu ini sudah disematkan (pin) di kanvas.' };
    }

    const [newPin] = await db
      .insert(diskusiNote)
      .values({
        boardId,
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
  timId,
  label = 'Kelompok Ide',
  posX = 100,
  posY = 100,
  width = 360,
  height = 300,
}: {
  boardId: string;
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
        label,
        posX,
        posY,
        width,
        height,
        color: '#F8FAFC',
        createdBy: user?.id ?? null,
      })
      .returning();

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

    // 2. Get all sticky notes inside this frame
    const notes = await db
      .select({ id: diskusiNote.id, content: diskusiNote.content })
      .from(diskusiNote)
      .where(and(eq(diskusiNote.frameId, frameId), eq(diskusiNote.type, 'sticky')));

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
