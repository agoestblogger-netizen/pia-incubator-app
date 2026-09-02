import OpenAI from 'openai';
import { AiBacklogTask, AiBacklogSubtask, normalizeToFibonacci, estimateStoryPointHeuristic } from './backlog-generator';

export interface CvPlanData {
  projectMission?: string | null;
  customerDanContext?: string | null;
  problemHypothesis?: string | null;
  hmw?: string | null;
  solutionHypothesis?: string | null;
  prototypeType?: string | null;
  fiturAlurDiuji?: string | null;
  skenarioUserTesting?: string | null;
  instrumenValidasi?: string | null;
  targetEarlyAdopters?: string | null;
  kriteriaSeleksi?: string | null;
  jumlahTargetResponden?: number | null;
  lokasiChannelTesting?: string | null;
  metodeRekrutmen?: string | null;
  etikaPersetujuanData?: string | null;
}

export function getFallbackCvBacklogTasks(params: {
  namaProyek: string;
  plan: CvPlanData;
  totalSprints?: number;
}): AiBacklogTask[] {
  const { namaProyek, plan, totalSprints = 4 } = params;
  const maxAllowedSpan = Math.max(1, totalSprints - 1);
  const proto = plan.prototypeType || "Clickable Prototype / Figma";
  const respondenCount = plan.jumlahTargetResponden || 10;
  const targetUser = plan.targetEarlyAdopters || "Early Adopters";

  // Dynamic span for fallback based on complexity, clamped to maxAllowedSpan
  const cvSprintSpan = (respondenCount >= 20 || (plan.lokasiChannelTesting && plan.lokasiChannelTesting.includes('&'))) && maxAllowedSpan >= 2 ? 2 : 1;

  const tasks: Array<{
    judul: string;
    deskripsi: string;
    acceptanceCriteria: string;
    sprint: number;
    sp: number;
    subtasks: Array<{ title: string; estimatedHours: number }>;
  }> = [];

  // 1. Tugas Persiapan / Pra-CV (Koordinasi stakeholder / kemitraan / kesiapan operasional)
  if (plan.customerDanContext || plan.metodeRekrutmen || plan.targetEarlyAdopters) {
    tasks.push({
      judul: `Konsolidasikan koordinasi stakeholder & persiapan kemitraan early adopter`,
      deskripsi: `Lakukan penyelarasan ruang lingkup pengujian bersama unit kerja pengelola segmen ${targetUser}.`,
      acceptanceCriteria: `Kesepakatan jadwal dan alur koordinasi pengujian tervalidasi oleh pihak terkait.`,
      sprint: 1,
      sp: 3,
      subtasks: [
        { title: "Identifikasi pemangku kepentingan kunci pengelola segmen", estimatedHours: 120 },
        { title: "Briefing alur dan ekspektasi sesi validasi pelanggan", estimatedHours: 180 },
        { title: "Konfirmasi kesiapan dukungan data dan akses responden", estimatedHours: 120 },
      ],
    });
  }

  // 2. Prototype Preparation
  tasks.push({
    judul: `Siapkan dan finalisasi ${proto} untuk user testing`,
    deskripsi: `Pastikan seluruh alur utama (${plan.fiturAlurDiuji || "fitur kunci"}) siap diuji tanpa kendala teknis bersama responden.`,
    acceptanceCriteria: `Link prototype aktif, alur simulasi terverifikasi, dan materi demo siap digunakan untuk testing.`,
    sprint: 1,
    sp: 5,
    subtasks: [
      { title: "Review kelengkapan alur dan skenario prototype", estimatedHours: 240 },
      { title: "Lakukan internal dry-run testing alur solusi", estimatedHours: 180 },
      { title: "Perbaiki interaksi dan navigasi yang belum lancar", estimatedHours: 180 },
    ],
  });

  // 3. Testing Instrument
  tasks.push({
    judul: `Susun panduan wawancara, skenario testing, & lembar observasi`,
    deskripsi: `Rumuskan instrumen pengujian berbasis ${plan.instrumenValidasi || "kuesioner & wawancara semi-terstruktur"} dan skenario ${plan.skenarioUserTesting || "pengujian tugas"}.`,
    acceptanceCriteria: `Dokumen panduan fasilitator, daftar pertanyaan kunci, dan form pencatatan observasi tersedia.`,
    sprint: 1,
    sp: 3,
    subtasks: [
      { title: "Petakan task scenario yang akan dijalankan pengguna", estimatedHours: 180 },
      { title: "Susun pertanyaan evaluasi 5 dimensi feedback (Usability, Functionality, Solvability, Payability)", estimatedHours: 180 },
      { title: "Siapkan lembar informed consent dan etika data", estimatedHours: 120 },
    ],
  });

  // 4. Recruitment
  tasks.push({
    judul: `Rekrut dan jadwalkan ${respondenCount} responden ${targetUser}`,
    deskripsi: `Lakukan penyaringan calon responden sesuai kriteria (${plan.kriteriaSeleksi || "sesuai profil target"}) melalui channel ${plan.lokasiChannelTesting || "unit kerja / online"}.`,
    acceptanceCriteria: `${respondenCount} responden terkonfirmasi dengan jadwal sesi testing yang terorganisir.`,
    sprint: cvSprintSpan === 1 ? 1 : 2,
    sp: 3,
    subtasks: [
      { title: "Sebarkan screening form ke target komunitas/unit kerja", estimatedHours: 180 },
      { title: "Kurasi kandidat sesuai kriteria seleksi early adopter", estimatedHours: 120 },
      { title: "Konfirmasi kesediaan waktu dan kirimkan jadwal sesi", estimatedHours: 120 },
    ],
  });

  // 5. Execution
  tasks.push({
    judul: `Eksekusi sesi Customer Testing dengan responden early adopter`,
    deskripsi: `Laksanakan pengujian langsung dengan pengguna, amati hambatan interaksi, dan catat respon verbal/non-verbal.`,
    acceptanceCriteria: `Seluruh sesi user testing terlaksana dengan catatan observasi, rekaman/transkrip, dan form consent lengkap.`,
    sprint: cvSprintSpan === 1 ? 1 : 2,
    sp: 8,
    subtasks: [
      { title: "Fasilitasi sesi interaksi responden dengan prototype", estimatedHours: 360 },
      { title: "Catat skor usability, hambatan alur, dan reaksi pengguna", estimatedHours: 240 },
      { title: "Dokumentasikan evidence dan kutipan verbatim penting", estimatedHours: 180 },
    ],
  });

  // 6. Analysis
  tasks.push({
    judul: `Analisis temuan 5 Dimensi Feedback & evaluasi metrik PSF`,
    deskripsi: `Tabulasikan feedback pada dimensi Usability, Functionality, Solvability, Payability, dan hitung skor metrik Desirability.`,
    acceptanceCriteria: `Tabel tabulasi 5 dimensi feedback terisi lengkap beserta analisis gap kriteria kesuksesan.`,
    sprint: cvSprintSpan === 1 ? 1 : 2,
    sp: 5,
    subtasks: [
      { title: "Kelompokkan temuan kualitatif ke dalam 5 dimensi feedback", estimatedHours: 180 },
      { title: "Hitung skor rata-rata kepuasan dan kemudahan penggunaan", estimatedHours: 180 },
      { title: "Identifikasi pain points prioritas yang memerlukan iterasi", estimatedHours: 180 },
    ],
  });

  // 7. Validation Report
  tasks.push({
    judul: `Susun Laporan Customer Validation & rekomendasi perbaikan MVP`,
    deskripsi: `Dokumentasikan kesimpulan Problem-Solution Fit, pembelajaran utama, dan daftar backlog perbaikan menuju tahap Market Validation.`,
    acceptanceCriteria: `Draft Laporan Customer Validation (Validation Report) selesai dan siap ditinjau bersama Promotor.`,
    sprint: cvSprintSpan === 1 ? 1 : 2,
    sp: 5,
    subtasks: [
      { title: "Rangkum kesimpulan ketercapaian Problem-Solution Fit", estimatedHours: 180 },
      { title: "Petakan fitur kunci yang terbukti memiliki nilai tambah tinggi", estimatedHours: 180 },
      { title: "Finalisasi laporan dan siapkan sesi presentasi review", estimatedHours: 120 },
    ],
  });

  return tasks.map((t) => ({
    judul: t.judul,
    deskripsi: t.deskripsi,
    acceptanceCriteria: t.acceptanceCriteria,
    suggestedSprintNumber: t.sprint,
    storyPoint: t.sp,
    subtasks: t.subtasks,
  }));
}

