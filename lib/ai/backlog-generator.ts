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
 * 3. subtasks (3-5 langkah kerja konkret, deskriptif, dan actionable, dengan estimatedHours)
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
    const openai = new OpenAI({ apiKey, timeout: 25000 });

    const systemPrompt = `Anda adalah Scrum Master senior PT Pegadaian (Persero).
Tugas: Pecah roadmap implementasi proposal PIA menjadi 10-14 Backlog Task atomik standar Scrum lengkap dengan:
1. Story Point Fibonacci: [1, 2, 3, 5, 8, 13]
2. suggestedSprintNumber: integer antara 1 sampai ${totalSprints} (terdistribusi seimbang dari Sprint 1 s.d ${totalSprints})
3. subtasks: 3 sampai 5 subtask konkret dan actionable per task (estimatedHours integer 1-16). Setiap subtask HARUS jelas menggambarkan tindakan spesifik yang dilakukan — deskriptif dan dapat langsung dieksekusi, BUKAN dipotong kaku.

ATURAN FORMAT:
- JUDUL: Diawali KATA KERJA AKTIF (Susun, Siapkan, Rancang, Kembangkan, Hubungkan, Uji coba, Evaluasi).
- DESKRIPSI: Instruksi aktivitas ringkas tanpa kata subjek "Tim".
- ACCEPTANCE CRITERIA: Luaran konkret / kriteria selesai.
- Output HARUS JSON murni tanpa markdown.`;

    const userPrompt = `PROPOSAL: ${namaProyek} (${kategoriPia}) | Total Sprint: ${totalSprints}
ROADMAP TEKS:
"""
${roadmapText.substring(0, 1500)}
"""

Pecah roadmap di atas menjadi daftar Backlog Task atomik (10-14 tasks) dengan 'storyPoint', 'suggestedSprintNumber', dan 'subtasks' ke format JSON:
{
  "tasks": [
    {
      "judul": "Kata Kerja Aktif + Sasaran Aksi",
      "deskripsi": "Aktivitas teknis ringkas yang menjelaskan apa yang dilakukan.",
      "acceptanceCriteria": "Luaran selesai yang terukur dan konkret.",
      "storyPoint": 5,
      "suggestedSprintNumber": 1,
      "subtasks": [
        { "title": "Identifikasi kebutuhan teknis dan peta risiko awal", "estimatedHours": 3 },
        { "title": "Koordinasi dengan pemangku kepentingan terkait scope", "estimatedHours": 2 },
        { "title": "Implementasi komponen utama sesuai desain arsitektur", "estimatedHours": 6 },
        { "title": "Uji coba fungsional dan perbaikan bug yang ditemukan", "estimatedHours": 4 },
        { "title": "Dokumentasi hasil dan serah terima luaran kepada tim", "estimatedHours": 2 }
      ]
    }
  ]
}`;

    // Prefer gpt-5.4-mini, fallback to gpt-4o-mini
    let modelName = 'gpt-5.4-mini';
    let responseText = '';
    const t0 = performance.now();

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (modelErr: any) {
      console.warn(`[AI Backlog] Model ${modelName} failed/timed out (${modelErr.message}), falling back to gpt-4o-mini...`);
      modelName = 'gpt-4o-mini';
      const fallbackCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      responseText = fallbackCompletion.choices[0]?.message?.content || '';
    }

    const t1 = performance.now();
    const durationSec = ((t1 - t0) / 1000).toFixed(2);

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
