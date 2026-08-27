import OpenAI from "openai";

export interface SprintReviewAiInput {
  namaTim: string;
  nomorSprint: number;
  sprintGoal?: string | null;
  doneCards: Array<{
    judul: string;
    deskripsi?: string | null;
    acceptanceCriteria?: string | null;
  }>;
  issueCards: Array<{
    judul: string;
    deskripsi?: string | null;
    statusKolom?: string | null;
  }>;
  comments?: Array<{
    cardJudul: string;
    author: string;
    content: string;
  }>;
}

export interface SprintReviewAiDraft {
  demo: string;
  feedback: string;
  value: string;
  questions: string;
  continueItems: string;
  stopItems: string;
  startItems: string;
  ownerTargetSprint: string;
}

export async function generateSprintReviewAiDraft(
  input: SprintReviewAiInput
): Promise<{ success: boolean; data?: SprintReviewAiDraft; error?: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OPENAI_API_KEY belum dikonfigurasi pada environment server.",
      };
    }

    const openai = new OpenAI({ apiKey, timeout: 20000 });

    const systemPrompt = `Anda adalah AI Innovation Reviewer & Scrum Master Expert untuk Program Inkubasi Inovasi PT Pegadaian (PIA).
Tugas Anda adalah menyusun Draf Sprint Review & Retrospective (Template 3.2) yang komprehensif, berbasis data aktivitas kerja riil tim dalam sprint yang baru diselesaikan.

Konteks yang perlu Anda perhatikan:
1. Kartu-kartu berstatus "Done": Luaran atau fitur nyata yang telah berhasil diselesaikan oleh tim.
2. Kartu tipe "Issue": Masalah tak terduga, bug, kendala teknis, atau hambatan operasional yang diidentifikasi oleh Coach/Tim selama sprint berlangsung.
3. Sprint Goal: Sasaran utama dari sprint ini.
4. Komentar & Diskusi: Catatan lapangan tim.

Format Output WAJIB berupa JSON murni dengan 8 field string berikut:
{
  "demo": "Ringkasan luaran/fitur/dokumen konkret yang berhasil diselesaikan dan siap didemonstrasikan ke pemangku kepentingan (2-3 kalimat tajam).",
  "feedback": "Sintesis umpan balik evaluatif dari sudut pandang Coach & Pengguna terhadap hasil sprint (2-3 kalimat).",
  "value": "Nilai tambah bisnis, efisiensi operasional, atau validasi pelanggan yang tercipta dari pencapaian sprint ini (2-3 kalimat).",
  "questions": "Pertanyaan strategis atau hal penting yang masih perlu dijawab/diuji di iterasi sprint berikutnya (terutama dipicu oleh kendala/issue yang timbul).",
  "continueItems": "Praktik baik, kolaborasi tim, atau metode kerja yang efektif dan harus DIPERTAHANKAN.",
  "stopItems": "Kebiasaan tidak efektif, blocker, atau kendala proses yang harus DIHENTIKAN/DITIADAKAN (sangat dipengaruhi oleh temuan kartu Issue).",
  "startItems": "Inisiatif baru, mitigasi risiko, atau perbaikan alur kerja yang harus DIMULAI pada sprint berikutnya.",
  "ownerTargetSprint": "Rekomendasi PIC dan sprint target untuk rencana tindak lanjut (contoh: 'Innovation Coach & Tim Inovator - Sprint ${input.nomorSprint + 1}')"
}

Gunakan bahasa Indonesia formal, profesional, lugas, dan bernas.`;

    const userPrompt = `TIM INOVASI: ${input.namaTim}
NOMOR SPRINT: Sprint ${input.nomorSprint}
SPRINT GOAL: ${input.sprintGoal || "Belum ditentukan"}

DAFTAR KARTU SELESAI (DONE):
${
  input.doneCards.length > 0
    ? input.doneCards
        .map(
          (c, idx) =>
            `${idx + 1}. [DONE] ${c.judul}\n   Deskripsi: ${c.deskripsi || "-"}\n   Kriteria Penerimaan: ${c.acceptanceCriteria || "-"}`
        )
        .join("\n")
    : "Tidak ada kartu yang berstatus Done pada sprint ini."
}

DAFTAR KARTU ISSUE / KENDALA SPRINT:
${
  input.issueCards.length > 0
    ? input.issueCards
        .map(
          (c, idx) =>
            `${idx + 1}. [ISSUE] ${c.judul} (Status: ${c.statusKolom || "Open"})\n   Deskripsi: ${c.deskripsi || "-"}`
        )
        .join("\n")
    : "Tidak ada kartu Issue khusus yang tercatat pada sprint ini."
}

${
  input.comments && input.comments.length > 0
    ? `CATATAN KOMENTAR AKTIVITAS:\n${input.comments
        .map((cm) => `- Pada "${cm.cardJudul}" oleh ${cm.author}: ${cm.content}`)
        .join("\n")}`
    : ""
}

Buatlah draf Sprint Review & Retrospective dalam format JSON sesuai spesifikasi!`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return { success: false, error: "AI tidak menghasilkan keluaran teks." };
    }

    const parsed = JSON.parse(responseText);
    const result: SprintReviewAiDraft = {
      demo: parsed.demo || "",
      feedback: parsed.feedback || "",
      value: parsed.value || "",
      questions: parsed.questions || "",
      continueItems: parsed.continueItems || parsed.continue || "",
      stopItems: parsed.stopItems || parsed.stop || "",
      startItems: parsed.startItems || parsed.start || "",
      ownerTargetSprint: parsed.ownerTargetSprint || `Tim Inovator - Sprint ${input.nomorSprint + 1}`,
    };

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[generateSprintReviewAiDraft] Error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghasilkan draf Sprint Review AI.",
    };
  }
}
