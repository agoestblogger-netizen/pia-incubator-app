import OpenAI from 'openai';

export interface CompiledBacklogDraft {
  judul: string;
  deskripsi: string;
  acceptanceCriteria: string;
  tahap: 'customer_validation' | 'market_validation';
  storyPoint: number;
  totalMinutes: number;
  subtasks: Array<{
    title: string;
    estimatedMinutes: number;
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
    .map((c, i) => `Sticky Note #${i + 1}: "${c.trim()}"`)
    .join('\n');

  const systemPrompt = `Anda adalah Agile Scrum Coach & Innovation Specialist senior di PT Pegadaian (Program PIA Incubator).
Tugas Anda adalah mengompilasi sekumpulan catatan ide/sticky note dari Ruang Diskusi tim inovasi menjadi SATU draf kartu Backlog Scrum yang terstruktur, konkret, dan siap dieksekusi.

ATURAN OUTPUT MUTLAK:
1. judul: Ringkas, jelas, diawali kata kerja aksi (contoh: "Rancang Desain Onboarding & Skema Validasi Pengguna", "Kembangkan Prototipe Sistem Rekonsiliasi Otomatis"). Maksimal 80 karakter.
2. deskripsi: Sintesis komprehensif dari seluruh ide yang didiskusikan. Jelaskan latar belakang ide, sasaran utama, dan cakupan implementasinya.
3. acceptanceCriteria: Kriteria keberhasilan luaran yang terukur, konkret, dan dapat diverifikasi saat task dinyatakan selesai.
4. tahap: Pilih salah satu yang paling sesuai dari: "customer_validation" (uji problem-solution fit / riset / prototype) atau "market_validation" (uji pilot / DFV / MVP / implementasi bisnis).
5. subtasks: HARUS TEPAT 1:1 BERKOLELASI DENGAN CATATAN STICKY NOTE.
   - Jumlah item subtask yang dihasilkan HARUS PERSIS SAMA DENGAN JUMLAH STICKY NOTE yang diberikan (diberikan ${noteContents.length} sticky notes = harus menghasilkan tepat ${noteContents.length} subtasks).
   - Judul tiap subtask (field "title") diambil LANGSUNG dari isi teks sticky note yang bersangkutan secara berurutan (boleh dirapikan tata bahasanya sedikit, tapi maknanya harus tetap representasi langsung dari sticky note tersebut; JANGAN dipecah-pecah menjadi banyak subtask baru dan JANGAN digabung).
   - Setiap subtask memiliki estimasi durasi kerja dalam MENIT (field "estimatedMinutes", integer kelipatan 15 atau 30 menit, contoh: 60, 90, 120, 180).

KEMBALIKAN HANYA JSON VALID SESUAI FORMAT:
{
  "judul": "...",
  "deskripsi": "...",
  "acceptanceCriteria": "...",
  "tahap": "customer_validation",
  "subtasks": [
    { "title": "Judul representasi Sticky Note 1", "estimatedMinutes": 60 }
  ]
}`;

  const userPrompt = `Tim Inovasi: ${teamName} (${kategoriPia || 'Umum'})
Kelompok Diskusi: ${frameLabel || 'Kelompok Ide'}
Total Sticky Notes: ${noteContents.length}

Daftar Catatan Diskusi / Sticky Notes yang perlu dikompilasi (buat tepat ${noteContents.length} subtask berurutan 1:1):
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

  // Enforce strictly 1:1 mapping with noteContents
  const rawSubtasks: any[] = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];
  const normalizedSubtasks = noteContents.map((noteText, idx) => {
    const matched = rawSubtasks[idx];
    const rawTitle = matched && typeof matched.title === 'string' && matched.title.trim() ? matched.title.trim() : noteText.trim();
    const rawMins = matched && typeof matched.estimatedMinutes === 'number' && matched.estimatedMinutes > 0
      ? matched.estimatedMinutes
      : (matched && typeof matched.estimatedHours === 'number' && matched.estimatedHours > 0 ? matched.estimatedHours * 60 : 60);

    return {
      title: rawTitle.substring(0, 120),
      estimatedMinutes: Math.max(15, Math.round(rawMins / 15) * 15),
    };
  });

  const totalMinutes = normalizedSubtasks.reduce((sum, st) => sum + st.estimatedMinutes, 0);
  const calculatedStoryPoint = Number((totalMinutes / 60).toFixed(2));

  return {
    judul: (parsed.judul || frameLabel || 'Inisiatif Baru').substring(0, 100),
    deskripsi: parsed.deskripsi || noteContents.join('\n- '),
    acceptanceCriteria: parsed.acceptanceCriteria || 'Hasil implementasi dan dokumentasi luaran terverifikasi oleh tim.',
    tahap: parsed.tahap === 'market_validation' ? 'market_validation' : 'customer_validation',
    totalMinutes,
    storyPoint: calculatedStoryPoint,
    subtasks: normalizedSubtasks,
  };
}
