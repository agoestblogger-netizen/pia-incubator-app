"use server";

import { db } from "@/lib/db";
import { sprint, sprintLog, kanbanCard, customerValidationPlan, sprintReview } from "@/lib/db/schema";
import { eq, and, ne, asc, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import {
  generateAiSprintGoal,
  getHeuristicSprintGoal,
  generateAiSprintGoalFromCvPlan,
  isCvPlanFilled,
} from "@/lib/ai/sprint-goal-generator";
import {
  generateSprintReviewAiDraft,
  SprintReviewAiDraft,
} from "@/lib/ai/sprint-review-generator";
import { timInovator, kanbanComment, users } from "@/lib/db/schema";

export async function getSprintsByTimId(timId: string) {
  let list = await db
    .select()
    .from(sprint)
    .where(eq(sprint.timInovatorId, timId))
    .orderBy(asc(sprint.nomorSprint));

  // If no sprints exist yet, initialize 6 default sprints (Paket 24a)
  if (list.length === 0) {
    const defaultSprints = [
      { timInovatorId: timId, nomorSprint: 1, status: "belum_dimulai", tujuan: "Problem Validation & Setup" },
      { timInovatorId: timId, nomorSprint: 2, status: "belum_dimulai", tujuan: "Solution Exploration & Prototyping" },
      { timInovatorId: timId, nomorSprint: 3, status: "belum_dimulai", tujuan: "Customer Validation & Testing" },
      { timInovatorId: timId, nomorSprint: 4, status: "belum_dimulai", tujuan: "MVP Development & Pilot Prep" },
      { timInovatorId: timId, nomorSprint: 5, status: "belum_dimulai", tujuan: "Market Validation & Pilot Execution" },
      { timInovatorId: timId, nomorSprint: 6, status: "belum_dimulai", tujuan: "Pitch & FMI Preparation" },
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

    const isAllowed = await hasPermission(user, "sprint.manage_count", timId);
    if (!isAllowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk mengubah jumlah sprint tim ini.",
      };
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
  cardMovements?: Array<{
    cardId: string;
    destination: "backlog" | "next_sprint";
    nextSprintNumber?: number | null;
  }>,
  reviewData?: {
    demo?: string | null;
    feedback?: string | null;
    value?: string | null;
    questions?: string | null;
    evidence?: any;
    continueItems?: string | null;
    stopItems?: string | null;
    startItems?: string | null;
    ownerTargetSprint?: string | null;
    ringkasanPencapaian?: string | null;
    pembelajaran?: string | null;
    kendalaBlocker?: string | null;
    rencanaTindakLanjut?: string | null;
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

    // Auto carry-over any remaining incomplete cards in this sprint that were not explicitly moved
    const handledCardIds = new Set((cardMovements || []).map((m) => m.cardId));
    const nextSprintNum = targetSprint.nomorSprint + 1;
    const remainingIncompleteCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.sprintNumber, targetSprint.nomorSprint),
          ne(kanbanCard.statusKolom, "Done")
        )
      );

    for (const c of remainingIncompleteCards) {
      if (!handledCardIds.has(c.id)) {
        await db
          .update(kanbanCard)
          .set({
            sprintNumber: nextSprintNum,
            updatedAt: new Date(),
          })
          .where(eq(kanbanCard.id, c.id));
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

    // Save Sprint Review if reviewData provided
    if (reviewData) {
      const [existingReview] = await db
        .select()
        .from(sprintReview)
        .where(eq(sprintReview.sprintId, sprintId))
        .limit(1);

      if (existingReview) {
        await db
          .update(sprintReview)
          .set({
            ...reviewData,
            updatedAt: new Date(),
          })
          .where(eq(sprintReview.id, existingReview.id));
      } else {
        await db.insert(sprintReview).values({
          sprintId,
          timInovatorId: timId,
          sprintNumber: targetSprint.nomorSprint,
          ...reviewData,
        });
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_COMPLETE",
      entity: "sprint",
      entityId: sprintId,
      details: {
        timId,
        nomorSprint: targetSprint.nomorSprint,
        cardMovementsCount: cardMovements?.length || 0,
        hasReviewData: !!reviewData,
      },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/market-validation`);
    revalidatePath(`/tim/${timId}/customer-validation`);
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

export async function updateSprintGoalAction(timId: string, sprintId: string, sprintGoal: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const allowed =
      (await hasPermission(user, "kanban.edit", timId)) ||
      (await hasPermission(user, "cust_val.edit", timId)) ||
      (await hasPermission(user, "charter.edit", timId));
    if (!allowed) {
      return { success: false, error: "Forbidden: Anda tidak memiliki izin mengedit sprint tim ini." };
    }

    const [currentSprint] = await db
      .select()
      .from(sprint)
      .where(and(eq(sprint.id, sprintId), eq(sprint.timInovatorId, timId)))
      .limit(1);

    if (!currentSprint) {
      return { success: false, error: "Sprint tidak ditemukan." };
    }

    const isAdmin = user.globalRoles.some((r) => ["super_admin", "admin_ic", "admin"].includes(r));
    const isCoach =
      user.globalRoles.some((r) => ["coach", "innovation_coach"].includes(r)) ||
      user.timRoles.some((tr) => tr.timId === timId && ["coach", "innovation_coach"].includes(tr.roleCode));

    // If goal is already saved and non-empty, only admin or coach can update it
    if (
      currentSprint.sprintGoal &&
      currentSprint.sprintGoal.trim().length > 0 &&
      !isAdmin &&
      !isCoach
    ) {
      return {
        success: false,
        error: "Sprint Goal telah disimpan dan dikunci. Hanya Admin dan Innovation Coach yang dapat mengubahnya.",
      };
    }

    const [updated] = await db
      .update(sprint)
      .set({
        sprintGoal: sprintGoal.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(sprint.id, sprintId), eq(sprint.timInovatorId, timId)))
      .returning();

    if (!updated) {
      return { success: false, error: "Sprint tidak ditemukan." };
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "SPRINT_GOAL_UPDATE",
      entity: "sprint",
      entityId: sprintId,
      details: { timId, nomorSprint: updated.nomorSprint, sprintGoal },
    });

    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/market-validation`);
    revalidatePath(`/tim/${timId}/overview`);

    return { success: true, sprint: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan Sprint Goal." };
  }
}

export async function getSuggestedSprintGoalAction(timId: string, sprintNumber: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const [currentSprint] = await db
      .select({ sprintGoal: sprint.sprintGoal })
      .from(sprint)
      .where(and(eq(sprint.timInovatorId, timId), eq(sprint.nomorSprint, sprintNumber)))
      .limit(1);

    const isGoalSaved = !!(currentSprint?.sprintGoal && currentSprint.sprintGoal.trim().length > 0);
    const isAdmin = user.globalRoles.some((r) => ["super_admin", "admin_ic", "admin"].includes(r));
    const isCoach =
      user.globalRoles.some((r) => ["coach", "innovation_coach"].includes(r)) ||
      user.timRoles.some((tr) => tr.timId === timId && ["coach", "innovation_coach"].includes(tr.roleCode));

    if (isGoalSaved && !isAdmin && !isCoach) {
      return {
        success: false,
        error: "Sprint Goal sudah tersimpan. Regenerasi saran AI hanya diizinkan untuk Admin dan Innovation Coach.",
      };
    }

    // ── 1. Get all sprints for this team (to determine position) ───────────
    const allSprints = await db
      .select({ id: sprint.id, nomorSprint: sprint.nomorSprint })
      .from(sprint)
      .where(eq(sprint.timInovatorId, timId));
    const totalSprints = allSprints.length || 4;

    // ── 2. Get adopted cards for this sprint ───────────────────────────────
    const cardsInSprint = await db
      .select({
        id: kanbanCard.id,
        judul: kanbanCard.judul,
        deskripsi: kanbanCard.deskripsi,
        tahap: kanbanCard.tahap,
        sprintNumber: kanbanCard.sprintNumber,
        suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
      })
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.sprintNumber, sprintNumber)
        )
      );

    // If no adopted cards, also check suggested cards for this sprint
    let targetCards = cardsInSprint;
    if (targetCards.length === 0) {
      const suggestedCards = await db
        .select({
          id: kanbanCard.id,
          judul: kanbanCard.judul,
          deskripsi: kanbanCard.deskripsi,
          tahap: kanbanCard.tahap,
          sprintNumber: kanbanCard.sprintNumber,
          suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
        })
        .from(kanbanCard)
        .where(
          and(
            eq(kanbanCard.timInovatorId, timId),
            eq(kanbanCard.suggestedSprintNumber, sprintNumber)
          )
        );
      targetCards = suggestedCards;
    }

    // ── 3. PRIORITY: if backlog exists, generate from backlog ──────────────
    if (targetCards.length > 0) {
      const suggestedGoal = await generateAiSprintGoal({
        sprintNumber,
        cards: targetCards,
      });
      return { success: true, suggestedGoal };
    }

    // ── 4. FALLBACK: if no backlog, try CV Planning Form data ──────────────
    const [cvPlanRow] = await db
      .select({
        projectMission: customerValidationPlan.projectMission,
        customerDanContext: customerValidationPlan.customerDanContext,
        problemHypothesis: customerValidationPlan.problemHypothesis,
        hmw: customerValidationPlan.hmw,
        solutionHypothesis: customerValidationPlan.solutionHypothesis,
        prototypeType: customerValidationPlan.prototypeType,
        fiturAlurDiuji: customerValidationPlan.fiturAlurDiuji,
        targetEarlyAdopters: customerValidationPlan.targetEarlyAdopters,
      })
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    if (cvPlanRow && isCvPlanFilled(cvPlanRow)) {
      const suggestedGoal = await generateAiSprintGoalFromCvPlan({
        cvPlan: cvPlanRow,
        sprintNumber,
        totalSprints,
      });
      return { success: true, suggestedGoal };
    }

    // ── 5. Total fallback: both backlog and CV plan are empty ──────────────
    return { success: true, suggestedGoal: "" };
  } catch (error: any) {
    console.error("[getSuggestedSprintGoalAction] Error:", error);
    return { success: false, error: error.message || "Gagal membuat saran Sprint Goal." };
  }
}

