import OpenAI from 'openai';

export interface AiBacklogSubtask {
  title: string;
  estimatedHours: number;
  subtaskType?: string;
  reportFieldMapping?: Record<string, any>;
}

export interface AiBacklogTask {
  judul: string;
  deskripsi: string;
  acceptanceCriteria: string;
  tahap?: 'customer_validation' | 'market_validation';
  suggestedSprintNumber?: number;
  storyPoint?: number;
  subtasks?: AiBacklogSubtask[];
}

export interface AiBacklogResponse {
  tasks: AiBacklogTask[];
}

/** Heuristik untuk mengklasifikasi task ke tahap customer_validation atau market_validation */
export function classifyBacklogTaskTahap(judul: string, deskripsi = '', acceptanceCriteria = ''): 'customer_validation' | 'market_validation' {
  const text = `${judul} ${deskripsi} ${acceptanceCriteria}`.toLowerCase();
  
  // Rule: MV HANYA untuk task yang JELAS soal membangun/mengembangkan/mengintegrasikan sistem, modul, fitur, atau platform nyata
  const isBuildingSystem =
    text.includes('kembangkan modul') ||
    text.includes('kembangkan fitur') ||
    text.includes('kembangkan sistem') ||
    text.includes('kembangkan aplikasi') ||
    text.includes('kembangkan platform') ||
    text.includes('kembangkan backend') ||
    text.includes('kembangkan frontend') ||
    text.includes('kembangkan engine') ||
    text.includes('bangun sistem') ||
    text.includes('bangun aplikasi') ||
    text.includes('bangun platform') ||
    text.includes('bangun mvp') ||
    text.includes('kembangkan mvp') ||
    text.includes('integrasikan api') ||
    text.includes('integrasi sistem') ||
    text.includes('integrasi database') ||
    text.includes('integrasi layanan') ||
    text.includes('rilis mvp') ||
    text.includes('rilis sistem') ||
    text.includes('rilis aplikasi') ||
    text.includes('rilis platform') ||
    text.includes('pilot release') ||
    text.includes('backend development') ||
    text.includes('frontend development') ||
    text.includes('software development') ||
    text.includes('coding') ||
    text.includes('deployment');

  if (isBuildingSystem) {
    return 'market_validation';
  }

  // DEFAULT untuk SEMUA task lainnya (riset, wawancara, testing, prototype, kemitraan/MOU, koordinasi divisi, kepatuhan/compliance, admin, dll.)
  return 'customer_validation';
}

/** Normalisasi Story Point (1 SP = 60 menit, linear). Mendukung desimal & integer positif. */
export function normalizeStoryPoint(val: number | null | undefined, fallback = 3): number {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return fallback;
  return Number(val.toFixed(2));
}

