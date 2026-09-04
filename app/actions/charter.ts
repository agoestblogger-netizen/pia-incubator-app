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
  kanbanSubtask,
  taskAttachment,
  timInovator,
  sprint,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/db/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAiCharterFields } from "@/lib/ai/charter-generator";
import { generateAiBacklogFromRoadmap, AiBacklogTask } from "@/lib/ai/backlog-generator";
import { getPredefinedSubtasks } from "@/lib/data/subtask-templates";

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
  usulanPoHint: string | null;
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
    klasifikasiStrategisInovasi: "",
    ttdDisetujui: null,
  };

  if (hasDossier) {
    const snap = dossier.snapshotData as any;
    const submisi = snap.data_submisi || snap;
    const formDetail = submisi.form_detail || {};
    const hasilGrandFinal = snap.hasil_grand_final || submisi.hasil_grand_final || null;

    // 1. Check if AI charter has already been generated and cached in snapshotData
    let aiFields = snap.ai_generated_charter as any;

    // 2. If not generated and OPENAI_API_KEY is present, generate it via OpenAI (Runs ONCE per team)
    if (!aiFields && process.env.OPENAI_API_KEY && !data) {
      try {
        const generated = await generateAiCharterFields({
          teamId: timId,
          proposalId: dossier.proposalIdAsli || snap.proposal_id || timId,
          namaProyek: submisi.judul || snap.judul_inovasi || 'Proyek Inovasi',
          kategoriPia: submisi.kategori_pia || 'BI',
          rawProposalData: {
            judul: submisi.judul || snap.judul_inovasi,
            kategori: submisi.kategori_pia,
            tema: submisi.tema,
            form_detail: formDetail,
            data_submisi: submisi,
            hasil_grand_final: hasilGrandFinal,
          },
          hasilGrandFinal,
        });

        if (generated) {
          aiFields = generated;
          // Persist into dossierPiaArchive so subsequent loads do not call AI again
          await db
            .update(dossierPiaArchive)
            .set({
              snapshotData: {
                ...snap,
                ai_generated_charter: generated,
              },
              updatedAt: new Date(),
            })
            .where(eq(dossierPiaArchive.id, dossier.id));
        }
      } catch (aiErr: any) {
        console.warn(`[getCharterByTimId] AI generation fallback to static mapping:`, aiErr.message);
      }
    }

    const mapping: Record<string, string> = {
      projectMission: cleanText(
        hasilGrandFinal?.big_why_mission ||
        submisi.judul ||
        submisi.tema ||
        snap.judul_inovasi
      ),
      customerEarlyAdopters: cleanText(
        aiFields?.customerEarlyAdopters ||
        [
          hasilGrandFinal?.customer_context?.target_pengguna,
          hasilGrandFinal?.customer_context?.customer_insight ? `Insight Pelanggan:\n${hasilGrandFinal.customer_context.customer_insight}` : null,
        ].filter(Boolean).join('\n\n') ||
        [
          formDetail.kelompok_dibantu || formDetail.bi_sasaran_pengguna_inovasi || formDetail.bc_kelompok_dibantu || formDetail.sasaran_pengguna,
          formDetail.alasan_memilih_sasaran || formDetail.bi_alasan_memilih_sasaran || formDetail.bc_alasan_memilih_area_bantuan,
        ].filter(Boolean).join('\n\nAlasan Pemilihan:\n')
      ),
      contextAreaBantuan: cleanText(
        aiFields?.contextAreaBantuan ||
        hasilGrandFinal?.customer_context?.context_chosen ||
        [
          formDetail.konteks_inovasi || formDetail.bi_konteks_inovasi,
          formDetail.alasan_konteks_inovasi || formDetail.bi_alasan_konteks_inovasi || formDetail.bc_alasan_memilih_area_bantuan,
        ].filter(Boolean).join('\n\nAlasan Konteks:\n')
      ),
      problemWorthSolving: cleanText(
        aiFields?.problemWorthSolving ||
        [
          hasilGrandFinal?.problem?.pernyataan_masalah,
          hasilGrandFinal?.problem?.bukti_masalah ? `Bukti Masalah:\n${hasilGrandFinal.problem.bukti_masalah}` : null,
          hasilGrandFinal?.problem?.kenapa_penting ? `Urgensi Penyelesaian:\n${hasilGrandFinal.problem.kenapa_penting}` : null,
        ].filter(Boolean).join('\n\n') ||
        [
          formDetail.masalah_sasaran || formDetail.bi_masalah_diselesaikan || formDetail.bc_masalah_sasaran_inovasi,
          formDetail.masalah_penting_karena || formDetail.bi_masalah_penting_karena || formDetail.bc_alasan_penting_diselesaikan || formDetail.detil_permasalahan || formDetail.bc_detil_permasalahan,
        ].filter(Boolean).join('\n\nUrgensi / Alasan Penting Diselesaikan:\n')
      ),
      hmw: cleanText(
        aiFields?.hmw ||
        formDetail.hmw ||
        formDetail.bi_how_might_we ||
        formDetail.bc_how_might_we ||
        formDetail.how_might_we
      ),
      opportunityStatement: cleanText(
        aiFields?.opportunityStatement ||
        hasilGrandFinal?.problem?.relevansi_bisnis ||
        formDetail.target_non_finansial ||
        formDetail.bi_target_non_finansial ||
        formDetail.bc_target_capaian_non_finansial
      ),
      businessOpportunity: cleanText(
        aiFields?.businessOpportunity ||
        hasilGrandFinal?.business_impact ||
        [
          formDetail.target_finansial || formDetail.bi_target_finansial || formDetail.bc_target_capaian_finansial,
          formDetail.target_non_finansial || formDetail.bi_target_non_finansial || formDetail.bc_target_capaian_non_finansial,
        ].filter(Boolean).join('\n\nDampak Non-Finansial:\n')
      ),
      solusiAwal: cleanText(
        aiFields?.solusiAwal ||
        hasilGrandFinal?.solution ||
        [
          formDetail.solusi_diusulkan || formDetail.bi_inovasi_diusulkan || formDetail.bc_eksplorasi_solusi || submisi.deskripsi_lengkap,
          formDetail.inovasi_dapat_menyelesaikan || formDetail.bi_inovasi_dapat_menyelesaikan,
        ].filter(Boolean).join('\n\nCara Penyelesaian:\n')
      ),
      desirabilityHypothesis: cleanText(
        aiFields?.desirabilityHypothesis ||
        (hasilGrandFinal?.customer_context?.target_pengguna && hasilGrandFinal?.solution
          ? `Kami meyakini bahwa ${hasilGrandFinal.customer_context.target_pengguna} membutuhkan ${hasilGrandFinal.solution}`
          : '') ||
        formDetail.target_non_finansial ||
        formDetail.bi_target_non_finansial ||
        formDetail.bc_target_capaian_non_finansial ||
        formDetail.kelompok_dibantu ||
        formDetail.bi_sasaran_pengguna_inovasi
      ),
      feasibilityHypothesis: cleanText(
        aiFields?.feasibilityHypothesis ||
        (Array.isArray(hasilGrandFinal?.fitur_utama)
          ? `Dapat diwujudkan melalui arsitektur fitur utama:\n- ${hasilGrandFinal.fitur_utama.join('\n- ')}`
          : hasilGrandFinal?.fitur_utama) ||
        [
          formDetail.keunikan || formDetail.bi_keunikan_penyelesaian || formDetail.bc_inovasi_harus_memiliki_kebaruan,
          formDetail.detil_cara_kerja || formDetail.bi_diwujudkan_dengan_cara || formDetail.bi_dengan_cara || formDetail.bc_detil_cara_kerja,
        ].filter(Boolean).join('\n\nPerwujudan Teknis / Cara Kerja:\n')
      ),
      viabilityHypothesis: cleanText(
        aiFields?.viabilityHypothesis ||
        hasilGrandFinal?.business_impact ||
        formDetail.target_finansial ||
        formDetail.bi_target_finansial ||
        formDetail.bc_target_capaian_finansial
      ),
      kebutuhanDukungan: cleanText(
        aiFields?.kebutuhanDukungan ||
        hasilGrandFinal?.support_needed ||
        formDetail.sumber_daya ||
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

    function extractStrictRoleHints(rawText?: string | null): {
      promotorSuggestion: string | null;
      poSuggestion: string | null;
    } {
      if (!rawText) return { promotorSuggestion: null, poSuggestion: null };

      const clean = rawText
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, ' ');

      const promotorIdx = clean.search(/Usulan\s*Promotor/i);
      let textToSearch = clean;
      if (promotorIdx !== -1) {
        const endMatch = clean.substring(promotorIdx).search(/(?:\n\s*\n|Keunikan\s*dari|Cara\s*sasaran|Target\s*Capaian|Proposal\s*Resubmission)/i);
        textToSearch = endMatch !== -1 ? clean.substring(promotorIdx, promotorIdx + endMatch) : clean.substring(promotorIdx, promotorIdx + 500);
      }

      let poCandidate: string | null = null;
      let promotorCandidate: string | null = null;

      const cleanSnippet = (str: string) => {
        return str
          .replace(/^Usulan\s*Promotor\s*(?:untuk\s*ide\s*inovasi\s*ini)?\s*[:\-]?\s*/i, '')
          .replace(/^Kami\s*memilih\s*(?:bapak|ibu)?\s*/i, '')
          .replace(/(?:Diusulkan\s+sebagai|sebagai\s+promotor|karena\s+bisa|karena\s+memiliki|Alasan\s*:|Kenapa\s+bisa).*$/i, '')
          .replace(/Jabatan\s*:\s*/gi, '')
          .replace(/Unit\s*Kerja\s*:\s*/gi, '')
          .replace(/Nama\s*:\s*/gi, '')
          .replace(/\s+/g, ' ')
          .replace(/[,\s]+$/, '')
          .trim();
      };

      // 1. Check for Kepala Departemen / Kadep (Candidate for Project Owner)
      if (/Kepala\s*Departemen|Kepala\s*Dept|Kadep/i.test(textToSearch)) {
        const kvMatch = textToSearch.match(/Nama\s*:\s*([^,\n\r]+)[^,\n\r]*?Jabatan\s*:\s*(Kepala\s*Departemen[^\n\r]*?)(?:Unit\s*Kerja\s*:\s*([^,\n\r]+))?(?:\n|Alasan|$)/i);
        if (kvMatch) {
          const name = kvMatch[1].trim();
          const jabatan = kvMatch[2].trim();
          const unit = kvMatch[3]?.trim();
          poCandidate = `${name}, ${jabatan}${unit ? `, ${unit}` : ''}`;
        } else {
          const natMatch = textToSearch.match(/([A-Z][a-zA-Z\s\.]*?,?\s*Kepala\s*Departemen[^\n\r,\.;]*(?:,?\s*Divisi[^\n\r,\.;]*)?)/i);
          if (natMatch && natMatch[1]) {
            poCandidate = cleanSnippet(natMatch[1]);
          }
        }
      }

      // 2. Check for Kepala Divisi / Kadiv (Candidate for Promotor)
      if (/Kepala\s*Divisi|Kadiv/i.test(textToSearch) && !/Kepala\s*Departemen/i.test(textToSearch.match(/Kepala\s*Divisi/i)?.[0] || '')) {
        const kvMatch = textToSearch.match(/Nama\s*:\s*([^,\n\r●○]+)[^,\n\r●○]*?Jabatan\s*:\s*(Kepala\s*Divisi[^\n\r●○]*?)(?:Unit\s*Kerja\s*:\s*([^,\n\r●○]+))?(?:\n|Alasan|Kenapa|Divisi|$)/i);
        if (kvMatch) {
          const name = kvMatch[1].replace(/^[●○\s]+/, '').trim();
          const jabatan = kvMatch[2].trim();
          const unit = kvMatch[3]?.trim();
          promotorCandidate = `${name}, ${jabatan}${unit ? `, ${unit}` : ''}`;
        } else {
          const natMatch = textToSearch.match(/([A-Z][a-zA-Z\s\.]*?(?:,|bapak|ibu|\s)\s*Kepala\s*Divisi[^\n\r,\.;]*(?:,?\s*(?:Unit\s*Kerja\s*:|Divisi|PT)[^\n\r,\.;]*)?)/i);
          if (natMatch && natMatch[1]) {
            promotorCandidate = cleanSnippet(natMatch[1]);
          }
        }
      }

      // Filter out any Deputy / non-matching names
      if (poCandidate && /Darma\s*Satria|Deputy/i.test(poCandidate)) {
        poCandidate = poCandidate.split(/Darma\s*Satria|Deputy/i)[0].replace(/[,\s]+$/, '').trim();
      }
      if (promotorCandidate && /Darma\s*Satria|Deputy/i.test(promotorCandidate)) {
        promotorCandidate = promotorCandidate.split(/Darma\s*Satria|Deputy/i)[0].replace(/[,\s]+$/, '').trim();
      }

      return {
        promotorSuggestion: promotorCandidate && promotorCandidate.length > 5 ? promotorCandidate : null,
        poSuggestion: poCandidate && poCandidate.length > 5 ? poCandidate : null,
      };
    }

    const fullProposalText =
      submisi.resubmit_document_text ||
      snap.resubmit_document_text ||
      formDetail.usulan_promotor ||
      formDetail.promotor_diusulkan ||
      submisi.usulan_promotor ||
      '';

    const { promotorSuggestion, poSuggestion } = extractStrictRoleHints(fullProposalText);

    usulanPromotorHint = promotorSuggestion ? cleanText(promotorSuggestion) : null;
    const usulanPoHint = poSuggestion ? cleanText(poSuggestion) : null;

    return {
      charter: resultCharter,
      autoFilledFields,
      usulanPromotorHint,
      usulanPoHint,
      hasDossier,
    };
  }

  return {
    charter: resultCharter,
    autoFilledFields,
    usulanPromotorHint,
    usulanPoHint: null,
    hasDossier,
  };
}