export async function generateSprintReviewDraftAction(
  timId: string,
  sprintId: string
): Promise<{ success: boolean; data?: SprintReviewAiDraft; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const [targetSprint] = await db
      .select()
      .from(sprint)
      .where(eq(sprint.id, sprintId))
      .limit(1);

    if (!targetSprint) {
      return { success: false, error: "Sprint tidak ditemukan." };
    }

    const [tim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    const namaTim = tim?.namaProyekInovasi || "Tim Inovasi";
    const nomorSprint = targetSprint.nomorSprint;
    const sprintGoal = targetSprint.sprintGoal || targetSprint.tujuan || null;

    // Fetch cards in this sprint
    const cardsInSprint = await db
      .select()
      .from(kanbanCard)
      .where(
        and(
          eq(kanbanCard.timInovatorId, timId),
          eq(kanbanCard.sprintNumber, nomorSprint)
        )
      );

    const doneCards = cardsInSprint
      .filter((c) => (c.statusKolom || "").toLowerCase() === "done")
      .map((c) => ({
        judul: c.judul,
        deskripsi: c.deskripsi,
        acceptanceCriteria: c.acceptanceCriteria,
      }));

    const issueCards = cardsInSprint
      .filter((c) => c.tipeKartu === "issue")
      .map((c) => ({
        judul: c.judul,
        deskripsi: c.deskripsi,
        statusKolom: c.statusKolom,
      }));

    // Fetch comments on cards in this sprint (if any)
    const cardIds = cardsInSprint.map((c) => c.id);
    let comments: Array<{ cardJudul: string; author: string; content: string }> = [];

    if (cardIds.length > 0) {
      const commentsRaw = await db
        .select({
          cardId: kanbanComment.taskId,
          content: kanbanComment.content,
          userName: users.nama,
        })
        .from(kanbanComment)
        .leftJoin(users, eq(users.id, kanbanComment.userId))
        .where(inArray(kanbanComment.taskId, cardIds))
        .limit(10);

      comments = commentsRaw.map((cm) => {
        const matchingCard = cardsInSprint.find((c) => c.id === cm.cardId);
        return {
          cardJudul: matchingCard?.judul || "Kartu",
          author: cm.userName || "Anggota",
          content: cm.content,
        };
      });
    }

    const aiRes = await generateSprintReviewAiDraft({
      namaTim,
      nomorSprint,
      sprintGoal,
      doneCards,
      issueCards,
      comments,
    });

    return aiRes;
  } catch (error: any) {
    console.error("[generateSprintReviewDraftAction] Error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghasilkan draf Sprint Review AI.",
    };
  }
}


