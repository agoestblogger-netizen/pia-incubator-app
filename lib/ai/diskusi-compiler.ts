import OpenAI from 'openai';
import { normalizeToFibonacci } from './backlog-generator';

export interface CompiledBacklogDraft {
  judul: string;
  deskripsi: string;
  acceptanceCriteria: string;
  tahap: 'customer_validation' | 'market_validation';
  storyPoint: number;
  subtasks: Array<{
    title: string;
    estimatedHours: number;
  }>;
}

export async function compileStickyNotesToBacklog({
  noteContents,
  frameLabel,
  teamName,
  kategoriPia,
}: {
  noteContents: string[];
  frameLabel?: string;
  teamName: string;
  kategoriPia?: string;
}): Promise<CompiledBacklogDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY tidak dikonfigurasi.');
  }

  const openai = new OpenAI({
    apiKey,
    timeout: 25_000,
  });

  const notesListFormatted = noteContents
    .map((c, i) => `${i + 1}. "${c.trim()}"`)
    .join('\n');

  const systemPrompt = `Anda adalah Agile Scrum Coach & Innovation Specialist senior di PT Pegadaian (Program PIA Incubator).
Tugas Anda adalah mengompilasi sekumpulan catatan ide/sticky note dari Ruang Diskusi tim inovasi menjadi SATU draf kartu Backlog Scrum yang terstruktur, konkret, dan siap dieksekusi.

ATURAN OUTPUT:
1. judul: Ringkas, jelas, diawali kata kerja aksi (contoh: "Rancang Desain Onboarding & Skema Validasi Pengguna", "Kembangkan Prototipe Sistem Rekonsiliasi Otomatis"). Maksimal 80 karakter.
2. deskripsi: Sintesis komprehensif dari ide-ide yang didiskusikan. Jelaskan latar belakang ide, sasaran utama, dan cakupan implementasinya.
3. acceptanceCriteria: Kriteria keberhasilan luaran yang terukur, konkret, dan dapat diverifikasi saat task dinyatakan selesai.
4. tahap: Pilih salah satu yang paling sesuai dari: "customer_validation" (uji problem-solution fit / riset / prototype) atau "market_validation" (uji pilot / DFV / MVP / implementasi bisnis). JANGAN gunakan kategori lain.
5. storyPoint: Estimasikan durasi kerja dalam MENIT yang realistis, lalu konversikan ke story_point = menit ÷ 60 (1 SP = 60 menit).
6. subtasks: Buat 3 sampai 5 subtask konkret dan actionable yang menggambarkan langkah eksekusi teknis dan operasional secara berurutan. Setiap subtask memiliki title yang deskriptif dan estimatedHours (integer 1-16).

KEMBALIKAN HANYA JSON VALID SESUAI FORMAT:
{
  "judul": "...",
  "deskripsi": "...",
  "acceptanceCriteria": "...",
  "tahap": "customer_validation",
  "storyPoint": 3,
  "subtasks": [
    { "title": "...", "estimatedHours": 3 },
    { "title": "...", "estimatedHours": 4 },
    { "title": "...", "estimatedHours": 2 }
  ]
}`;

  const userPrompt = `Tim Inovasi: ${teamName} (${kategoriPia || 'Umum'})
Kelompok Diskusi: ${frameLabel || 'Kelompok Ide'}

Daftar Catatan Diskusi / Sticky Notes yang perlu dikompilasi:
${notesListFormatted}

Susun draf kartu backlog lengkap berdasarkan ide-ide di atas dalam format JSON.`;

  const primaryModel = process.env.OPENAI_MODEL_BACKLOG || 'gpt-5.4-mini';
  const fallbackModel = 'gpt-4o-mini';

  async function callModel(modelName: string): Promise<string | null> {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message?.content || null;
  }

  let rawJson: string | null = null;
  try {
    rawJson = await callModel(primaryModel);
  } catch (err: any) {
    console.warn(`[compileStickyNotes] ${primaryModel} gagal (${err.message}), fallback ke ${fallbackModel}`);
    rawJson = await callModel(fallbackModel);
  }

  if (!rawJson) {
    throw new Error('AI tidak mengembalikan respon kompilasi.');
  }

  const parsed = JSON.parse(rawJson);

  return {
    judul: (parsed.judul || frameLabel || 'Inisiatif Baru').substring(0, 100),
    deskripsi: parsed.deskripsi || noteContents.join('\n- '),
    acceptanceCriteria: parsed.acceptanceCriteria || 'Hasil implementasi dan dokumentasi luaran terverifikasi oleh tim.',
    tahap: parsed.tahap === 'market_validation' ? 'market_validation' : 'customer_validation',
    storyPoint: normalizeToFibonacci(parsed.storyPoint, 3),
    subtasks: Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0
      ? parsed.subtasks.map((st: any) => ({
          title: String(st.title || 'Eksekusi aktivitas terkait').substring(0, 120),
          estimatedHours: typeof st.estimatedHours === 'number' && st.estimatedHours > 0 ? Math.min(24, Math.round(st.estimatedHours)) : 3,
        }))
      : [
          { title: `Persiapan dan perumusan kebutuhan: ${(parsed.judul || '').substring(0, 45)}`, estimatedHours: 3 },
          { title: 'Implementasi dan eksekusi teknis solusi', estimatedHours: 5 },
          { title: 'Uji coba hasil dan dokumentasi luaran', estimatedHours: 3 },
        ],
  };
}
