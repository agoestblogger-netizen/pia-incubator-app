import OpenAI from 'openai';

export interface AiBacklogTask {
  judul: string;
  deskripsi: string;
}

export interface AiBacklogResponse {
  tasks: AiBacklogTask[];
}

export async function generateAiBacklogFromRoadmap(params: {
  teamId: string;
  proposalId: string;
  namaProyek: string;
  kategoriPia: string;
  roadmapText: string;
  rawProposalData?: Record<string, any>;
}): Promise<AiBacklogTask[] | null> {
  const { teamId, proposalId, namaProyek, kategoriPia, roadmapText, rawProposalData } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(`[AI Backlog] OPENAI_API_KEY is not configured. Skipping AI Backlog generation for proposal ${proposalId}.`);
    return null;
  }

  if (!roadmapText || roadmapText.trim().length < 10) {
    console.warn(`[AI Backlog] Insufficient roadmap text for proposal ${proposalId}. Skipping.`);
    return null;
  }

  console.log(`[AI Backlog] 🚀 Starting AI-powered Backlog generation for Team ID: ${teamId}, Proposal ID: ${proposalId} (${namaProyek})`);

  try {
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Anda adalah Scrum Master & Agile Innovation Coach ahli metodologi Scrum dan Lean Startup di PT Pegadaian (Persero).
Tugas Anda adalah memecah roadmap implementasi ide inovasi (bagian "Cara mewujudkan ide inovasi") dari proposal PIA Season 12 menjadi daftar Backlog Task berstandar Scrum yang actionable, tajam, dan profesional.

ATURAN FORMAT SCRUM & GUARDRAILS (SANGAT KETAT):
1. SETIAP JUDUL TASK HARUS DIAWALI KATA KERJA AKTIF / IMPERATIVE VERB sebagai KATA PERTAMA (contoh: "Susun", "Kembangkan", "Integrasikan", "Uji coba", "Evaluasi", "Rancang", "Implementasikan", "Siapkan", "Lakukan", "Bangun", "Petakan").
   - POLA BENAR: "Susun skenario FGD dengan Divisi Bullion dan anggota IBMA"
   - POLA BENAR: "Kembangkan MVP Gold Business Passport"
   - POLA BENAR: "Integrasikan Market Intelligence Dashboard dengan sistem Bullion Pegadaian"
   - POLA BENAR: "Uji coba pilot project bersama anggota IBMA"
   - POLA BENAR: "Evaluasi hasil pilot dan susun SOP operasional"
   - DILARANG: Kalimat pasif/deskriptif seperti "Validasi kebutuhan pengguna" (tanpa aksi konkret) atau kutipan mentah paragraf.
2. HANYA gunakan informasi yang ada di DATA SUMBER PROPOSAL & ROADMAP. JANGAN MENAMBAH atau MENGARANG fakta/sistem di luar konteks inovasi ini.
3. Pecah roadmap menjadi beberapa task backlog terpisah (jumlah menyesuaikan fase/aktivitas yang teridentifikasi, biasanya 3 sampai 6 task utama).
4. Berikan deskripsi singkat (1-2 kalimat) untuk setiap task yang menjelaskan konteks dan luaran yang diharapkan.
5. Output HARUS berupa format JSON murni tanpa markdown formatting.`;

    const userPrompt = `PROPOSAL METADATA:
- Proposal ID: ${proposalId}
- Nama Inovasi: ${namaProyek}
- Kategori PIA: ${kategoriPia}

TEKS ROADMAP DARI PROPOSAL ("Cara Mewujudkan Ide Inovasi"):
"""
${roadmapText}
"""

KONTEKS TAMBAHAN PROPOSAL:
${rawProposalData ? JSON.stringify(rawProposalData, null, 2) : 'Tidak ada'}

Silakan hasilkan JSON dengan struktur berikut:
{
  "tasks": [
    {
      "judul": "Kata Kerja Aktif + Target dan Konteks (Scrum Format)",
      "deskripsi": "1-2 kalimat ringkas penjelasan konteks dan luaran task"
    }
  ]
}`;

    // Prefer gpt-5.4-mini, fallback to gpt-4o-mini
    let modelName = 'gpt-5.4-mini';
    let responseText = '';

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (modelErr: any) {
      console.warn(`[AI Backlog] Model ${modelName} failed (${modelErr.message}), falling back to gpt-4o-mini...`);
      modelName = 'gpt-4o-mini';
      const fallbackCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      responseText = fallbackCompletion.choices[0]?.message?.content || '';
    }

    if (!responseText) {
      console.warn(`[AI Backlog] Empty response from OpenAI for proposal ${proposalId}`);
      return null;
    }

    const parsed = JSON.parse(responseText) as AiBacklogResponse;
    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const validatedTasks: AiBacklogTask[] = [];
    for (const t of rawTasks) {
      if (t && typeof t.judul === 'string' && t.judul.trim().length > 0) {
        validatedTasks.push({
          judul: t.judul.trim(),
          deskripsi: typeof t.deskripsi === 'string' ? t.deskripsi.trim() : '',
        });
      }
    }

    console.log(`[AI Backlog] ✅ Successfully generated ${validatedTasks.length} Scrum Backlog tasks for Proposal ID: ${proposalId} using model: ${modelName}`);
    return validatedTasks.length > 0 ? validatedTasks : null;
  } catch (err: any) {
    console.error(`[AI Backlog] ❌ Error during AI Backlog generation for Proposal ID ${proposalId}:`, err.message);
    return null;
  }
}