export async function generateAiBacklogFromCvPlan(params: {
  teamId: string;
  namaProyek: string;
  plan: CvPlanData;
  totalSprints?: number;
  grandFinalContext?: {
    validasi?: { ringkasan_validasi?: string; pembelajaran_validasi?: string } | null;
    fitur_utama?: string[] | string | null;
  } | null;
}): Promise<AiBacklogTask[]> {
  const { teamId, namaProyek, plan, totalSprints = 4, grandFinalContext } = params;
  const maxAllowedCvSpan = Math.max(1, totalSprints - 1);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`[AI CV Backlog] OpenAI API key not found, using curated fallback tasks for ${namaProyek}.`);
    return getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 25000 });

    const systemPrompt = `Anda adalah Scrum Master & Innovation Lead senior PT Pegadaian (Persero).
Tugas: Berdasarkan Dokumen Perencanaan Validasi Pelanggan (Customer Validation Plan) dan total kuota sprint tim (${totalSprints} sprint):

CATATAN REFERENSI GRAND FINAL:
Jika tersedia DATA VALIDASI & FITUR UTAMA GRAND FINAL, manfaatkan untuk membuat rumusan tugas pengujian dan prototype yang LEBIH SPESIFIK dan MENYASAR FITUR KUNCI tim tersebut. Jangan membuat task generik seolah tim mulai dari nol; fokuskan pada pengujian mendalam terhadap hipotesis yang diajukan di Grand Final.

LANGKAH 1 — Tentukan "cv_sprint_span" (estimasi jumlah sprint yang realistis dibutuhkan fase Customer Validation):
- Plafon maksimal: ${maxAllowedCvSpan} sprint (WAJIB menyisakan minimal 1 sprint untuk Market Validation).
- Pertimbangkan kompleksitas:
  * Jumlah target responden & sebaran lokasi/channel testing.
  * Kompleksitas prototype (lo-fi/wireframe vs hi-fi interactive prototype).
  * Kebutuhan kerjaan persiapan/pra-CV (koordinasi stakeholder, kesepakatan kemitraan/MoU, administrasi/compliance).
  * Proporsi CV relatif ke total sprint (CV idealnya fase awal yang fokus dan ringkas, mayoritas sprint untuk Market Validation).
- ATURAN ESTIMASI:
  * Jika proyek relatif sederhana, responden < 20, atau jika ragu: pilih 1 sprint.
  * Jika proyek cukup kompleks (responden banyak, multi-lokasi, prototype rumit, butuh persiapan lintas unit): pilih 2 sprint (selama plafon ${maxAllowedCvSpan} >= 2).
  * Default fallback kalau ragu-ragu: 1 sprint.

LANGKAH 2 — Hasilkan 5-8 kartu Backlog Task konkret untuk Customer Validation:
- CAKUPAN TUGAS DIPERLUAS:
  1. Tugas PERSIAPAN / PRA-CV (jika diindikasikan di rencana): koordinasi tim/lintas divisi, penjajakan kemitraan/MoU awal, persiapan administratif/tata kelola/compliance.
  2. Tugas PROTOTYPE & INSTRUMEN: persiapan/finalisasi prototype yang diuji, penyusunan panduan wawancara/skenario testing/lembar observasi.
  3. Tugas REKRUTMEN: screening dan penjadwalan responden early adopter.
  4. Tugas EKSEKUSI PENGUJIAN: pelaksanaan sesi user testing langsung dan pencatatan evidence 5 dimensi (Usability, Functionality, Solvability, Payability, Others).
  5. Tugas ANALISIS & KEPUTUSAN: tabulasi temuan, sintesis Problem-Solution Fit (PSF), dan penyusunan Validation Report.
- Seluruh tugas bertag dan berada di fase Customer Validation.

ATURAN STRUKTUR SETIAP TASK:
1. JUDUL: Dimulai KATA KERJA AKTIF imperatif (contoh: "Konsolidasikan...", "Siapkan...", "Susun...", "Rekrut...", "Lakukan...", "Sintesis...", "Analisis...").
2. DESKRIPSI: Instruksi operasional ringkas tanpa subjek "Tim".
3. ACCEPTANCE CRITERIA: Luaran selesai yang terukur dan konkret.
4. Story Point: Estimasikan durasi pengerjaan dalam MENIT yang realistis (misal 60, 120, 180, 240, 300, 480 menit), lalu konversikan ke story_point = menit ÷ 60 (1 SP = 60 menit).
5. suggestedSprintNumber: integer antara 1 sampai cv_sprint_span (TIDAK BOLEH lebih dari cv_sprint_span).
6. subtasks: 3 sampai 5 subtask konkret dengan estimatedHours (angka integer dalam skala MENIT antara 30 sampai 480 menit).

Output HARUS JSON murni tanpa markdown:
{
  "cv_sprint_span": 2,
  "rationale": "Alasan penentuan durasi sprint CV...",
  "tasks": [
    {
      "judul": "...",
      "deskripsi": "...",
      "acceptanceCriteria": "...",
      "storyPoint": 3,
      "suggestedSprintNumber": 1,
      "subtasks": [
        { "title": "...", "estimatedHours": 180 }
      ]
    }
  ]
}`;

    const grandFinalSnippetParts: string[] = [];
    if (grandFinalContext?.fitur_utama) {
      const fiturStr = Array.isArray(grandFinalContext.fitur_utama)
        ? grandFinalContext.fitur_utama.join(', ')
        : grandFinalContext.fitur_utama;
      if (fiturStr) grandFinalSnippetParts.push(`Fitur Utama Grand Final: ${fiturStr}`);
    }
    if (grandFinalContext?.validasi) {
      const val = grandFinalContext.validasi;
      if (val.ringkasan_validasi) grandFinalSnippetParts.push(`Validasi Sebelumnya: ${val.ringkasan_validasi}`);
      if (val.pembelajaran_validasi) grandFinalSnippetParts.push(`Pembelajaran: ${val.pembelajaran_validasi}`);
    }

    const planSummary = `
PROYEK: ${namaProyek}
TOTAL KUOTA SPRINT TIM: ${totalSprints} (Plafon Maks CV: ${maxAllowedCvSpan} sprint)
${grandFinalSnippetParts.length > 0 ? `\nKONTEKS GRAND FINAL (VALIDASI & FITUR):\n${grandFinalSnippetParts.join('\n')}\n` : ''}
PROJECT MISSION: ${plan.projectMission || '-'}
CUSTOMER & KONTEKS: ${plan.customerDanContext || '-'}
HIPOTESIS MASALAH: ${plan.problemHypothesis || '-'}
HOW MIGHT WE (HMW): ${plan.hmw || '-'}
HIPOTESIS SOLUSI: ${plan.solutionHypothesis || '-'}
TIPE PROTOTYPE: ${plan.prototypeType || '-'}
FITUR/ALUR DIUJI: ${plan.fiturAlurDiuji || '-'}
SKENARIO TESTING: ${plan.skenarioUserTesting || '-'}
INSTRUMEN VALIDASI: ${plan.instrumenValidasi || '-'}
TARGET EARLY ADOPTERS: ${plan.targetEarlyAdopters || '-'}
KRITERIA SELEKSI: ${plan.kriteriaSeleksi || '-'}
JUMLAH TARGET RESPONDEN: ${plan.jumlahTargetResponden || 10}
LOKASI/CHANNEL TESTING: ${plan.lokasiChannelTesting || '-'}
METODE REKRUTMEN: ${plan.metodeRekrutmen || '-'}
ETIKA DATA: ${plan.etikaPersetujuanData || '-'}
`;

    const userPrompt = `TENTUKAN cv_sprint_span DAN RANCANG 5-8 KARTU BACKLOG CUSTOMER VALIDATION BERDASARKAN DOKUMEN PERENCANAAN BERIKUT:
${planSummary}

Hasilkan JSON dengan key 'cv_sprint_span', 'rationale', dan 'tasks'.`;

    let modelName = 'gpt-5.4-mini';
    let responseText = '';

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
      console.warn(`[AI CV Backlog] Model ${modelName} failed (${modelErr.message}), falling back to gpt-4o-mini...`);
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

    if (!responseText) {
      return getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
    }

    const parsed = JSON.parse(responseText);
    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    if (rawTasks.length === 0) {
      return getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
    }

    // Determine and clamp cv_sprint_span
    let cvSprintSpan = typeof parsed.cv_sprint_span === 'number' ? Math.round(parsed.cv_sprint_span) : 1;
    if (isNaN(cvSprintSpan) || cvSprintSpan < 1) cvSprintSpan = 1;
    if (cvSprintSpan > maxAllowedCvSpan) cvSprintSpan = maxAllowedCvSpan;

    console.log(`[AI CV Backlog] Determined cv_sprint_span = ${cvSprintSpan} (Total Sprints: ${totalSprints}, Max Allowed: ${maxAllowedCvSpan}) for ${namaProyek}. Rationale: ${parsed.rationale || '-'}`);

    const validatedTasks: AiBacklogTask[] = [];
    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      if (t && typeof t.judul === 'string' && t.judul.trim().length > 0) {
        let sprintNum = typeof t.suggestedSprintNumber === 'number' ? Math.round(t.suggestedSprintNumber) : null;
        if (!sprintNum || sprintNum < 1 || sprintNum > cvSprintSpan) {
          sprintNum = (i % cvSprintSpan) + 1;
        }

        const sp = normalizeToFibonacci(t.storyPoint, estimateStoryPointHeuristic(t.judul, t.deskripsi, t.acceptanceCriteria));

        const subtasks: AiBacklogSubtask[] = [];
        if (Array.isArray(t.subtasks)) {
          for (const st of t.subtasks) {
            if (st && typeof st.title === 'string' && st.title.trim().length > 0) {
              let est = typeof st.estimatedHours === 'number' && st.estimatedHours > 0
                ? Math.round(st.estimatedHours)
                : Math.max(60, Math.round(sp * 60 * 0.3));
              if (est <= 16) {
                est = est * 60;
              }
              subtasks.push({
                title: st.title.trim(),
                estimatedHours: Math.min(1440, Math.max(15, est)),
              });
            }
          }
        }

        if (subtasks.length === 0) {
          subtasks.push(
            { title: `Persiapan dan koordinasi teknis: ${t.judul.trim().substring(0, 45)}`, estimatedHours: Math.max(60, Math.round(sp * 60 * 0.3)) },
            { title: `Eksekusi aktivitas pengujian dan pencatatan hasil`, estimatedHours: Math.max(120, Math.round(sp * 60 * 0.5)) },
            { title: `Analisis luaran dan dokumentasi bukti validasi`, estimatedHours: Math.max(60, Math.round(sp * 60 * 0.2)) }
          );
        }

        validatedTasks.push({
          judul: t.judul.trim(),
          deskripsi: typeof t.deskripsi === 'string' ? t.deskripsi.trim() : '',
          acceptanceCriteria: typeof t.acceptanceCriteria === 'string' ? t.acceptanceCriteria.trim() : '',
          suggestedSprintNumber: sprintNum,
          storyPoint: sp,
          subtasks,
        });
      }
    }

    return validatedTasks.length > 0
      ? validatedTasks
      : getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
  } catch (err: any) {
    console.error(`[AI CV Backlog] Failed to generate backlog for ${namaProyek}:`, err.message);
    return getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
  }
}