export async function getCharterRolesData(
  timId: string,
  skipDossierOrAnggota?: boolean | any[],
  maybeSkipDossier: boolean = false
) {
  const skipDossier = typeof skipDossierOrAnggota === 'boolean' 
    ? skipDossierOrAnggota 
    : maybeSkipDossier;
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
    let teamDossier: any = null;
    if (!skipDossier) {
      const foundDossier = await Promise.race([
        db
          .select()
          .from(dossierPiaArchive)
          .where(eq(dossierPiaArchive.timInovatorId, timId))
          .limit(1)
          .then((r) => r[0]),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000)),
      ]);
      teamDossier = foundDossier;
    }

    if (teamDossier && teamDossier.snapshotData) {
      const snap = teamDossier.snapshotData as any;
      const submisi = snap.data_submisi || snap;
      const inisiatorRole = allRoles.find((r) => r.kodeRole === "inisiator");
      const coCreatorRole = allRoles.find((r) => r.kodeRole === "co_creator");

      const hasInisiator = existingAssignments.some((a) => a.roleCode === "inisiator");
      const hasCoCreator = existingAssignments.some((a) => a.roleCode === "co_creator");

      // Auto-suggest Inisiator (Seluruh anggota tim dari proposal: Pengusul + rawMembers)
      if (!hasInisiator && inisiatorRole) {
        const pengusulNama = cleanText(submisi.pengusul?.nama || submisi.nama_pengusul || submisi.proposer_name);
        const rawEmail = submisi.pengusul?.email || submisi.email_pengusul || submisi.proposer_email;
        const pengusulEmail = (rawEmail && rawEmail.includes("@")) ? rawEmail.trim().toLowerCase() : (pengusulNama ? formatPegadaianEmail(pengusulNama) : null);
        const pengusulJabatan = cleanText(submisi.pengusul?.jabatan || "Inisiator");
        const pengusulUnit = cleanText(submisi.pengusul?.unit_kerja || "PT Pegadaian (Persero)");

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

        // Anggota tim lainnya juga dimasukkan ke Inisiator (multi-orang)
        const rawMembers = submisi.team_members || snap.team_members || submisi.anggota_tim || [];
        if (Array.isArray(rawMembers)) {
          for (let i = 0; i < rawMembers.length; i++) {
            const m = rawMembers[i];
            let mNama = "";
            let mEmail = "";
            let mJabatan = "Anggota Tim";
            let mUnit = "PT Pegadaian (Persero)";

            if (typeof m === "string") {
              mNama = cleanText(m);
              mEmail = formatPegadaianEmail(mNama);
            } else if (typeof m === "object" && m !== null) {
              mNama = cleanText(m.nama || m.name);
              mEmail = (m.email && m.email.includes("@")) ? m.email.trim().toLowerCase() : (mNama ? formatPegadaianEmail(mNama) : "");
              mJabatan = cleanText(m.jabatan || "Anggota Tim");
              mUnit = cleanText(m.unit_kerja || m.unitKerja || "PT Pegadaian (Persero)");
            }

            if (pengusulNama && mNama.toLowerCase() === pengusulNama.toLowerCase()) {
              continue;
            }

            if (mNama && mEmail) {
              const [foundMemberUser] = await db.select().from(users).where(eq(users.email, mEmail)).limit(1);
              existingAssignments.push({
                id: `suggested-inisiator-${i}-${foundMemberUser?.id || "new"}`,
                roleId: inisiatorRole.id,
                roleCode: "inisiator",
                roleName: inisiatorRole.namaRole,
                userId: foundMemberUser?.id || null,
                userName: mNama,
                userEmail: mEmail,
              });

              if (!existingAnggota.some((a) => a.nama.toLowerCase() === mNama.toLowerCase())) {
                existingAnggota.push({
                  id: `suggested-ang-inisiator-${i}`,
                  timInovatorId: timId,
                  userId: foundMemberUser?.id || null,
                  nama: mNama,
                  jabatan: mJabatan,
                  unitKerja: mUnit,
                  komitmenDukungan: `Role: Inovator`,
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

    const isAdmin = Boolean(
      user.globalRoles.some((r) => ['super_admin', 'admin_ic', 'admin'].includes(r))
    );
    const isCoach = Boolean(
      user.timRoles.some((tr) => tr.timId === timId && tr.roleCode === 'coach') ||
      user.globalRoles.includes('coach')
    );
    const canManageRoles = isAdmin || isCoach;

    // Strict server-side validation: only Admin and Coach can modify team role structure
    if (roleAssignments !== undefined && !canManageRoles) {
      return {
        success: false,
        error: 'Forbidden: Struktur Role & Akuntabilitas Tim hanya dapat diubah oleh Innovation Coach atau Admin.',
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

      // A. Inisiator Auto-create (Seluruh anggota tim dari proposal: Pengusul + rawMembers)
      if (!hasInisiator && inisiatorRole) {
        const pengusulNama = cleanText(submisi.pengusul?.nama || submisi.nama_pengusul || submisi.proposer_name);
        const rawEmail = submisi.pengusul?.email || submisi.email_pengusul || submisi.proposer_email;
        const pengusulEmail = (rawEmail && rawEmail.includes("@")) ? rawEmail.trim().toLowerCase() : (pengusulNama ? formatPegadaianEmail(pengusulNama) : null);
        const pengusulJabatan = cleanText(submisi.pengusul?.jabatan || "Inisiator");
        const pengusulUnit = cleanText(submisi.pengusul?.unit_kerja || "PT Pegadaian (Persero)");

        if (pengusulNama && pengusulEmail) {
          const userResult = await ensureUserAccount(pengusulNama, pengusulEmail);
          if (userResult) {
            if (userResult.isNew) {
              createdAccounts.push({
                nama: pengusulNama,
                email: pengusulEmail,
                roleName: inisiatorRole.namaRole || "Inovator",
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

        // Anggota tim lainnya juga dimasukkan ke Inisiator (multi-orang)
        const rawMembers = submisi.team_members || snap.team_members || submisi.anggota_tim || [];
        if (Array.isArray(rawMembers)) {
          for (const m of rawMembers) {
            let mNama = "";
            let mEmail = "";
            let mJabatan = "Anggota Tim";
            let mUnit = "PT Pegadaian (Persero)";

            if (typeof m === "string") {
              mNama = cleanText(m);
              mEmail = formatPegadaianEmail(mNama);
            } else if (typeof m === "object" && m !== null) {
              mNama = cleanText(m.nama || m.name);
              mEmail = (m.email && m.email.includes("@")) ? m.email.trim().toLowerCase() : (mNama ? formatPegadaianEmail(mNama) : "");
              mJabatan = cleanText(m.jabatan || "Anggota Tim");
              mUnit = cleanText(m.unit_kerja || m.unitKerja || "PT Pegadaian (Persero)");
            }

            if (pengusulNama && mNama.toLowerCase() === pengusulNama.toLowerCase()) {
              continue;
            }

            if (mNama && mEmail) {
              const memberUserResult = await ensureUserAccount(mNama, mEmail);
              if (memberUserResult) {
                if (memberUserResult.isNew) {
                  createdAccounts.push({
                    nama: mNama,
                    email: mEmail,
                    roleName: inisiatorRole.namaRole || "Inovator",
                  });
                }

                currentRoleAssignments.push({
                  id: `auto-inisiator-${memberUserResult.user.id}`,
                  roleCode: "inisiator",
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

    // 3. Process Role & Accountability Assignments (Only if user has role management permission)
    if (canManageRoles && Array.isArray(roleAssignments)) {
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
                  unitKerja: item.unitKerja || existingAnggota.unitKerja || 'PT Pegadaian (Persero)',
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
                unitKerja: item.unitKerja || 'PT Pegadaian (Persero)',
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

    // 4. Auto-generate Initial Backlog on first Charter save (Roadmap + 15 Baku CV/MV Tasks)
    await seedInitialKanbanCardsForTeam(timId, teamDossier);

    // 5. Update team status from 'calon_peserta' to 'aktif' (Peserta Aktif) upon completing Innovation Setup
    const [currentTeam] = await db
      .select({ status: timInovator.status })
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    if (currentTeam && currentTeam.status === "calon_peserta") {
      await db
        .update(timInovator)
        .set({
          status: "aktif",
          updatedAt: new Date(),
        })
        .where(eq(timInovator.id, timId));
    }

    // 6. Log audit
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
    revalidatePath(`/tim/${timId}/kanban`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/dossier`);
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

async function processSignatureImage(timId: string, imageStr?: string | null): Promise<string | null> {
  if (!imageStr) return null;
  if (!imageStr.startsWith("data:image/")) return imageStr;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "task-attachments");
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket("task-attachments", { public: true });
    }

    const base64Data = imageStr.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const storagePath = `signatures/${timId}/${Date.now()}_charter_sig.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("task-attachments")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.warn("[processSignatureImage] Storage upload error, using data URI:", uploadError.message);
      return imageStr;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("task-attachments")
      .getPublicUrl(storagePath);

    return publicUrlData?.publicUrl || imageStr;
  } catch (err: any) {
    console.warn("[processSignatureImage] Failed, fallback to data URI:", err.message);
    return imageStr;
  }
}

export async function approveCharterAction(timId: string, signatureImage?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };
    }

    const isPermitted = (await hasPermission(user, "charter.sign_promotor", timId)) || (await hasPermission(user, "charter.approve", timId));
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk menyetujui Innovation Charter tim ini.",
      };
    }

    const rolesData = await getCharterRolesData(timId);
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));

    // ── Role-gate enforcement: Admin IC bypasses identity check, per_tim requires assignment match ──
    if (!isAdmin) {
      const assignedPromotor = rolesData?.assignments?.find((r: any) => r.roleCode === "promotor");
      if (!assignedPromotor?.userId || assignedPromotor.userId !== user.id) {
        return {
          success: false,
          error: "Forbidden: Hanya pemegang role Promotor yang terdaftar di Innovation Charter tim ini yang dapat menyetujui.",
        };
      }
    }

    const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);

    const [anggota] = await db
      .select()
      .from(anggotaTim)
      .where(
        and(
          eq(anggotaTim.timInovatorId, timId),
          eq(anggotaTim.userId, user.id)
        )
      )
      .limit(1);

    const processedImageUrl = await processSignatureImage(timId, signatureImage);
    const assignedName = rolesData?.assignments?.find((r: any) => r.roleCode === "promotor")?.userName;

    const ttdData = {
      userId: user.id,
      signedByUserId: user.id,
      signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || "Promotor Tim Inovasi",
      unit: anggota?.unitKerja || "PT Pegadaian (Persero)",
      tanggal: new Date().toISOString(),
      email: user.email,
      status: "approved",
      disetujui: true,
      signatureImage: processedImageUrl,
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

    const isPermitted = (await hasPermission(user, "charter.sign_promotor", timId)) || (await hasPermission(user, "charter.approve", timId)) || (await hasPermission(user, "charter.edit", timId));
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk membatalkan persetujuan Innovation Charter tim ini.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const assignedPromotor = rolesData?.assignments?.find((r: any) => r.roleCode === "promotor");
      if (!assignedPromotor?.userId || assignedPromotor.userId !== user.id) {
        return {
          success: false,
          error: "Forbidden: Hanya pemegang role Promotor yang terdaftar di Innovation Charter tim ini yang dapat membatalkan persetujuan.",
        };
      }
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

// ── Charter PO Signature (Disusun Oleh — salah satu syarat pembuka gerbang Customer Validation) ──────────
export async function signCharterAsPoAction(timId: string, signatureImage?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const isPermitted = await hasPermission(user, "charter.sign_po", timId);
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin menandatangani Innovation Charter sebagai Project Owner.",
      };
    }

    const rolesData = await getCharterRolesData(timId);
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const assignedPo = rolesData?.assignments?.find((r: any) => r.roleCode === "project_owner");
      if (!assignedPo?.userId || assignedPo.userId !== user.id) {
        return { success: false, error: "Forbidden: Hanya pemegang role Project Owner yang terdaftar di tim ini yang dapat menandatangani bagian ini." };
      }
    }

    const [anggota] = await db.select().from(anggotaTim).where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, user.id))).limit(1);
    const processedImageUrl = await processSignatureImage(timId, signatureImage);
    const assignedName = rolesData?.assignments?.find((r: any) => r.roleCode === "project_owner")?.userName;

    const ttdData = {
      userId: user.id, signedByUserId: user.id, signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || "Project Owner",
      unit: anggota?.unitKerja || "PT Pegadaian (Persero)",
      tanggal: new Date().toISOString(), email: user.email,
      status: "approved", disetujui: true, signatureImage: processedImageUrl,
    };

    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
    if (existing) {
      await db.update(charter).set({ ttdDisusun: ttdData, updatedAt: new Date() }).where(eq(charter.id, existing.id));
    } else {
      await db.insert(charter).values({ timInovatorId: timId, ttdDisusun: ttdData });
    }
    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/dashboard`);
    revalidatePath(`/tim/${timId}/overview`);
    return { success: true, ttdDisusun: ttdData };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menandatangani Charter sebagai Project Owner." };
  }
}

export async function revokeCharterPoSignAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const isPermitted = await hasPermission(user, "charter.sign_po", timId);
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk membatalkan tanda tangan Project Owner.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const assignedPo = rolesData?.assignments?.find((r: any) => r.roleCode === "project_owner");
      if (!assignedPo?.userId || assignedPo.userId !== user.id) {
        return { success: false, error: "Forbidden: Hanya pemegang role Project Owner yang dapat membatalkan tanda tangan ini." };
      }
    }
    await db.update(charter).set({ ttdDisusun: null, updatedAt: new Date() }).where(eq(charter.timInovatorId, timId));
    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/dashboard`);
    revalidatePath(`/tim/${timId}/overview`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan tanda tangan PO." };
  }
}

// ── Charter Coach Signature (Diperiksa Oleh — salah satu syarat pembuka gerbang Customer Validation) ─────
export async function signCharterAsCoachAction(timId: string, signatureImage?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const isPermitted = await hasPermission(user, "charter.sign_coach", timId);
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin menandatangani Innovation Charter sebagai Innovation Coach.",
      };
    }

    const rolesData = await getCharterRolesData(timId);
    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const assignedCoach = rolesData?.assignments?.find((r: any) => ["coach", "innovation_coach"].includes(r.roleCode));
      if (!assignedCoach?.userId || assignedCoach.userId !== user.id) {
        return { success: false, error: "Forbidden: Hanya pemegang role Innovation Coach yang terdaftar di tim ini yang dapat menandatangani bagian ini." };
      }
    }

    const [anggota] = await db.select().from(anggotaTim).where(and(eq(anggotaTim.timInovatorId, timId), eq(anggotaTim.userId, user.id))).limit(1);
    const processedImageUrl = await processSignatureImage(timId, signatureImage);
    const assignedName = rolesData?.assignments?.find((r: any) => ["coach", "innovation_coach"].includes(r.roleCode))?.userName;

    const ttdData = {
      userId: user.id, signedByUserId: user.id, signedByUserName: user.nama,
      nama: assignedName || user.nama,
      jabatan: anggota?.jabatan || "Innovation Coach",
      unit: anggota?.unitKerja || "PT Pegadaian (Persero)",
      tanggal: new Date().toISOString(), email: user.email,
      status: "approved", disetujui: true, signatureImage: processedImageUrl,
    };

    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
    if (existing) {
      await db.update(charter).set({ ttdDiperiksa: ttdData, updatedAt: new Date() }).where(eq(charter.id, existing.id));
    } else {
      await db.insert(charter).values({ timInovatorId: timId, ttdDiperiksa: ttdData });
    }
    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/dashboard`);
    revalidatePath(`/tim/${timId}/overview`);
    return { success: true, ttdDiperiksa: ttdData };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menandatangani Charter sebagai Innovation Coach." };
  }
}

export async function revokeCharterCoachSignAction(timId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized: Harap login terlebih dahulu." };

    const isPermitted = await hasPermission(user, "charter.sign_coach", timId);
    if (!isPermitted) {
      return {
        success: false,
        error: "Forbidden: Anda tidak memiliki izin untuk membatalkan tanda tangan Innovation Coach.",
      };
    }

    const isAdmin = Boolean(user.globalRoles?.includes('admin_ic'));
    if (!isAdmin) {
      const rolesData = await getCharterRolesData(timId);
      const assignedCoach = rolesData?.assignments?.find((r: any) => ["coach", "innovation_coach"].includes(r.roleCode));
      if (!assignedCoach?.userId || assignedCoach.userId !== user.id) {
        return { success: false, error: "Forbidden: Hanya pemegang role Innovation Coach yang dapat membatalkan tanda tangan ini." };
      }
    }
    await db.update(charter).set({ ttdDiperiksa: null, updatedAt: new Date() }).where(eq(charter.timInovatorId, timId));
    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    revalidatePath(`/tim/${timId}/customer-validation`);
    revalidatePath(`/tim/${timId}/dashboard`);
    revalidatePath(`/tim/${timId}/overview`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan tanda tangan Coach." };
  }
}

const bakuCVTasks = [
  {
    judul: "Siapkan prototype untuk testing",
    deskripsi: "Siapkan mockup, clickable prototype, atau instrumen demonstrasi solusi yang siap diuji ke responden.",
    acceptanceCriteria: "Prototype clickable / instrumen demonstrasi solusi yang siap diujicobakan kepada calon pengguna.",
    tahap: "customer_validation" as const,
    storyPoint: 5,
  },
  {
    judul: "Rekrut early adopters/responden",
    deskripsi: "Hubungi dan jadwalkan sesi interaksi dengan minimal 5-10 target pengguna representatif.",
    acceptanceCriteria: "Jadwal dan konfirmasi kehadiran minimal 5-10 responden early adopters yang sesuai kriteria target.",
    tahap: "customer_validation" as const,
    storyPoint: 3,
  },
  {
    judul: "Lakukan sesi user testing",
    deskripsi: "Jalankan sesi testing serta catat feedback kualitatif 4 dimensi (problem, solution, usability, willingness to use/pay).",
    acceptanceCriteria: "Catatan verbatim dan rekaman/log feedback pengujian dari seluruh sesi responden.",
    tahap: "customer_validation" as const,
    storyPoint: 5,
  },
  {
    judul: "Analisis hasil & isi Laporan Customer Validation",
    deskripsi: "Rekap skor dimensi, temuan kualitatif utama, dan ukur ketercapaian target metrik PSF.",
    acceptanceCriteria: "Laporan Customer Validation terisi lengkap dengan analisis skor PSF dan kesimpulan validasi pengguna.",
    tahap: "customer_validation" as const,
    storyPoint: 3,
  },
  {
    judul: "Preliminary Review (SME)",
    deskripsi: "Minta review dan catatan rekomendasi dari Subject Matter Expert / Coach terhadap hasil Customer Validation.",
    acceptanceCriteria: "Catatan review, feedback, dan rekomendasi tertulis dari SME / Coach Inovasi.",
    tahap: "customer_validation" as const,
    storyPoint: 2,
  },
  {
    judul: "Tentukan keputusan Fit/Tidak Fit",
    deskripsi: "Tetapkan keputusan fase CV: 'Lanjut ke Market Validation' (Fit), 'Iterasi Customer Validation' (Iterasi), atau 'Pivot/Drop'.",
    acceptanceCriteria: "Dokumen kesepakatan keputusan fase CV (Fit / Iterasi / Pivot) yang disetujui.",
    tahap: "customer_validation" as const,
    storyPoint: 2,
  },
];

const bakuMVTasks = [
  {
    judul: "MVP Planning",
    deskripsi: "Definisikan spesifikasi fitur MVP versi rilis dan alokasi kebutuhan resource implementasi.",
    acceptanceCriteria: "Dokumen spesifikasi backlog fitur MVP versi rilis dan alokasi sumber daya implementasi.",
    tahap: "market_validation" as const,
    storyPoint: 3,
  },
  {
    judul: "MVP Development",
    deskripsi: "Kembangkan solusi MVP secara teknis dan operasional agar siap pakai di lingkungan uji coba pilot.",
    acceptanceCriteria: "Build / versi sistem MVP yang terpasang dan siap digunakan di lingkungan uji coba pilot.",
    tahap: "market_validation" as const,
    storyPoint: 8,
  },
  {
    judul: "MVP Release",
    deskripsi: "Luncurkan versi MVP ke kelompok pengguna pilot dan catat release log resmi.",
    acceptanceCriteria: "Rilis resmi MVP ke segmen pengguna pilot disertai catatan release log dan panduan akses.",
    tahap: "market_validation" as const,
    storyPoint: 5,
  },
  {
    judul: "Market Testing (ukur metrik DFV)",
    deskripsi: "Pantau adopsi riil pengguna dan rekapitulasi metrik Desirability, Feasibility, dan Viability.",
    acceptanceCriteria: "Data metrik adopsi riil, tingkat keaktifan pengguna, dan evaluasi DFV selama periode pilot.",
    tahap: "market_validation" as const,
    storyPoint: 5,
  },
  {
    judul: "Preliminary Review (SME)",
    deskripsi: "Lakukan sesi review evaluasi berkala bersama SME & Coach mengenai temuan performa pasar MVP.",
    acceptanceCriteria: "Catatan review berkala dan rekomendasi strategis dari SME / Coach terkait performa pasar MVP.",
    tahap: "market_validation" as const,
    storyPoint: 2,
  },
  {
    judul: "Analisis hasil & isi Laporan Market Validation",
    deskripsi: "Susun evaluasi komprehensif PMF, sprint review retrospektif, dan rekomendasi skala implementasi.",
    acceptanceCriteria: "Laporan Market Validation lengkap dengan skor PMF dan rekomendasi tindak lanjut implementasi.",
    tahap: "market_validation" as const,
    storyPoint: 3,
  },
  {
    judul: "Persiapan Forum Manajemen Inovasi",
    deskripsi: "Siapkan materi paparan executive summary DFV dan rekomendasi tindak lanjut untuk Dewan Direksi / FMI.",
    acceptanceCriteria: "Materi paparan slide executive summary DFV dan rekomendasi implementasi untuk sidang FMI.",
    tahap: "market_validation" as const,
    storyPoint: 2,
  },
];

export async function seedInitialKanbanCardsForTeam(timId: string, customDossier?: any) {
  const existingCards = await db
    .select({ id: kanbanCard.id })
    .from(kanbanCard)
    .where(eq(kanbanCard.timInovatorId, timId))
    .limit(1);

  if (existingCards.length > 0) {
    return { success: true, message: "Cards already initialized" };
  }

  const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId));
  const teamDossier = customDossier || (await db.select().from(dossierPiaArchive).where(eq(dossierPiaArchive.timInovatorId, timId)).limit(1))[0];

  const cardsToInsert: Array<typeof kanbanCard.$inferInsert> = [];
  let cardUrutan = 0;

  // Sprints count (ensure at least 6 sprints exist so cards distribute across sprints 1-6 - Paket 24a)
  let sprints = await db.select().from(sprint).where(eq(sprint.timInovatorId, timId));
  if (sprints.length === 0) {
    const defaults = [
      {
        timInovatorId: timId,
        nomorSprint: 1,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-09-07T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-09-18T23:59:59.000Z"),
        tujuan: "Perencanaan Customer Validation",
      },
      {
        timInovatorId: timId,
        nomorSprint: 2,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-09-21T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-10-02T23:59:59.000Z"),
        tujuan: "Laporan Customer Validation",
      },
      {
        timInovatorId: timId,
        nomorSprint: 3,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-10-05T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-10-16T23:59:59.000Z"),
        tujuan: "Perencanaan Market Validation",
      },
      {
        timInovatorId: timId,
        nomorSprint: 4,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-10-19T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-10-30T23:59:59.000Z"),
        tujuan: "Market Testing",
      },
      {
        timInovatorId: timId,
        nomorSprint: 5,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-11-02T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-11-13T23:59:59.000Z"),
        tujuan: "Market Testing",
      },
      {
        timInovatorId: timId,
        nomorSprint: 6,
        status: "belum_dimulai",
        tanggalMulaiRencana: new Date("2026-11-16T00:00:00.000Z"),
        tanggalSelesaiRencana: new Date("2026-11-27T23:59:59.000Z"),
        tujuan: "Penyelesaian Laporan Market Validation",
      },
    ];
    await db.insert(sprint).values(defaults).onConflictDoNothing();
    sprints = await db.select().from(sprint).where(eq(sprint.timInovatorId, timId));
  }
  const totalSprints = Math.max(6, sprints.length);

  if (teamDossier && teamDossier.snapshotData) {
    const snap = teamDossier.snapshotData as any;
    const submisi = snap.data_submisi || snap.submisi_dossier || {};
    const formDetail = submisi.form_detail || snap.form_detail || {};
    const hasilGrandFinal = snap.hasil_grand_final || submisi.hasil_grand_final || null;
    const proposalId = teamDossier.proposalIdAsli || snap.proposal_id || timId;
    const namaProyek = submisi.judul || snap.judul_inovasi || tim?.namaProyekInovasi || "Inovasi";
    const kategoriPia = tim?.kategoriPia || submisi.kategori_pia || snap.kategori_inovasi || "Umum";

    const grandFinalRoadmapBlocks: string[] = [];
    if (hasilGrandFinal) {
      if (hasilGrandFinal.solution) {
        grandFinalRoadmapBlocks.push(`SOLUSI RESMI GRAND FINAL:\n${hasilGrandFinal.solution}`);
      }
      if (hasilGrandFinal.fitur_utama) {
        const fiturStr = Array.isArray(hasilGrandFinal.fitur_utama)
          ? hasilGrandFinal.fitur_utama.map((f: string, idx: number) => `${idx + 1}. ${f}`).join('\n')
          : String(hasilGrandFinal.fitur_utama);
        grandFinalRoadmapBlocks.push(`ARSITEKTUR & FITUR UTAMA SISTEM (GRAND FINAL):\n${fiturStr}`);
      }
      if (hasilGrandFinal.validasi) {
        const ringkasan = hasilGrandFinal.validasi.ringkasan_validasi || '';
        const pembelajaran = hasilGrandFinal.validasi.pembelajaran_validasi || '';
        if (ringkasan || pembelajaran) {
          grandFinalRoadmapBlocks.push(`HASIL VALIDASI AWAL & PEMBELAJARAN (GRAND FINAL):\nRingkasan: ${ringkasan}\nPembelajaran: ${pembelajaran}`.trim());
        }
      }
      if (hasilGrandFinal.risk_mitigation) {
        grandFinalRoadmapBlocks.push(`RENCANA MITIGASI RISIKO UTAMA:\n${hasilGrandFinal.risk_mitigation}`);
      }
      if (hasilGrandFinal.business_impact) {
        grandFinalRoadmapBlocks.push(`TARGET DAMPAK BISNIS:\n${hasilGrandFinal.business_impact}`);
      }
    }

    const earlyProposalText = cleanText(
      formDetail.detil_cara_kerja ||
      formDetail.bc_detil_cara_kerja ||
      formDetail.solusi_diusulkan ||
      formDetail.bi_inovasi_diusulkan ||
      formDetail.bc_eksplorasi_solusi ||
      formDetail.cara_mewujudkan_ide ||
      formDetail.tahapan_implementasi ||
      formDetail.rencana_implementasi ||
      formDetail.roadmap ||
      formDetail.keunikan ||
      snap.resubmit_document_text ||
      ""
    );

    const roadmapText = cleanText(
      [
        grandFinalRoadmapBlocks.join('\n\n'),
        earlyProposalText ? `--- DOKUMEN PROPOSAL AWAL ---\n${earlyProposalText}` : ''
      ].filter(Boolean).join('\n\n')
    );

    let aiTasks: AiBacklogTask[] | null = Array.isArray(snap.ai_generated_backlog) ? snap.ai_generated_backlog : null;

    if (!aiTasks && process.env.OPENAI_API_KEY && roadmapText) {
      try {
        aiTasks = await generateAiBacklogFromRoadmap({
          teamId: timId,
          proposalId,
          namaProyek,
          kategoriPia,
          roadmapText,
          totalSprints,
          rawProposalData: {
            judul: submisi.judul || snap.judul_inovasi,
            form_detail: formDetail,
            hasil_grand_final: hasilGrandFinal,
          },
        });

        if (aiTasks && aiTasks.length > 0) {
          await db
            .update(dossierPiaArchive)
            .set({
              snapshotData: {
                ...snap,
                ai_generated_backlog: aiTasks,
              },
              updatedAt: new Date(),
            })
            .where(eq(dossierPiaArchive.id, teamDossier.id));
        }
      } catch (aiErr: any) {
        console.warn(`[seedInitialKanbanCardsForTeam] AI generation failed for ${proposalId}:`, aiErr.message);
      }
    }

    const cvMaxSprint = Math.max(1, Math.min(2, Math.floor(totalSprints / 2)));
    const mvMinSprint = Math.min(totalSprints, cvMaxSprint + 1);

    if (aiTasks && aiTasks.length > 0) {
      for (let i = 0; i < aiTasks.length; i++) {
        const t = aiTasks[i];
        const taskTahap: 'customer_validation' | 'market_validation' =
          (t.tahap === 'customer_validation' || t.tahap === 'market_validation')
            ? t.tahap
            : 'market_validation';

        let sprintNum = t.suggestedSprintNumber;
        if (taskTahap === 'customer_validation') {
          if (!sprintNum || sprintNum < 1 || sprintNum > cvMaxSprint) {
            sprintNum = (i % cvMaxSprint) + 1;
          }
        } else {
          if (!sprintNum || sprintNum < mvMinSprint || sprintNum > totalSprints) {
            sprintNum = mvMinSprint + (i % Math.max(1, totalSprints - mvMinSprint + 1));
          }
        }

        const sp = t.storyPoint || 3;
        const subtasks = (t.subtasks && t.subtasks.length > 0)
          ? t.subtasks
          : [
              { title: `Persiapan, riset kebutuhan, & koordinasi: ${t.judul.substring(0, 45)}`, estimatedHours: Math.max(60, Math.round(sp * 60 * 0.3)) },
              { title: `Implementasi teknis & eksekusi aktivitas utama`, estimatedHours: Math.max(120, Math.round(sp * 60 * 0.5)) },
              { title: `Validasi, pengujian hasil, & dokumentasi luaran`, estimatedHours: Math.max(60, Math.round(sp * 60 * 0.2)) },
            ];

        const totalEstMinutes = subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);

        cardsToInsert.push({
          timInovatorId: timId,
          judul: t.judul,
          deskripsi: t.deskripsi || null,
          acceptanceCriteria: t.acceptanceCriteria || null,
          statusKolom: "To Do",
          tahap: taskTahap,
          sprintNumber: null,
          suggestedSprintNumber: sprintNum,
          storyPoint: sp,
          estimasiJam: totalEstMinutes > 0 ? Math.round(totalEstMinutes / 60) : null,
          label: "Draf Roadmap",
          reviewStatus: 'ai_reference',
          urutan: cardUrutan++,
          _initialSubtasks: subtasks,
        } as any);
      }
    } else {
      const judulSolusi = cleanText(submisi.judul || snap.judul_inovasi || "Inovasi");
      const fallbackTasks = [
        {
          judul: `Susun penyelarasan problem space — ${judulSolusi.substring(0, 40)}`,
          deskripsi: `Validasi ulang temuan masalah, HMW, dan sasaran pengguna awal bersama Inisiator dan Promotor.`,
          acceptanceCriteria: `Dokumen penyelarasan problem space dan target profil pengguna awal yang disepakati bersama.`,
          tahap: "customer_validation" as const,
          sprint: 1,
          sp: 3,
          subtasks: [
            { title: "Identifikasi kembali temuan masalah & sasaran pengguna", estimatedHours: 180 },
            { title: "Sesi penyelarasan bersama Inisiator dan Promotor", estimatedHours: 180 },
            { title: "Dokumentasikan profil target pengguna yang disepakati", estimatedHours: 120 },
          ],
        },
        {
          judul: `Rancang desain konseptual & arsitektur solusi MVP`,
          deskripsi: `Rumuskan cakupan fitur inti yang akan diuji pada fase Customer Validation & Market Validation.`,
          acceptanceCriteria: `Dokumen arsitektur solusi konseptual dan daftar fitur MVP yang siap diimplementasikan.`,
          tahap: "market_validation" as const,
          sprint: mvMinSprint,
          sp: 5,
          subtasks: [
            { title: "Petakan cakupan fitur inti & user journey", estimatedHours: 240 },
            { title: "Susun rancangan arsitektur sistem & integrasi data", estimatedHours: 360 },
            { title: "Review kelayakan teknis bersama tim", estimatedHours: 180 },
          ],
        },
      ];

      if (formDetail.kebutuhan_dukungan || formDetail.bi_sumber_daya || formDetail.bc_sumber_daya_diperlukan) {
        fallbackTasks.push({
          judul: `Konsolidasikan kebutuhan resource & koordinasi SME`,
          deskripsi: `Konsolidasikan kebutuhan anggaran, teknologi, dan koordinasi bersama Subject Matter Expert.`,
          acceptanceCriteria: `Rencana alokasi sumber daya dan jadwal koordinasi dengan SME yang telah dikonfirmasi.`,
          tahap: "market_validation" as const,
          sprint: Math.min(totalSprints, mvMinSprint + 1),
          sp: 3,
          subtasks: [
            { title: "Inventarisir kebutuhan teknologi & anggaran", estimatedHours: 180 },
            { title: "Jadwalkan sesi konsultasi dengan SME terkait", estimatedHours: 120 },
            { title: "Finalisasi rencana alokasi sumber daya proyek", estimatedHours: 120 },
          ],
        });
      }

      for (const ft of fallbackTasks) {
        const totalEstMinutes = ft.subtasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
        cardsToInsert.push({
          timInovatorId: timId,
          judul: ft.judul,
          deskripsi: ft.deskripsi,
          acceptanceCriteria: ft.acceptanceCriteria,
          statusKolom: "To Do",
          tahap: ft.tahap,
          sprintNumber: null,
          suggestedSprintNumber: ft.sprint,
          storyPoint: ft.sp,
          estimasiJam: totalEstMinutes > 0 ? Math.round(totalEstMinutes / 60) : null,
          label: "Draf Roadmap",
          reviewStatus: 'ai_reference',
          urutan: cardUrutan++,
          _initialSubtasks: ft.subtasks,
        } as any);
      }
    }
  }

  const maxBakuCvSpan = Math.max(1, Math.min(2, totalSprints - 1));
  for (let cvIdx = 0; cvIdx < bakuCVTasks.length; cvIdx++) {
    const t = bakuCVTasks[cvIdx];
    const cvSprint = maxBakuCvSpan <= 1
      ? 1
      : (cvIdx < 4 ? 1 : 2);

    const predefined = getPredefinedSubtasks(t.judul, t.tahap) || [];
    const totalEstMinutes = predefined.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);

    cardsToInsert.push({
      timInovatorId: timId,
      judul: t.judul,
      deskripsi: t.deskripsi,
      acceptanceCriteria: t.acceptanceCriteria || null,
      statusKolom: "To Do",
      tahap: t.tahap,
      sprintNumber: null,
      suggestedSprintNumber: cvSprint,
      storyPoint: t.storyPoint,
      estimasiJam: totalEstMinutes > 0 ? Math.round(totalEstMinutes / 60) : null,
      label: "Template Baku CV",
      reviewStatus: 'ai_reference',
      urutan: cardUrutan++,
      _initialSubtasks: predefined,
    } as any);
  }

  for (let mvIdx = 0; mvIdx < bakuMVTasks.length; mvIdx++) {
    const t = bakuMVTasks[mvIdx];
    const mvSprint = totalSprints <= 3
      ? totalSprints
      : totalSprints === 4
      ? (mvIdx < 4 ? 3 : 4)
      : totalSprints === 5
      ? (mvIdx < 3 ? 3 : mvIdx < 6 ? 4 : 5)
      : mvIdx < 3
      ? 4
      : mvIdx < 6
      ? 5
      : 6;

    const predefined = getPredefinedSubtasks(t.judul, t.tahap) || [];
    const totalEstMinutes = predefined.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);

    cardsToInsert.push({
      timInovatorId: timId,
      judul: t.judul,
      deskripsi: t.deskripsi,
      acceptanceCriteria: t.acceptanceCriteria || null,
      statusKolom: "To Do",
      tahap: t.tahap,
      sprintNumber: null,
      suggestedSprintNumber: mvSprint,
      storyPoint: t.storyPoint,
      estimasiJam: totalEstMinutes > 0 ? Math.round(totalEstMinutes / 60) : null,
      label: "Template Baku MV",
      reviewStatus: 'ai_reference',
      urutan: cardUrutan++,
      _initialSubtasks: predefined,
    } as any);
  }

  if (cardsToInsert.length > 0) {
    const insertPayload = cardsToInsert.map(c => {
      const { _initialSubtasks, ...rest } = c as any;
      return rest;
    });

    const insertedCards = await db.insert(kanbanCard).values(insertPayload).returning();

    const subtaskRowsToInsert: Array<typeof kanbanSubtask.$inferInsert> = [];
    for (let i = 0; i < insertedCards.length; i++) {
      const card = insertedCards[i];
      const initialSubtasks = (cardsToInsert[i] as any)?._initialSubtasks as Array<{
        title: string;
        estimatedHours: number;
        subtaskType?: string;
        reportFieldMapping?: Record<string, any>;
      }> | undefined;
      if (initialSubtasks && initialSubtasks.length > 0) {
        for (let sIdx = 0; sIdx < initialSubtasks.length; sIdx++) {
          const st = initialSubtasks[sIdx];
          subtaskRowsToInsert.push({
            taskId: card.id,
            title: st.title,
            estimatedHours: st.estimatedHours || 180,
            isDone: false,
            orderIndex: sIdx,
            subtaskType: st.subtaskType || 'regular',
            reportFieldMapping: st.reportFieldMapping || null,
            createdBy: null,
          });
        }
      }
    }

    if (subtaskRowsToInsert.length > 0) {
      await db.insert(kanbanSubtask).values(subtaskRowsToInsert);
    }

    // Auto-attach proposal dossier documents to innovation_setup roadmap cards
    if (teamDossier && teamDossier.snapshotData) {
      const snap = teamDossier.snapshotData as any;
      const proposalId = teamDossier.proposalIdAsli || snap.proposal_id || timId;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikjqozzsrnuemqgdujeg.supabase.co';
      const lampiranUrls: Record<string, string> = { ...(snap.lampiran_urls || {}) };
      const daftarLampiran: string[] = Array.isArray(snap.daftar_lampiran) ? snap.daftar_lampiran : [];

      const dossierDocs: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize: number }> = [];

      for (const file of daftarLampiran) {
        const url = lampiranUrls[file] || `${supabaseUrl}/storage/v1/object/public/dossier-lampiran/${proposalId}/${file}`;
        dossierDocs.push({
          fileName: file,
          fileUrl: url,
          fileType: file.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          fileSize: 0,
        });
      }

      if (snap.dokumen_proposal_url && !dossierDocs.some((d) => d.fileUrl === snap.dokumen_proposal_url)) {
        dossierDocs.push({
          fileName: 'Dokumen Proposal.pdf',
          fileUrl: snap.dokumen_proposal_url,
          fileType: 'application/pdf',
          fileSize: 0,
        });
      }
      if (snap.proposal_resubmission_url && !dossierDocs.some((d) => d.fileUrl === snap.proposal_resubmission_url)) {
        dossierDocs.push({
          fileName: 'Proposal Resubmission.pdf',
          fileUrl: snap.proposal_resubmission_url,
          fileType: 'application/pdf',
          fileSize: 0,
        });
      }
      if (snap.surat_originalitas_url && !dossierDocs.some((d) => d.fileUrl === snap.surat_originalitas_url)) {
        dossierDocs.push({
          fileName: 'Surat Originalitas.pdf',
          fileUrl: snap.surat_originalitas_url,
          fileType: 'application/pdf',
          fileSize: 0,
        });
      }

      if (snap.data_submisi) {
        const sub = snap.data_submisi as any;
        if (sub.dokumen_proposal_url && !dossierDocs.some((d) => d.fileUrl === sub.dokumen_proposal_url)) {
          dossierDocs.push({
            fileName: 'Dokumen Proposal.pdf',
            fileUrl: sub.dokumen_proposal_url,
            fileType: 'application/pdf',
            fileSize: 0,
          });
        }
        if (sub.proposal_resubmission_url && !dossierDocs.some((d) => d.fileUrl === sub.proposal_resubmission_url)) {
          dossierDocs.push({
            fileName: 'Proposal Resubmission.pdf',
            fileUrl: sub.proposal_resubmission_url,
            fileType: 'application/pdf',
            fileSize: 0,
          });
        }
        if (sub.surat_originalitas_url && !dossierDocs.some((d) => d.fileUrl === sub.surat_originalitas_url)) {
          dossierDocs.push({
            fileName: 'Surat Originalitas.pdf',
            fileUrl: sub.surat_originalitas_url,
            fileType: 'application/pdf',
            fileSize: 0,
          });
        }
      }

      if (dossierDocs.length > 0) {
        const roadmapCards = insertedCards.filter(
          (c) =>
            c.label === 'Draf Roadmap' ||
            (c.tahap === 'innovation_setup' && c.label !== 'Template Baku CV' && c.label !== 'Template Baku MV')
        );

        const attachmentsToInsert: Array<typeof taskAttachment.$inferInsert> = [];
        for (const card of roadmapCards) {
          for (const doc of dossierDocs) {
            attachmentsToInsert.push({
              taskId: card.id,
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              fileType: doc.fileType,
              fileSize: doc.fileSize,
              source: 'proposal_dossier',
              uploadedBy: null,
            });
          }
        }

        if (attachmentsToInsert.length > 0) {
          await db.insert(taskAttachment).values(attachmentsToInsert);
        }
      }
    }
  }
}
