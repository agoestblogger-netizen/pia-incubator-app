import OpenAI from 'openai';

export interface AiBacklogTask {
  judul: string;
  deskripsi: string;
  acceptanceCriteria: string;
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

    const systemPrompt = `Anda adalah Scrum Master & Agile Coach senior ahli metodologi Scrum dan Lean Startup di PT Pegadaian (Persero).
Tugas Anda adalah membedah dan memecah roadmap implementasi inovasi (bagian "Cara mewujudkan ide inovasi" / tahapan implementasi) dari proposal PIA Season 12 menjadi daftar Backlog Task atomik berstandar Scrum yang tajam, konkret, dan siap dikerjakan tim.

ATURAN GRANULARITAS TASK (SANGAT PENTING):
1. DILARANG KERAS MEMBUAT TASK SETINGKAT EPIC / MAKRO (contoh yang SALAH & DILARANG: "Kembangkan platform digital GATE sebagai ekosistem bisnis emas", "Integrasikan data dan layanan Bullion Pegadaian", "Rancang alur onboarding"). Task seperti ini terlalu luas dan mewakili satu proyek penuh!
2. PECAH SETIAP FASE / ELEMEN ROADMAP MENJADI 3 SAMPAI 6 TASK ATOMIK.
   Setiap task HARUS berupa 1 AKSI NYATA (Single Actionable Work Item) yang bisa dikerjakan 1 orang dalam waktu singkat.
   Total hasil pemecahan biasanya menghasilkan antara 10 hingga 20 task backlog untuk keseluruhan roadmap proposal.
   
   CONTOH POLA PEMECAHAN ATOMIK YANG BENAR:
   Jika roadmap berbunyi: "Validasi kebutuhan pengguna melalui FGD bersama Divisi Bullion, anggota IBMA, dan nasabah korporasi":
   -> Task 1: "Jadwalkan sesi FGD dengan Divisi Bullion"
   -> Task 2: "Susun materi dan daftar pertanyaan FGD"
   -> Task 3: "Undang perwakilan anggota IBMA untuk sesi FGD"
   -> Task 4: "Lakukan sesi FGD dengan perwakilan nasabah korporasi"
   -> Task 5: "Rangkum dan dokumentasikan hasil temuan FGD"

   Jika deskripsi aktivitas di proposal sangat ringkas:
   Gunakan pola prosedural wajar: (1) Rencanakan/Petakan kebutuhan -> (2) Susun/Siapkan materi -> (3) Kembangkan/Lakukan aktivitas -> (4) Uji coba/Validasi -> (5) Dokumentasikan/Evaluasi hasil.

ATURAN FORMAT SCRUM & PEMISAHAN FIELD:
1. JUDUL TASK: Wajib diawali KATA KERJA AKTIF / IMPERATIVE VERB sebagai KATA PERTAMA (contoh: "Susun", "Siapkan", "Jadwalkan", "Koordinasikan", "Petakan", "Rancang", "Kembangkan", "Hubungkan", "Lakukan", "Uji coba", "Rangkum", "Evaluasi").
2. ANTI-HALUSINASI KETAT: HANYA gunakan konteks, nama sistem, stakeholder, dan entitas yang disebutkan di proposal/roadmap (misal IBMA, Divisi Bullion, nasabah korporasi, dll). JANGAN menambahkan nama vendor, instansi, atau detail teknologi baru di luar data sumber.
3. DESKRIPSI (deskripsi): HANYA berisi 1-2 kalimat ringkas mengenai konteks aktivitas yang dikerjakan. DILARANG memasukkan kalimat "Hasil atau output dari task/aktivitas ini adalah..." ke dalam field deskripsi!
4. ACCEPTANCE CRITERIA (acceptanceCriteria): Berisi definisi luaran konkret / tolok ukur hasil kerja task tersebut (misal: "Dokumen panduan FGD yang ditinjau tim", "Spesifikasi API koneksi data Bullion", "Hasil notulensi FGD dan daftar kebutuhan pengguna"), TANPA awalan "Hasil atau output dari task/aktivitas ini adalah".
5. Output HARUS berupa format JSON murni tanpa markdown formatting.`;

    const userPrompt = `PROPOSAL METADATA:
- Proposal ID: ${proposalId}
- Nama Inovasi: ${namaProyek}
- Kategori PIA: ${kategoriPia}

TEKS ROADMAP LENGKAP DARI PROPOSAL ("Cara Mewujudkan Ide Inovasi"):
"""
${roadmapText}
"""

KONTEKS PROPOSAL TERKAIT (MASALAH, SOLUSI & DUKUNGAN):
${rawProposalData ? JSON.stringify(rawProposalData, null, 2) : 'Tidak ada'}

Pecah roadmap di atas menjadi daftar Backlog Task atomik dengan memisahkan 'deskripsi' (konteks aktivitas) dan 'acceptanceCriteria' (luaran/tolok ukur konkret) ke dalam format JSON:
{
  "tasks": [
    {
      "judul": "Kata Kerja Aktif + Target dan Konteks Aksi Atomik",
      "deskripsi": "1-2 kalimat konteks aktivitas yang dikerjakan tim (bersih dari kalimat output).",
      "acceptanceCriteria": "Luaran konkret / dokumen / deliverable / tolok ukur selesai."
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
          acceptanceCriteria: typeof t.acceptanceCriteria === 'string' ? t.acceptanceCriteria.trim() : '',
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
