import OpenAI from 'openai';

export interface AiBacklogSubtask {
  title: string;
  estimatedHours: number;
}

export interface AiBacklogTask {
  judul: string;
  deskripsi: string;
  acceptanceCriteria: string;
  suggestedSprintNumber?: number;
  storyPoint?: number;
  subtasks?: AiBacklogSubtask[];
}

export interface AiBacklogResponse {
  tasks: AiBacklogTask[];
}

const FIBONACCI_SP_OPTIONS = [1, 2, 3, 5, 8, 13] as const;

/** Normalisasi angka ke skala Fibonacci terdekat (1, 2, 3, 5, 8, 13). */
export function normalizeToFibonacci(val: number | null | undefined, fallback = 3): number {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return fallback;
  return FIBONACCI_SP_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
  );
}

/** Estimasi Story Point berbasis heuristik kualitatif jika AI tidak tersedia */
export function estimateStoryPointHeuristic(judul: string, deskripsi = '', acceptanceCriteria = ''): number {
  const text = `${judul} ${deskripsi} ${acceptanceCriteria}`.toLowerCase();
  
  if (
    text.includes('development') ||
    text.includes('pengembangan') ||
    text.includes('integrasi') ||
    text.includes('arsitektur') ||
    text.includes('infrastruktur') ||
    text.includes('backend')
  ) {
    return 8;
  }
  if (
    text.includes('prototype') ||
    text.includes('testing') ||
    text.includes('uji coba') ||
    text.includes('pilot') ||
    text.includes('rilis') ||
    text.includes('release') ||
    text.includes('fgd')
  ) {
    return 5;
  }
  if (
    text.includes('perencanaan') ||
    text.includes('analisis') ||
    text.includes('laporan') ||
    text.includes('rekrut') ||
    text.includes('susun') ||
    text.includes('materi')
  ) {
    return 3;
  }
  if (
    text.includes('review') ||
    text.includes('keputusan') ||
    text.includes('jadwal') ||
    text.includes('brief') ||
    text.includes('koordinasi')
  ) {
    return 2;
  }
  return 3;
}

/**
 * Panggil AI untuk menentukan skor Story Point (Fibonacci 1, 2, 3, 5, 8, 13)
 * untuk sebuah kartu berdasarkan Judul, Deskripsi, dan Acceptance Criteria.
 */
