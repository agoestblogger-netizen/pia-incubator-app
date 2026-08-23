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
import { createAdminClient } from "@/lib/supabase/admin";

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

function formatPegadaianEmail(name: string): string {
  const parts = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0]}@pegadaian.co.id`;
  return `${parts[0]}.${parts[parts.length - 1]}@pegadaian.co.id`;
}

export async function ensureUserAccount(
  nama: string,
  email: string
): Promise<{ user: typeof users.$inferSelect; isNew: boolean } | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;

  // 1. Check if user already exists in DB
  const [existingDbUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (existingDbUser) {
    return { user: existingDbUser, isNew: false };
  }

  // 2. Create user in Supabase Auth via Admin Client
  let authUserId: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: "gadai123",
      email_confirm: true,
      user_metadata: { name: nama.trim(), full_name: nama.trim(), role: "per_tim" },
    });

    if (data?.user?.id) {
      authUserId = data.user.id;
    } else if (error) {
      console.warn("Supabase auth createUser note:", error.message);
      const { data: listData } = await admin.auth.admin.listUsers();
      const matched = listData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (matched) {
        authUserId = matched.id;
      }
    }
  } catch (err) {
    console.error("Supabase Admin client error:", err);
  }

  // 3. Insert into public.users with mustChangePassword = true
  const [newDbUser] = await db
    .insert(users)
    .values({
      id: authUserId || undefined,
      nama: nama.trim(),
      email: cleanEmail,
      statusAktif: true,
      mustChangePassword: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { updatedAt: new Date() },
    })
    .returning();

  return { user: newDbUser, isNew: true };
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
    const submisi = snap.data_submisi || snap;
    const formDetail = submisi.form_detail || {};

    const mapping: Record<string, string> = {
      projectMission: cleanText(
        submisi.judul ||
        submisi.tema ||
        snap.judul_inovasi
      ),
      customerEarlyAdopters: cleanText(
        formDetail.bi_sasaran_pengguna_inovasi ||
        formDetail.bc_kelompok_dibantu ||
        formDetail.sasaran_pengguna ||
        formDetail.target_pengguna
      ),
      contextAreaBantuan: cleanText(
        formDetail.bi_konteks_inovasi ||
        formDetail.bc_alasan_memilih_area_bantuan ||
        formDetail.konteks_inovasi ||
        formDetail.area_bantuan
      ),
      problemWorthSolving: cleanText(
        formDetail.bi_permasalahan_utama ||
        formDetail.bc_analisis_situasi ||
        formDetail.permasalahan_utama ||
        formDetail.akar_masalah
      ),
      hmw: cleanText(
        formDetail.bi_how_might_we ||
        formDetail.bc_how_might_we ||
        formDetail.how_might_we ||
        formDetail.rumusan_hmw
      ),
      businessOpportunity: cleanText(
        formDetail.bi_potensi_dampak_finansial ||
        formDetail.bc_analisis_manfaat_finansial ||
        formDetail.potensi_manfaat ||
        formDetail.manfaat_finansial
      ),
      solusiAwal: cleanText(
        formDetail.bi_gambaran_ide_solusi ||
        formDetail.bc_gambaran_ide_solusi ||
        formDetail.ide_solusi ||
        formDetail.deskripsi_solusi ||
        submisi.deskripsi_lengkap
      ),
      desirabilityHypothesis: cleanText(
        formDetail.bi_target_adopsi_pengguna ||
        formDetail.bc_target_kelompok_terbantu ||
        formDetail.target_adopsi
      ),
      feasibilityHypothesis: cleanText(
        formDetail.bi_aspek_teknologi ||
        formDetail.bc_kebutuhan_integrasi_sistem ||
        formDetail.aspek_teknis
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

    for (const [fieldKey, autoValue] of Object.entries(mapping)) {
      if (autoValue && (!resultCharter[fieldKey] || resultCharter[fieldKey].trim() === "")) {
        resultCharter[fieldKey] = autoValue;
        autoFilledFields.push(fieldKey);
      }
    }

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
    const existingAssignments: Array<{
      id: string;
      roleId: string;
      roleCode: string;
      roleName: string;
      userId: string | null;
      userName: string;
      userEmail: string;
    }> = (await db
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
      .where(eq(userRoleTim.timInovatorId, timId))) as any;

    const existingAnggota = await db
      .select()
      .from(anggotaTim)
      .where(eq(anggotaTim.timInovatorId, timId));

    // Check if team has dossier with proposal members to pre-populate Inisiator & Co-creators if not assigned
    const [teamDossier] = await db
      .select()
      .from(dossierPiaArchive)
      .where(eq(dossierPiaArchive.timInovatorId, timId))
      .limit(1);

    if (teamDossier && teamDossier.snapshotData) {
      const snap = teamDossier.snapshotData as any;
      const submisi = snap.data_submisi || snap;
      const inisiatorRole = allRoles.find((r) => r.kodeRole === "inisiator");
      const coCreatorRole = allRoles.find((r) => r.kodeRole === "co_creator");

      const hasInisiator = existingAssignments.some((a) => a.roleCode === "inisiator");
      const hasCoCreator = existingAssignments.some((a) => a.roleCode === "co_creator");

      // Auto-suggest Inisiator
      if (!hasInisiator && inisiatorRole) {
        const pengusulNama = cleanText(submisi.pengusul?.nama || submisi.nama_pengusul || submisi.proposer_name);
        const rawEmail = submisi.pengusul?.email || submisi.email_pengusul || submisi.proposer_email;
        const pengusulEmail = (rawEmail && rawEmail.includes("@")) ? rawEmail.trim().toLowerCase() : (pengusulNama ? formatPegadaianEmail(pengusulNama) : null);
        const pengusulJabatan = cleanText(submisi.pengusul?.jabatan || "Inisiator");
        const pengusulUnit = cleanText(submisi.pengusul?.unit_kerja || "PT Pegadaian");

        if (pengusulNama && pengusulEmail) {
          const [foundUser] = await db.select().from(users).where(eq(users.email, pengusulEmail)).limit(1);
          existingAssignments.push({
            id: `suggested-inisiator-${foundUser?.id || "new"}`,
            roleId: inisiatorRole.id,
            roleCode: "inisiator",
            roleName: inisiatorRole.namaRole,
            userId: foundUser?.id || null,
            userName: pengusulNama,
            userEmail: pengusulEmail,
          });

          if (!existingAnggota.some((a) => a.nama.toLowerCase() === pengusulNama.toLowerCase())) {
            existingAnggota.push({
              id: `suggested-ang-inisiator`,
              timInovatorId: timId,
              userId: foundUser?.id || null,
              nama: pengusulNama,
              jabatan: pengusulJabatan,
              unitKerja: pengusulUnit,
              komitmenDukungan: `Role: Inisiator`,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      // Auto-suggest Co-creators
      if (!hasCoCreator && coCreatorRole) {
        const rawMembers = submisi.team_members || snap.team_members || submisi.anggota_tim || [];
        if (Array.isArray(rawMembers)) {
          for (let i = 0; i < rawMembers.length; i++) {
            const m = rawMembers[i];
            let mNama = "";
            let mEmail = "";
            let mJabatan = "Co-creator";
            let mUnit = "PT Pegadaian";

            if (typeof m === "string") {
              mNama = cleanText(m);
              mEmail = formatPegadaianEmail(mNama);
            } else if (typeof m === "object" && m !== null) {
              mNama = cleanText(m.nama || m.name);
              mEmail = (m.email && m.email.includes("@")) ? m.email.trim().toLowerCase() : (mNama ? formatPegadaianEmail(mNama) : "");
              mJabatan = cleanText(m.jabatan || "Co-creator");
              mUnit = cleanText(m.unit_kerja || m.unitKerja || "PT Pegadaian");
            }

            if (mNama && mEmail) {
              const [foundMemberUser] = await db.select().from(users).where(eq(users.email, mEmail)).limit(1);
              existingAssignments.push({
                id: `suggested-co-creator-${i}-${foundMemberUser?.id || "new"}`,
                roleId: coCreatorRole.id,
                roleCode: "co_creator",
                roleName: coCreatorRole.namaRole,
                userId: foundMemberUser?.id || null,
                userName: mNama,
                userEmail: mEmail,
              });

              if (!existingAnggota.some((a) => a.nama.toLowerCase() === mNama.toLowerCase())) {
                existingAnggota.push({
                  id: `suggested-ang-cocreator-${i}`,
                  timInovatorId: timId,
                  userId: foundMemberUser?.id || null,
                  nama: mNama,
                  jabatan: mJabatan,
                  unitKerja: mUnit,
                  komitmenDukungan: `Role: Co-creator`,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
          }
        }
      }
    }

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

    // 2. Track newly created accounts from proposal data
    const createdAccounts: Array<{ nama: string; email: string; roleName: string }> = [];

    // Check if team has dossier for auto-create Inisiator / Co-creator accounts
    const [teamDossier] = await db
      .select()
      .from(dossierPiaArchive)
      .where(eq(dossierPiaArchive.timInovatorId, timId))
      .limit(1);

    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.kodeRole, r]));

    const inisiatorRole = roleMap.get("inisiator");
    const coCreatorRole = roleMap.get("co_creator");

    let currentRoleAssignments = Array.isArray(roleAssignments) ? [...roleAssignments] : [];

    // Auto-create accounts if team has dossier attached
    if (teamDossier && teamDossier.snapshotData) {
      const snap = teamDossier.snapshotData as any;
      const submisi = snap.data_submisi || snap;

      const hasInisiator = currentRoleAssignments.some((r) => r.roleCode === "inisiator" && r.userId);
      const hasCoCreator = currentRoleAssignments.some((r) => r.roleCode === "co_creator" && r.userId);

      // A. Inisiator Auto-create
      if (!hasInisiator && inisiatorRole) {
        const pengusulNama = cleanText(submisi.pengusul?.nama || submisi.nama_pengusul || submisi.proposer_name);
        const rawEmail = submisi.pengusul?.email || submisi.email_pengusul || submisi.proposer_email;
        const pengusulEmail = (rawEmail && rawEmail.includes("@")) ? rawEmail.trim().toLowerCase() : (pengusulNama ? formatPegadaianEmail(pengusulNama) : null);
        const pengusulJabatan = cleanText(submisi.pengusul?.jabatan || "Inisiator");
        const pengusulUnit = cleanText(submisi.pengusul?.unit_kerja || "PT Pegadaian");

        if (pengusulNama && pengusulEmail) {
          const userResult = await ensureUserAccount(pengusulNama, pengusulEmail);
          if (userResult) {
            if (userResult.isNew) {
              createdAccounts.push({
                nama: pengusulNama,
                email: pengusulEmail,
                roleName: "Inisiator",
              });
            }

            // Remove any placeholder without userId
            currentRoleAssignments = currentRoleAssignments.filter((r) => r.roleCode !== "inisiator" || r.userId);
            currentRoleAssignments.push({
              id: `auto-inisiator-${userResult.user.id}`,
              roleCode: "inisiator",
              userId: userResult.user.id,
              userName: userResult.user.nama,
              userEmail: userResult.user.email,
              jabatan: pengusulJabatan,
              unitKerja: pengusulUnit,
            });
          }
        }
      }

      // B. Co-creators Auto-create
      if (!hasCoCreator && coCreatorRole) {
        const rawMembers = submisi.team_members || snap.team_members || submisi.anggota_tim || [];
        if (Array.isArray(rawMembers)) {
          // Remove any placeholder without userId
          currentRoleAssignments = currentRoleAssignments.filter((r) => r.roleCode !== "co_creator" || r.userId);

          for (const m of rawMembers) {
            let mNama = "";
            let mEmail = "";
            let mJabatan = "Co-creator";
            let mUnit = "PT Pegadaian";

            if (typeof m === "string") {
              mNama = cleanText(m);
              mEmail = formatPegadaianEmail(mNama);
            } else if (typeof m === "object" && m !== null) {
              mNama = cleanText(m.nama || m.name);
              mEmail = (m.email && m.email.includes("@")) ? m.email.trim().toLowerCase() : (mNama ? formatPegadaianEmail(mNama) : "");
              mJabatan = cleanText(m.jabatan || "Co-creator");
              mUnit = cleanText(m.unit_kerja || m.unitKerja || "PT Pegadaian");
            }

            if (mNama && mEmail) {
              const memberUserResult = await ensureUserAccount(mNama, mEmail);
              if (memberUserResult) {
                if (memberUserResult.isNew) {
                  createdAccounts.push({
                    nama: mNama,
                    email: mEmail,
                    roleName: "Co-creator",
                  });
                }

                currentRoleAssignments.push({
                  id: `auto-co-creator-${memberUserResult.user.id}`,
                  roleCode: "co_creator",
                  userId: memberUserResult.user.id,
                  userName: memberUserResult.user.nama,
                  userEmail: memberUserResult.user.email,
                  jabatan: mJabatan,
                  unitKerja: mUnit,
                });
              }
            }
          }
        }
      }
    }

    // 3. Process Role & Accountability Assignments
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

      const submittedItems = currentRoleAssignments.filter(
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

    // 4. Auto-generate Initial Backlog on first Charter save (Roadmap + 15 Baku CV/MV Tasks)
    const existingCards = await db
      .select({ id: kanbanCard.id })
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId))
      .limit(1);

    if (existingCards.length === 0) {
      const cardsToInsert: Array<typeof kanbanCard.$inferInsert> = [];
      let cardUrutan = 1;

      // A. Draf Roadmap Cards (from Proposal Data if dossier exists)
      if (teamDossier && teamDossier.snapshotData) {
        const snap = teamDossier.snapshotData as any;
        const submisi = snap.data_submisi || snap;
        const formDetail = submisi.form_detail || {};

        const judulSolusi = cleanText(submisi.judul || snap.judul_inovasi || "Inovasi");

        cardsToInsert.push({
          timInovatorId: timId,
          judul: `Kickoff & Penyelarasan Problem Space — ${judulSolusi.substring(0, 40)}`,
          deskripsi: `Memvalidasi ulang temuan masalah, HMW, dan sasaran pengguna awal bersama Inisiator dan Promotor.`,
          statusKolom: "To Do",
          tahap: "innovation_setup",
          sprintNumber: null,
          label: "Draf Roadmap",
          urutan: cardUrutan++,
        });

        cardsToInsert.push({
          timInovatorId: timId,
          judul: `Penyusunan Desain Konseptual & Arsitektur Solusi MVP`,
          deskripsi: `Merumuskan cakupan fitur inti yang akan diuji pada fase Customer Validation & Market Validation.`,
          statusKolom: "To Do",
          tahap: "innovation_setup",
          sprintNumber: null,
          label: "Draf Roadmap",
          urutan: cardUrutan++,
        });

        if (formDetail.kebutuhan_dukungan || formDetail.bi_sumber_daya || formDetail.bc_sumber_daya_diperlukan) {
          cardsToInsert.push({
            timInovatorId: timId,
            judul: `Konsolidasi Kebutuhan Resource & Koordinasi SME`,
            deskripsi: cleanText(formDetail.kebutuhan_dukungan || formDetail.bi_sumber_daya || formDetail.bc_sumber_daya_diperlukan),
            statusKolom: "To Do",
            tahap: "innovation_setup",
            sprintNumber: null,
            label: "Draf Roadmap",
            urutan: cardUrutan++,
          });
        }
      }

      // B. 7 Baku Customer Validation Tasks
      const bakuCVTasks = [
        {
          judul: "Susun Perencanaan Customer Validation",
          deskripsi: "Menentukan hipotesis value proposition yang akan diuji, profil early adopters sasaran, dan metodologi pengujian (interview / usability testing / survey).",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Siapkan prototype untuk testing",
          deskripsi: "Menyiapkan mockup, clickable prototype, atau instrumen demonstrasi solusi yang siap diuji ke responden.",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Rekrut early adopters/responden",
          deskripsi: "Menghubungi dan menjadwalkan sesi interaksi dengan minimal 5-10 target pengguna representatif.",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Lakukan sesi user testing",
          deskripsi: "Menjalankan sesi testing, mencatat feedback kualitatif 4 dimensi (problem, solution, usability, willingness to use/pay).",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Analisis hasil & isi Laporan Customer Validation",
          deskripsi: "Merekap skor dimensi, temuan kualitatif utama, dan mengukur ketercapaian target metrik PSF.",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Preliminary Review (SME)",
          deskripsi: "Meminta review dan catatan rekomendasi dari Subject Matter Expert / Coach terhadap hasil Customer Validation.",
          tahap: "customer_validation" as const,
        },
        {
          judul: "Tentukan keputusan Fit/Tidak Fit",
          deskripsi: "Menetapkan keputusan fase CV: 'Lanjut ke Market Validation' (Fit), 'Iterasi Customer Validation' (Iterasi), atau 'Pivot/Drop'.",
          tahap: "customer_validation" as const,
        },
      ];

      for (const t of bakuCVTasks) {
        cardsToInsert.push({
          timInovatorId: timId,
          judul: t.judul,
          deskripsi: t.deskripsi,
          statusKolom: "To Do",
          tahap: t.tahap,
          sprintNumber: null,
          label: "Template Baku CV",
          urutan: cardUrutan++,
        });
      }

      // C. 8 Baku Market Validation Tasks
      const bakuMVTasks = [
        {
          judul: "Susun Perencanaan Market Validation",
          deskripsi: "Menentukan parameter pilot project, target adopsi pasar, dan metrik Product-Market Fit (PMF).",
          tahap: "market_validation" as const,
        },
        {
          judul: "MVP Planning",
          deskripsi: "Mendefinisikan spesifikasi fitur MVP versi rilis dan alokasi resource kebutuhan implementasi.",
          tahap: "market_validation" as const,
        },
        {
          judul: "MVP Development",
          deskripsi: "Pengembangan teknis/operasional solusi MVP siap pakai untuk lingkungan pilot uji coba.",
          tahap: "market_validation" as const,
        },
        {
          judul: "MVP Release",
          deskripsi: "Meluncurkan versi MVP ke kelompok pengguna pilot dan mencatat release log resmi.",
          tahap: "market_validation" as const,
        },
        {
          judul: "Market Testing (ukur metrik DFV)",
          deskripsi: "Memantau adopsi riil pengguna dan merekapitulasi metrik Desirability, Feasibility, dan Viability.",
          tahap: "market_validation" as const,
        },
        {
          judul: "Preliminary Review (SME)",
          deskripsi: "Sesi review evaluasi berkala bersama SME & Coach mengenai temuan performa pasar MVP.",
          tahap: "market_validation" as const,
        },
        {
          judul: "Analisis hasil & isi Laporan Market Validation",
          deskripsi: "Menyusun evaluasi komprehensif PMF, sprint review retrospektif, dan rekomendasi skala implementasi.",
          tahap: "market_validation" as const,
        },
        {
          judul: "Persiapan Forum Manajemen Inovasi",
          deskripsi: "Menyiapkan materi paparan executive summary DFV dan rekomendasi tindak lanjut untuk Dewan Direksi / FMI.",
          tahap: "market_validation" as const,
        },
      ];

      for (const t of bakuMVTasks) {
        cardsToInsert.push({
          timInovatorId: timId,
          judul: t.judul,
          deskripsi: t.deskripsi,
          statusKolom: "To Do",
          tahap: t.tahap,
          sprintNumber: null,
          label: "Template Baku MV",
          urutan: cardUrutan++,
        });
      }

      if (cardsToInsert.length > 0) {
        await db.insert(kanbanCard).values(cardsToInsert);
      }
    }

    // 5. Log audit
    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CHARTER_UPDATE",
      entity: "charter",
      entityId: charterId || timId,
      details: {
        timId,
        hasRoleAssignments: Boolean(currentRoleAssignments.length),
        createdAccountsCount: createdAccounts.length,
      },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/overview`);
    revalidatePath(`/admin/roles`);

    const updatedRoles = await getCharterRolesData(timId);

    return {
      success: true,
      createdAccounts,
      updatedRolesData: updatedRoles.success ? updatedRoles : null,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan Innovation Charter." };
  }
}

