"use server";

import { db } from "@/lib/db";
import {
  charter,
  roles,
  userRoleTim,
  anggotaTim,
  users,
  dossierPiaArchive,
  kanbanCard,
  timInovator,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";

export type RoleAssignmentItem = {
  id?: string; // local temporary id for UI list keys
  roleCode: 'sponsor' | 'promotor' | 'project_owner' | 'inisiator' | 'co_creator' | 'coach' | 'sme';
  userId: string | null;
  userName?: string;
  userEmail?: string;
  jabatan: string;
  unitKerja: string;
};

export type CharterWithAutoFill = {
  charter: any;
  autoFilledFields: string[];
  usulanPromotorHint: string | null;
  hasDossier: boolean;
};

function cleanText(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getCharterByTimId(timId: string): Promise<CharterWithAutoFill> {
  const [data] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
  const [dossier] = await db.select().from(dossierPiaArchive).where(eq(dossierPiaArchive.timInovatorId, timId)).limit(1);

  const autoFilledFields: string[] = [];
  let usulanPromotorHint: string | null = null;
  const hasDossier = Boolean(dossier && dossier.snapshotData);

  const resultCharter: any = data ? { ...data } : {
    timInovatorId: timId,
    projectMission: "",
    customerEarlyAdopters: "",
    contextAreaBantuan: "",
    problemWorthSolving: "",
    hmw: "",
    opportunityStatement: "",
    businessOpportunity: "",
    solusiAwal: "",
    desirabilityHypothesis: "",
    feasibilityHypothesis: "",
    viabilityHypothesis: "",
    linkProposal: "",
    ritmeKerja: "Weekly Sprint & Standup 2x seminggu",
    pacingMonitoring: "Review kemajuan bersama Coach tiap 2 minggu",
    kebutuhanDukungan: "",
    risikoAwal: "",
    ttdDisetujui: null,
  };

  if (hasDossier) {
    const snap = dossier.snapshotData as any;
    const submisi = snap.data_submisi || {};
    const formDetail = submisi.form_detail || {};

    // Auto-fill Mapping rules from proposal
    const mapping: Record<string, string> = {
      customerEarlyAdopters: cleanText(
        formDetail.bi_sasaran_pengguna_inovasi ||
        formDetail.bc_kelompok_dibantu ||
        formDetail.kelompok_dibantu
      ),
      contextAreaBantuan: cleanText(
        formDetail.bi_konteks_inovasi ||
        formDetail.bc_alasan_memilih_area_bantuan ||
        submisi.tema
      ),
      problemWorthSolving: cleanText(
        formDetail.bi_masalah_diselesaikan ||
        formDetail.bc_masalah_sasaran_inovasi ||
        formDetail.masalah_sasaran ||
        submisi.deskripsi_lengkap
      ),
      solusiAwal: cleanText(
        formDetail.bi_inovasi_diusulkan ||
        formDetail.bc_eksplorasi_solusi ||
        formDetail.solusi_diusulkan ||
        formDetail.keunikan
      ),
      desirabilityHypothesis: cleanText(
        formDetail.bi_inovasi_dapat_menyelesaikan ||
        formDetail.bc_dilakukan_untuk_menyelesaikan_masalah ||
        formDetail.target_non_finansial
      ),
      feasibilityHypothesis: cleanText(
        formDetail.bi_sumber_daya ||
        formDetail.bc_sumber_daya_diperlukan ||
        formDetail.keunikan
      ),
      viabilityHypothesis: cleanText(
        formDetail.bi_target_finansial ||
        formDetail.bc_target_capaian_finansial ||
        formDetail.target_finansial
      ),
      kebutuhanDukungan: cleanText(
        formDetail.bi_sumber_daya ||
        formDetail.bc_sumber_daya_diperlukan
      ),
    };

    // Apply auto-fill only to fields that are currently empty
    for (const [fieldKey, autoValue] of Object.entries(mapping)) {
      if (autoValue && (!resultCharter[fieldKey] || resultCharter[fieldKey].trim() === "")) {
        resultCharter[fieldKey] = autoValue;
        autoFilledFields.push(fieldKey);
      }
    }

    // Extract Usulan Promotor hint
    const rawPromotor =
      formDetail.usulan_promotor ||
      formDetail.promotor_diusulkan ||
      submisi.usulan_promotor ||
      (typeof snap.resubmit_document_text === 'string' && snap.resubmit_document_text.match(/Usulan\s*Promotor\s*[:\-]\s*([^\n]+)/i)?.[1]);

    if (rawPromotor && typeof rawPromotor === 'string' && rawPromotor.trim()) {
      usulanPromotorHint = cleanText(rawPromotor);
    }
  }

  return {
    charter: resultCharter,
    autoFilledFields,
    usulanPromotorHint,
    hasDossier,
  };
}

export async function getCharterRolesData(timId: string) {
  try {
    const allRoles = await db.select().from(roles);
    const existingAssignments = await db
      .select({
        id: userRoleTim.id,
        roleId: userRoleTim.roleId,
        roleCode: roles.kodeRole,
        roleName: roles.namaRole,
        userId: userRoleTim.userId,
        userName: users.nama,
        userEmail: users.email,
      })
      .from(userRoleTim)
      .innerJoin(roles, eq(userRoleTim.roleId, roles.id))
      .innerJoin(users, eq(userRoleTim.userId, users.id))
      .where(eq(userRoleTim.timInovatorId, timId));

    const existingAnggota = await db
      .select()
      .from(anggotaTim)
      .where(eq(anggotaTim.timInovatorId, timId));

    return {
      success: true,
      roles: allRoles,
      assignments: existingAssignments,
      anggotaTim: existingAnggota,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat data role tim.' };
  }
}

export async function saveCharterAction(
  timId: string,
  values: Partial<typeof charter.$inferInsert>,
  roleAssignments?: RoleAssignmentItem[]
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const allowed = await hasPermission(user, 'charter.edit', timId);
    if (!allowed) {
      return {
        success: false,
        error: 'Forbidden: Anda tidak memiliki izin untuk mengedit Innovation Charter tim ini.',
      };
    }

    // 1. Save or update Charter
    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
    let charterId = existing?.id;

    if (existing) {
      await db.update(charter).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(charter.id, existing.id));
    } else {
      const [inserted] = await db.insert(charter).values({
        timInovatorId: timId,
        ...values,
      }).returning();
      charterId = inserted.id;
    }

    // 2. Process Role & Accountability Assignments if provided
    if (Array.isArray(roleAssignments)) {
      const allRoles = await db.select().from(roles);
      const roleMap = new Map(allRoles.map((r) => [r.kodeRole, r]));

      const standardRoleCodes: RoleAssignmentItem['roleCode'][] = [
        'sponsor',
        'promotor',
        'project_owner',
        'inisiator',
        'co_creator',
        'coach',
        'sme',
      ];

      const allActiveUserIds = new Set<string>();

      for (const roleCode of standardRoleCodes) {
        const targetRole = roleMap.get(roleCode);
        if (!targetRole) continue;

        const submittedItems = roleAssignments.filter(
          (r) => r.roleCode === roleCode && r.userId
        );

        // Delete existing user_role_tim assignments for this role in this team
        await db
          .delete(userRoleTim)
          .where(
            and(
              eq(userRoleTim.timInovatorId, timId),
              eq(userRoleTim.roleId, targetRole.id)
            )
          );

        for (const item of submittedItems) {
          if (!item.userId) continue;
          allActiveUserIds.add(item.userId);

          const [assignedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, item.userId))
            .limit(1);

          if (assignedUser) {
            await db
              .insert(userRoleTim)
              .values({
                userId: item.userId,
                roleId: targetRole.id,
                timInovatorId: timId,
              })
              .onConflictDoNothing();

            const [existingAnggota] = await db
              .select()
              .from(anggotaTim)
              .where(
                and(
                  eq(anggotaTim.timInovatorId, timId),
                  eq(anggotaTim.userId, item.userId)
                )
              )
              .limit(1);

            if (existingAnggota) {
              await db
                .update(anggotaTim)
                .set({
                  nama: assignedUser.nama,
                  jabatan: item.jabatan || existingAnggota.jabatan || targetRole.namaRole,
                  unitKerja: item.unitKerja || existingAnggota.unitKerja || 'PT Pegadaian',
                  komitmenDukungan: `Role: ${targetRole.namaRole}`,
                  updatedAt: new Date(),
                })
                .where(eq(anggotaTim.id, existingAnggota.id));
            } else {
              await db.insert(anggotaTim).values({
                timInovatorId: timId,
                userId: item.userId,
                nama: assignedUser.nama,
                jabatan: item.jabatan || targetRole.namaRole,
                unitKerja: item.unitKerja || 'PT Pegadaian',
                komitmenDukungan: `Role: ${targetRole.namaRole}`,
              });
            }
          }
        }
      }

      // Clean up anggota_tim rows for users no longer assigned to ANY role in this team
      const existingTeamAnggota = await db
        .select()
        .from(anggotaTim)
        .where(eq(anggotaTim.timInovatorId, timId));

      for (const ang of existingTeamAnggota) {
        if (ang.userId && !allActiveUserIds.has(ang.userId)) {
          await db.delete(anggotaTim).where(eq(anggotaTim.id, ang.id));
        }
      }
    }

    // 3. Auto-generate Initial Backlog on first Charter save (Roadmap + 15 Baku CV/MV Tasks)
    const existingCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId))
      .limit(1);

    if (existingCards.length === 0) {
      const cardsToInsert: Array<typeof kanbanCard.$inferInsert> = [];
      let cardUrutan = 1;

      // a. Draft Roadmap Cards (Innovation Setup) if dossier exists
      const [dossier] = await db
        .select()
        .from(dossierPiaArchive)
        .where(eq(dossierPiaArchive.timInovatorId, timId))
        .limit(1);

      if (dossier && dossier.snapshotData) {
        const snap = dossier.snapshotData as any;
        const submisi = snap.data_submisi || {};
        const formDetail = submisi.form_detail || {};

        const rawRoadmap =
          formDetail.bi_diwujudkan_dengan_cara ||
          formDetail.bc_mewujudkan_solusi ||
          (typeof snap.resubmit_document_text === 'string' && snap.resubmit_document_text.match(/Roadmap[^\n]*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)?.[1]);

        if (rawRoadmap && typeof rawRoadmap === 'string' && rawRoadmap.trim().length > 20) {
          // Parse lines or bullet points
          const lines = rawRoadmap
            .split(/\n|\r\n|•|·|\d+\.\s+/)
            .map((l: string) => cleanText(l))
            .filter((l: string) => l.length > 5);

          for (const line of lines.slice(0, 5)) {
            cardsToInsert.push({
              timInovatorId: timId,
              judul: line.slice(0, 100),
              deskripsi: line,
              tahap: 'innovation_setup',
              statusKolom: 'To Do',
              sprintNumber: null,
              label: 'Draf Roadmap',
              urutan: cardUrutan++,
            });
          }
        } else {
          // Standard Roadmap phases from proposal scope
          const defaultRoadmapPhases = [
            {
              judul: 'Fase 1: Penajaman Problem & Stakeholder Alignment',
              deskripsi: 'Memperdalam validasi masalah sasaran, alignment dengan stakeholder unit bisnis, dan finalisasi scope inovasi.',
            },
            {
              judul: 'Fase 2: Prototype Solution & Architecture Design',
              deskripsi: 'Membangun desain prototype antarmuka, arsitektur teknis sistem, dan kesiapan data pendukung.',
            },
            {
              judul: 'Fase 3: Initial Pilot Testing & Feedback Collection',
              deskripsi: 'Menjalankan pengujian awal skala terbatas dan menghimpun umpan balik dari pengguna terpilih.',
            },
          ];

          for (const p of defaultRoadmapPhases) {
            cardsToInsert.push({
              timInovatorId: timId,
              judul: p.judul,
              deskripsi: p.deskripsi,
              tahap: 'innovation_setup',
              statusKolom: 'To Do',
              sprintNumber: null,
              label: 'Draf Roadmap',
              urutan: cardUrutan++,
            });
          }
        }
      }

      // b. 7 Template Baku Customer Validation
      const cvTemplates = [
        'Susun Perencanaan Customer Validation',
        'Siapkan prototype untuk testing',
        'Rekrut early adopters/responden',
        'Lakukan sesi user testing',
        'Analisis hasil & isi Laporan Customer Validation',
        'Preliminary Review (SME)',
        'Tentukan keputusan Fit/Tidak Fit',
      ];

      for (const title of cvTemplates) {
        cardsToInsert.push({
          timInovatorId: timId,
          judul: title,
          deskripsi: `Aktivitas baku tahap Customer Validation: ${title}.`,
          tahap: 'customer_validation',
          statusKolom: 'To Do',
          sprintNumber: null,
          label: 'Template Baku CV',
          urutan: cardUrutan++,
        });
      }

      // c. 8 Template Baku Market Validation
      const mvTemplates = [
        'Susun Perencanaan Market Validation',
        'MVP Planning',
        'MVP Development',
        'MVP Release',
        'Market Testing (ukur metrik DFV)',
        'Preliminary Review (SME)',
        'Analisis hasil & isi Laporan Market Validation',
        'Persiapan Forum Manajemen Inovasi',
      ];

      for (const title of mvTemplates) {
        cardsToInsert.push({
          timInovatorId: timId,
          judul: title,
          deskripsi: `Aktivitas baku tahap Market Validation: ${title}.`,
          tahap: 'market_validation',
          statusKolom: 'To Do',
          sprintNumber: null,
          label: 'Template Baku MV',
          urutan: cardUrutan++,
        });
      }

      if (cardsToInsert.length > 0) {
        await db.insert(kanbanCard).values(cardsToInsert);
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_SAVE',
      entity: 'charter',
      entityId: charterId,
      details: {
        timId,
        projectMission: values.projectMission,
        rolesCount: roleAssignments?.length || 0,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/admin/roles`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan Charter.' };
  }
}

export async function approveCharterAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'charter.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Hanya Promotor inovasi yang memiliki izin menyetujui Innovation Charter tim ini.',
      };
    }

    const [existingCharter] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!existingCharter) {
      return {
        success: false,
        error: 'Innovation Charter belum disimpan oleh tim. Silakan simpan draf terlebih dahulu sebelum disetujui.',
      };
    }

    // Get user's jabatan and unitKerja from anggotaTim if available
    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, user.id)))
      .limit(1);

    const approvalData = {
      userId: user.id,
      nama: user.nama,
      email: user.email,
      jabatan: anggota?.jabatan || 'Promotor Inovasi',
      unit: anggota?.unitKerja || 'PT Pegadaian',
      tanggal: new Date().toISOString(),
      status: 'approved',
    };

    await db
      .update(charter)
      .set({
        ttdDisetujui: approvalData,
        updatedAt: new Date(),
      })
      .where(eq(charter.id, existingCharter.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_APPROVE',
      entity: 'charter',
      entityId: existingCharter.id,
      details: { timId, promotor: user.nama },
    });

    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/tugas`);
    return { success: true, ttdDisetujui: approvalData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyetujui Charter.' };
  }
}

export async function revokeCharterApprovalAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    const isPermitted = await hasPermission(user, 'charter.approve', timId);
    if (!isPermitted) {
      return {
        success: false,
        error: 'Forbidden: Hanya Promotor inovasi yang berwenang membatalkan persetujuan Charter.',
      };
    }

    const [existingCharter] = await db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    if (!existingCharter) {
      return { success: false, error: 'Charter tidak ditemukan.' };
    }

    await db
      .update(charter)
      .set({
        ttdDisetujui: null,
        updatedAt: new Date(),
      })
      .where(eq(charter.id, existingCharter.id));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'CHARTER_REVOKE_APPROVAL',
      entity: 'charter',
      entityId: existingCharter.id,
      details: { timId, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/tugas`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan persetujuan Charter.' };
  }
}