export async function estimateCardStoryPointWithAi(params: {
  judul: string;
  deskripsi?: string | null;
  acceptanceCriteria?: string | null;
}): Promise<number> {
  const { judul, deskripsi = '', acceptanceCriteria = '' } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return estimateStoryPointHeuristic(judul, deskripsi || '', acceptanceCriteria || '');
  }

  try {
    const openai = new OpenAI({ apiKey });
    const systemPrompt = `Anda adalah Scrum Master & Agile Coach senior ahli estimasi Story Point (skala Fibonacci: 1, 2, 3, 5, 8, 13).
Tugas Anda adalah menilai estimasi kompleksitas kualitatif kartu task backlog dan memberikan skor Story Point:
- 1-2 SP: Tugas administratif singkat, konfirmasi jadwal, review cepat, brief, atau koordinasi ringan.
- 3-5 SP: Riset dasar, penyusunan materi/pertanyaan, pengujian pengguna (user testing), analisis hasil, atau penyusunan dokumen.
- 8-13 SP: Pengembangan teknis (MVP development), integrasi multi-sistem/stakeholder, arsitektur sistem, atau implementasi teknis kompleks.

Output HARUS berupa JSON murni:
{
  "storyPoint": 3
}`;

    const userPrompt = `Nilai Story Point untuk kartu task berikut:
- Judul: ${judul}
- Deskripsi: ${deskripsi || '-'}
- Acceptance Criteria: ${acceptanceCriteria || '-'}

Keluarkan skor Story Point Fibonacci murni.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '';
    if (!responseText) {
      return estimateStoryPointHeuristic(judul, deskripsi || '', acceptanceCriteria || '');
    }

    const parsed = JSON.parse(responseText);
    const spRaw = typeof parsed.storyPoint === 'number' ? parsed.storyPoint : parseInt(parsed.storyPoint, 10);
    return normalizeToFibonacci(spRaw, estimateStoryPointHeuristic(judul, deskripsi || '', acceptanceCriteria || ''));
  } catch (err: any) {
    console.warn(`[AI StoryPoint] Error estimating SP for "${judul}":`, err.message);
    return estimateStoryPointHeuristic(judul, deskripsi || '', acceptanceCriteria || '');
  }
}

/**
 * Panggil AI (gpt-5.4-mini / gpt-4o-mini) untuk memecah teks Roadmap proposal
 * menjadi kumpulan Scrum Backlog Tasks atomik lengkap dengan:
 * 1. suggestedSprintNumber (terdistribusi dari Sprint 1 sampai totalSprints)
 * 2. storyPoint skala Fibonacci (1, 2, 3, 5, 8, 13)
 * 3. subtasks (3-5 langkah kerja konkret dengan estimatedHours)
 */
export async function generateAiBacklogFromRoadmap(params: {
  teamId: string;
  proposalId: string;
  namaProyek: string;
  kategoriPia: string;
  roadmapText: string;
  totalSprints?: number;
  rawProposalData?: Record<string, any>;
}): Promise<AiBacklogTask[] | null> {
  const { teamId, proposalId, namaProyek, kategoriPia, roadmapText, rawProposalData, totalSprints = 4 } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(`[AI Backlog] OPENAI_API_KEY is not configured. Skipping AI Backlog generation for proposal ${proposalId}.`);
    return null;
  }

  if (!roadmapText || roadmapText.trim().length < 10) {
    console.warn(`[AI Backlog] Insufficient roadmap text for proposal ${proposalId}. Skipping.`);
    return null;
  }

  console.log(`[AI Backlog] 🚀 Starting AI-powered Backlog generation for Team ID: ${teamId}, Proposal ID: ${proposalId} (${namaProyek}) - Total Sprints: ${totalSprints}`);

  try {
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Anda adalah Scrum Master & Agile Coach senior ahli metodologi Scrum dan Lean Startup di PT Pegadaian (Persero).
Tugas Anda adalah membedah dan memecah roadmap implementasi inovasi (bagian "Cara mewujudkan ide inovasi" / tahapan implementasi) dari proposal PIA Season 12 menjadi daftar Backlog Task atomik berstandar Scrum yang tajam, konkret, lengkap dengan estimasi Story Point skala Fibonacci, serta 3-5 SUBTASK teknis/operasional per kartu, siap dikerjakan tim.

ATURAN GRANULARITAS TASK (SANGAT PENTING):
1. DILARANG KERAS MEMBUAT TASK SETINGKAT EPIC / MAKRO.
2. PECAH SETIAP FASE / ELEMEN ROADMAP MENJADI 3 SAMPAI 6 TASK ATOMIK (Single Actionable Work Item).
   Total hasil pemecahan menghasilkan antara 10 hingga 20 task backlog untuk keseluruhan roadmap proposal.

ATURAN STORY POINT (storyPoint):
Beri skor kompleksitas kualitatif untuk tiap task menggunakan skala Fibonacci murni: [1, 2, 3, 5, 8, 13]:
- 1-2 SP: Tugas administratif singkat, brief, penjadwalan, rekap ringan.
- 3-5 SP: Riset dasar, penyusunan materi/pertanyaan, user testing, analisis kualitatif, review.
- 8-13 SP: Integrasi teknis multi-sistem, development fitur MVP, arsitektur data.

ATURAN SPRINT ASSIGNMENT (suggestedSprintNumber):
Petakan setiap task ke nomor sprint yang paling tepat (integer dari 1 sampai ${totalSprints}) berdasarkan urutan sekuensial tahapan di roadmap/proposal:
- Sprint 1: Persiapan awal, penyelarasan stakeholder, riset dasar, desain konsep awal.
- Sprint 2 s.d. ${Math.max(2, totalSprints - 1)}: Eksekusi pengembangan prototipe, integrasi, pengujian bertahap.
- Sprint ${totalSprints}: Uji coba akhir, rilis rintisan, pelaporan performa.

ATURAN SUBTASK (subtasks):
Untuk setiap task, buat 3 sampai 5 subtask tindakan teknis yang runtut (Persiapan -> Eksekusi -> Validasi/Dokumentasi) beserta estimasi jam (integer 1-16 jam).

ATURAN FORMAT SCRUM & PEMISAHAN FIELD:
1. JUDUL TASK: Wajib diawali KATA KERJA AKTIF / IMPERATIVE VERB sebagai KATA PERTAMA (contoh: "Susun", "Siapkan", "Jadwalkan", "Koordinasikan", "Petakan", "Rancang", "Kembangkan", "Hubungkan", "Lakukan", "Uji coba", "Rangkum", "Evaluasi").
2. ANTI-HALUSINASI KETAT: HANYA gunakan konteks, nama sistem, stakeholder, dan entitas yang disebutkan di proposal/roadmap.
3. DESKRIPSI (deskripsi):
   - WAJIB DIAWALI KATA KERJA IMPERATIF / AKTIF.
   - DILARANG KERAS MENGGUNAKAN KATA SUBJEK "Tim", "Tim inovator", atau subjek orang ketiga lainnya.
   - Tulis sebagai instruksi langsung 1-2 kalimat mengenai aktivitas yang dikerjakan.
   - DILARANG memasukkan kalimat hasil/output ke dalam deskripsi.
4. ACCEPTANCE CRITERIA (acceptanceCriteria): Berisi definisi luaran konkret / tolok ukur hasil kerja task tersebut tanpa awalan "Hasil atau output dari task/aktivitas ini adalah".
5. storyPoint: Angka integer salah satu dari [1, 2, 3, 5, 8, 13].
6. suggestedSprintNumber: Angka integer antara 1 sampai ${totalSprints}.
7. subtasks: Array 3-5 subtask dengan "title" (string) dan "estimatedHours" (integer 1-16).
8. Output HARUS berupa format JSON murni tanpa markdown formatting.`;

    const userPrompt = `PROPOSAL METADATA:
- Proposal ID: ${proposalId}
- Nama Inovasi: ${namaProyek}
- Kategori PIA: ${kategoriPia}
- Total Sprint Tersedia: ${totalSprints}

TEKS ROADMAP LENGKAP DARI PROPOSAL ("Cara Mewujudkan Ide Inovasi"):
"""
${roadmapText}
"""

KONTEKS PROPOSAL TERKAIT (MASALAH, SOLUSI & DUKUNGAN):
${rawProposalData ? JSON.stringify(rawProposalData, null, 2) : 'Tidak ada'}

Pecah roadmap di atas menjadi daftar Backlog Task atomik lengkap dengan 'storyPoint' (1, 2, 3, 5, 8, 13) dan 'subtasks' ke dalam format JSON:
{
  "tasks": [
    {
      "judul": "Kata Kerja Aktif + Target dan Konteks Aksi Atomik",
      "deskripsi": "Kata Kerja Imperatif + penjelasan konteks aktivitas langsung tanpa subjek 'Tim'.",
      "acceptanceCriteria": "Luaran konkret / dokumen / deliverable / tolok ukur selesai.",
      "storyPoint": 3,
      "suggestedSprintNumber": 1,
      "subtasks": [
        {
          "title": "Subtask aksi spesifik 1",
          "estimatedHours": 3
        },
        {
          "title": "Subtask aksi spesifik 2",
          "estimatedHours": 4
        },
        {
          "title": "Subtask aksi spesifik 3",
          "estimatedHours": 2
        }
      ]
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
    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      if (t && typeof t.judul === 'string' && t.judul.trim().length > 0) {
        let sprintNum = typeof t.suggestedSprintNumber === 'number' ? Math.round(t.suggestedSprintNumber) : null;
        if (!sprintNum || sprintNum < 1 || sprintNum > totalSprints) {
          sprintNum = (i % totalSprints) + 1;
        }

        const sp = normalizeToFibonacci(t.storyPoint, estimateStoryPointHeuristic(t.judul, t.deskripsi, t.acceptanceCriteria));

        const subtasks: AiBacklogSubtask[] = [];
        if (Array.isArray(t.subtasks)) {
          for (const st of t.subtasks) {
            if (st && typeof st.title === 'string' && st.title.trim().length > 0) {
              const est = typeof st.estimatedHours === 'number' && st.estimatedHours > 0
                ? Math.round(st.estimatedHours)
                : Math.max(2, Math.round(sp * 1.5));
              subtasks.push({
                title: st.title.trim(),
                estimatedHours: Math.min(24, Math.max(1, est)),
              });
            }
          }
        }

        // Fallback subtasks if AI did not return valid subtasks array
        if (subtasks.length === 0) {
          subtasks.push(
            { title: `Persiapan, riset kebutuhan, & koordinasi: ${t.judul.trim().substring(0, 45)}`, estimatedHours: Math.max(2, Math.round(sp * 1.2)) },
            { title: `Implementasi teknis & eksekusi aktivitas utama`, estimatedHours: Math.max(3, Math.round(sp * 2.0)) },
            { title: `Validasi, pengujian hasil, & dokumentasi luaran`, estimatedHours: Math.max(2, Math.round(sp * 1.0)) }
          );
        }

        validatedTasks.push({
          judul: t.judul.trim(),
          deskripsi: typeof t.deskripsi === 'string' ? t.deskripsi.trim() : '',
          acceptanceCriteria: typeof t.acceptanceCriteria === 'string' ? t.acceptanceCriteria.trim() : '',
          storyPoint: sp,
          suggestedSprintNumber: sprintNum,
          subtasks,
        });
      }
    }

    console.log(`[AI Backlog] ✅ Successfully generated ${validatedTasks.length} Scrum Backlog tasks with Story Points & Subtasks for Proposal ID: ${proposalId} using model: ${modelName}`);
    return validatedTasks.length > 0 ? validatedTasks : null;
  } catch (err: any) {
    console.error(`[AI Backlog] ❌ Error during AI Backlog generation for Proposal ID ${proposalId}:`, err.message);
    return null;
  }
}