export async function approveCharterAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "charter.approve", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin sebagai Promotor untuk menyetujui Innovation Charter tim ini.",
      };
    }

    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);

    const ttdData = {
      nama: user.nama,
      jabatan: "Promotor Tim Inovasi",
      tanggal: new Date().toISOString(),
      email: user.email,
      disetujui: true,
    };

    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);

    if (existing) {
      await db.update(charter).set({
        ttdDisetujui: ttdData,
        updatedAt: new Date(),
      }).where(eq(charter.id, existing.id));
    } else {
      await db.insert(charter).values({
        timInovatorId: timId,
        ttdDisetujui: ttdData,
      });
    }

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CHARTER_APPROVE",
      entity: "charter",
      entityId: existing?.id || timId,
      details: { timId, timNama: tim?.namaProyekInovasi, approvedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true, ttdDisetujui: ttdData };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyetujui Charter." };
  }
}

export async function saveCharterSprintsAction(
  timId: string,
  sprintList: Array<{
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
        error: "Forbidden: Anda tidak memiliki izin untuk mengedit Sprint tim ini.",
      };
    }

    const { sprint: sprintTable } = await import("@/lib/db/schema");

    for (const item of sprintList) {
      const [existingSprint] = await db
        .select()
        .from(sprintTable)
        .where(
          and(
            eq(sprintTable.timInovatorId, timId),
            eq(sprintTable.nomorSprint, item.nomorSprint)
          )
        )
        .limit(1);

      if (existingSprint) {
        await db
          .update(sprintTable)
          .set({
            tanggalMulaiRencana: item.tanggalMulaiRencana ? new Date(item.tanggalMulaiRencana) : null,
            tanggalSelesaiRencana: item.tanggalSelesaiRencana ? new Date(item.tanggalSelesaiRencana) : null,
            tujuan: item.tujuan || `Sprint ${item.nomorSprint}`,
            updatedAt: new Date(),
          })
          .where(eq(sprintTable.id, existingSprint.id));
      } else {
        await db.insert(sprintTable).values({
          timInovatorId: timId,
          nomorSprint: item.nomorSprint,
          status: "belum_dimulai",
          tanggalMulaiRencana: item.tanggalMulaiRencana ? new Date(item.tanggalMulaiRencana) : null,
          tanggalSelesaiRencana: item.tanggalSelesaiRencana ? new Date(item.tanggalSelesaiRencana) : null,
          tujuan: item.tujuan || `Sprint ${item.nomorSprint}`,
        });
      }
    }

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan jadwal sprint." };
  }
}

export async function revokeCharterApprovalAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const allowed = await hasPermission(user, "charter.approve", timId);
    if (!allowed) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk membatalkan persetujuan Innovation Charter tim ini.",
      };
    }

    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);

    await db
      .update(charter)
      .set({
        ttdDisetujui: null,
        updatedAt: new Date(),
      })
      .where(eq(charter.timInovatorId, timId));

    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: "CHARTER_REVOKE_APPROVAL",
      entity: "charter",
      entityId: timId,
      details: { timId, timNama: tim?.namaProyekInovasi, revokedBy: user.nama },
    });

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan persetujuan Charter." };
  }
}