export const normalizeToFibonacci = normalizeStoryPoint;

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
    const systemPrompt = `Anda adalah Scrum Master & Agile Coach senior ahli estimasi waktu kerja Scrum (1 Story Point = 60 Menit).
Tugas Anda adalah mengestimasikan durasi pengerjaan kartu task backlog dalam MENIT yang realistis berdasarkan judul & deskripsi kartu, lalu mengeluarkannya dalam bentuk Story Point (menit ÷ 60):
- Contoh: 60 menit = 1 SP
- Contoh: 120 menit = 2 SP
- Contoh: 180 menit = 3 SP
- Contoh: 240 menit = 4 SP
- Contoh: 300 menit = 5 SP
- Contoh: 480 menit = 8 SP

Output HARUS berupa JSON murni:
{
  "estimasiMenit": 180,
  "storyPoint": 3
}`;

    const userPrompt = `Estimasikan durasi pengerjaan dalam menit dan story point untuk kartu task berikut:
- Judul: ${judul}
- Deskripsi: ${deskripsi || '-'}
- Acceptance Criteria: ${acceptanceCriteria || '-'}

Keluarkan estimasi waktu menit dan story_point (menit ÷ 60).`;

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
 * 1. tahap: diklasifikasikan ke 'customer_validation' atau 'market_validation' (tanpa innovation_setup)
 * 2. suggestedSprintNumber: terdistribusi sesuai tahap (CV di sprint awal, MV di sprint lanjutan)
 * 3. storyPoint skala menit ÷ 60
 * 4. subtasks (3-5 langkah kerja konkret, deskriptif, dan actionable, dengan estimatedHours)
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

  const cvMaxSprint = Math.max(1, Math.min(2, Math.floor(totalSprints / 2)));
  const mvMinSprint = Math.min(totalSprints, cvMaxSprint + 1);

  console.log(`[AI Backlog] 🚀 Starting AI-powered Backlog generation for Team ID: ${teamId}, Proposal ID: ${proposalId} (${namaProyek}) - Total Sprints: ${totalSprints} (CV Sprints: 1-${cvMaxSprint}, MV Sprints: ${mvMinSprint}-${totalSprints})`);

  try {
    const openai = new OpenAI({ apiKey, timeout: 25000 });

    const systemPrompt = `Anda adalah Scrum Master senior PT Pegadaian (Persero).
Tugas: Pecah roadmap implementasi proposal PIA menjadi 10-14 Backlog Task atomik standar Scrum lengkap dengan:
1. tahap: MENGKLASIFIKASIKAN tiap task ke salah satu dari 2 tag persis ('customer_validation' ATAU 'market_validation') dengan aturan sederhana:
   - 'market_validation': HANYA untuk task yang JELAS soal membangun / mengembangkan / mengintegrasikan sistem, modul, fitur teknis, atau platform MVP beneran (kata kerja seperti "Kembangkan modul...", "Bangun platform...", "Integrasikan API/sistem...", "Rilis MVP...").
   - 'customer_validation': DEFAULT untuk SEMUA task lainnya — termasuk riset pengguna, wawancara, testing, prototype mockup, kemitraan/MoU, koordinasi lintas divisi, persiapan kepatuhan/compliance, legal, dan administrasi. Jika ragu atau bukan soal build sistem, WAJIB default ke 'customer_validation'.
   - JANGAN PERNAH gunakan tag 'innovation_setup' (opsi ini telah dihapus).
2. storyPoint: estimasikan durasi pengerjaan dalam MENIT yang realistis (misal 60, 120, 180, 240, 300, 480 menit) lalu konversikan ke story_point = menit ÷ 60 (1 SP = 60 menit).
3. suggestedSprintNumber: integer antara 1 sampai ${totalSprints}:
   - Untuk task 'customer_validation': distribusikan di rentang sprint AWAL (Sprint 1 sampai ${cvMaxSprint}).
   - Untuk task 'market_validation': distribusikan di rentang sprint LANJUTAN (Sprint ${mvMinSprint} sampai ${totalSprints}).
4. subtasks: 3 sampai 5 subtask konkret dan actionable per task (estimatedHours integer 1-16). Setiap subtask HARUS jelas menggambarkan tindakan spesifik yang dilakukan — deskriptif dan dapat langsung dieksekusi.

ATURAN FORMAT:
- JUDUL: Diawali KATA KERJA AKTIF (Susun, Siapkan, Rancang, Kembangkan, Hubungkan, Uji coba, Evaluasi).
- DESKRIPSI: Instruksi aktivitas ringkas tanpa kata subjek "Tim".
- ACCEPTANCE CRITERIA: Luaran konkret / kriteria selesai.
- Output HARUS JSON murni tanpa markdown.`;

    const userPrompt = `PROPOSAL: ${namaProyek} (${kategoriPia}) | Total Sprint: ${totalSprints} (CV: Sprint 1-${cvMaxSprint}, MV: Sprint ${mvMinSprint}-${totalSprints})
ROADMAP TEKS:
"""
${roadmapText.substring(0, 1500)}
"""

Pecah roadmap di atas menjadi daftar Backlog Task atomik (10-14 tasks) dengan 'tahap' ('customer_validation' atau 'market_validation'), 'storyPoint', 'suggestedSprintNumber', dan 'subtasks' ke format JSON:
{
  "tasks": [
    {
      "judul": "Kata Kerja Aktif + Sasaran Aksi",
      "deskripsi": "Aktivitas teknis ringkas yang menjelaskan apa yang dilakukan.",
      "acceptanceCriteria": "Luaran selesai yang terukur dan konkret.",
      "tahap": "market_validation",
      "storyPoint": 5,
      "suggestedSprintNumber": ${mvMinSprint},
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
        const taskTahap: 'customer_validation' | 'market_validation' =
          t.tahap === 'customer_validation' || t.tahap === 'market_validation'
            ? t.tahap
            : classifyBacklogTaskTahap(t.judul, t.deskripsi, t.acceptanceCriteria);

        let sprintNum = typeof t.suggestedSprintNumber === 'number' ? Math.round(t.suggestedSprintNumber) : null;
        if (taskTahap === 'customer_validation') {
          if (!sprintNum || sprintNum < 1 || sprintNum > cvMaxSprint) {
            sprintNum = (i % cvMaxSprint) + 1;
          }
        } else {
          if (!sprintNum || sprintNum < mvMinSprint || sprintNum > totalSprints) {
            sprintNum = mvMinSprint + (i % Math.max(1, totalSprints - mvMinSprint + 1));
          }
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
          tahap: taskTahap,
          storyPoint: sp,
          suggestedSprintNumber: sprintNum,
          subtasks,
        });
      }
    }

    console.log(`[AI Backlog] ✅ Successfully generated ${validatedTasks.length} Scrum Backlog tasks for Proposal ID: ${proposalId} (CV: ${validatedTasks.filter(t => t.tahap === 'customer_validation').length}, MV: ${validatedTasks.filter(t => t.tahap === 'market_validation').length}) using model: ${modelName}`);
    return validatedTasks.length > 0 ? validatedTasks : null;
  } catch (err: any) {
    console.error(`[AI Backlog] ❌ Error during AI Backlog generation for Proposal ID ${proposalId}:`, err.message);
    return null;
  }
}
