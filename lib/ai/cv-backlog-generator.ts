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
  const proto = plan.prototypeType || "Clickable Prototype / Figma";
  const respondenCount = plan.jumlahTargetResponden || 10;
  const targetUser = plan.targetEarlyAdopters || "Early Adopters";

  const tasks: Array<{
    judul: string;
    deskripsi: string;
    acceptanceCriteria: string;
    sprint: number;
    sp: number;
    subtasks: Array<{ title: string; estimatedHours: number }>;
  }> = [
    {
      judul: `Siapkan dan finalisasi ${proto} untuk user testing`,
      deskripsi: `Pastikan seluruh alur utama (${plan.fiturAlurDiuji || "fitur kunci"}) siap diuji tanpa kendala teknis bersama responden.`,
      acceptanceCriteria: `Link prototype aktif, alur simulasi terverifikasi, dan materi demo siap digunakan untuk testing.`,
      sprint: 1,
      sp: 5,
      subtasks: [
        { title: "Review kelengkapan alur dan skenario prototype", estimatedHours: 4 },
        { title: "Lakukan internal dry-run testing alur solusi", estimatedHours: 3 },
        { title: "Perbaiki interaksi dan navigasi yang belum lancar", estimatedHours: 3 },
      ],
    },
    {
      judul: `Susun panduan wawancara, skenario testing, & lembar observasi`,
      deskripsi: `Rumuskan instrumen pengujian berbasis ${plan.instrumenValidasi || "kuesioner & wawancara semi-terstruktur"} dan skenario ${plan.skenarioUserTesting || "pengujian tugas"}.`,
      acceptanceCriteria: `Dokumen panduan fasilitator, daftar pertanyaan kunci, dan form pencatatan observasi tersedia.`,
      sprint: 1,
      sp: 3,
      subtasks: [
        { title: "Petakan task scenario yang akan dijalankan pengguna", estimatedHours: 3 },
        { title: "Susun pertanyaan evaluasi 5 dimensi feedback (Usability, Functionality, Solvability, Payability)", estimatedHours: 3 },
        { title: "Siapkan lembar informed consent dan etika data", estimatedHours: 2 },
      ],
    },
    {
      judul: `Rekrut dan jadwalkan ${respondenCount} responden ${targetUser}`,
      deskripsi: `Lakukan penyaringan calon responden sesuai kriteria (${plan.kriteriaSeleksi || "sesuai profil target"}) melalui channel ${plan.lokasiChannelTesting || "unit kerja / online"}.`,
      acceptanceCriteria: `${respondenCount} responden terkonfirmasi dengan jadwal sesi testing yang terorganisir.`,
      sprint: Math.min(totalSprints, 2),
      sp: 3,
      subtasks: [
        { title: "Sebarkan screening form ke target komunitas/unit kerja", estimatedHours: 3 },
        { title: "Kurasi kandidat sesuai kriteria seleksi early adopter", estimatedHours: 2 },
        { title: "Konfirmasi kesediaan waktu dan kirimkan jadwal sesi", estimatedHours: 2 },
      ],
    },
    {
      judul: `Eksekusi sesi Customer Testing dengan responden early adopter`,
      deskripsi: `Laksanakan pengujian langsung dengan pengguna, amati hambatan interaksi, dan catat respon verbal/non-verbal.`,
      acceptanceCriteria: `Seluruh sesi user testing terlaksana dengan catatan observasi, rekaman/transkrip, dan form consent lengkap.`,
      sprint: Math.min(totalSprints, 2),
      sp: 8,
      subtasks: [
        { title: "Fasilitasi sesi interaksi responden dengan prototype", estimatedHours: 6 },
        { title: "Catat skor usability, hambatan alur, dan reaksi pengguna", estimatedHours: 4 },
        { title: "Dokumentasikan evidence dan kutipan verbatim penting", estimatedHours: 3 },
      ],
    },
    {
      judul: `Analisis temuan 5 Dimensi Feedback & evaluasi metrik PSF`,
      deskripsi: `Tabulasikan feedback pada dimensi Usability, Functionality, Solvability, Payability, dan hitung skor metrik Desirability.`,
      acceptanceCriteria: `Tabel tabulasi 5 dimensi feedback terisi lengkap beserta analisis gap kriteria kesuksesan.`,
      sprint: Math.min(totalSprints, 3),
      sp: 5,
      subtasks: [
        { title: "Kelompokkan temuan kualitatif ke dalam 5 dimensi feedback", estimatedHours: 3 },
        { title: "Hitung skor rata-rata kepuasan dan kemudahan penggunaan", estimatedHours: 3 },
        { title: "Identifikasi pain points prioritas yang memerlukan iterasi", estimatedHours: 3 },
      ],
    },
    {
      judul: `Susun Laporan Customer Validation & rekomendasi perbaikan MVP`,
      deskripsi: `Dokumentasikan kesimpulan Problem-Solution Fit, pembelajaran utama, dan daftar backlog perbaikan menuju tahap Market Validation.`,
      acceptanceCriteria: `Draft Laporan Customer Validation (Validation Report) selesai dan siap ditinjau bersama Promotor.`,
      sprint: Math.min(totalSprints, 3),
      sp: 5,
      subtasks: [
        { title: "Rangkum kesimpulan ketercapaian Problem-Solution Fit", estimatedHours: 3 },
        { title: "Petakan fitur kunci yang terbukti memiliki nilai tambah tinggi", estimatedHours: 3 },
        { title: "Finalisasi laporan dan siapkan sesi presentasi review", estimatedHours: 2 },
      ],
    },
  ];

  return tasks.map((t, idx) => ({
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
}): Promise<AiBacklogTask[]> {
  const { teamId, namaProyek, plan, totalSprints = 4 } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`[AI CV Backlog] OpenAI API key not found, using curated fallback tasks for ${namaProyek}.`);
    return getFallbackCvBacklogTasks({ namaProyek, plan, totalSprints });
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 25000 });

    const systemPrompt = `Anda adalah Scrum Master & Innovation Lead senior PT Pegadaian (Persero).
Tugas: Berdasarkan Dokumen Perencanaan Validasi Pelanggan (Customer Validation Plan), hasilkan 5-8 kartu Backlog Task konkret dan terukur untuk tim inovator dalam menguji Problem-Solution Fit (PSF).

ATURAN STRUKTUR SETIAP TASK:
1. JUDUL: Dimulai KATA KERJA AKTIF imperatif (contoh: "Siapkan...", "Susun...", "Rekrut...", "Lakukan...", "Sintesis...", "Analisis...").
2. DESKRIPSI: Instruksi operasional ringkas tanpa subjek "Tim".
3. ACCEPTANCE CRITERIA: Luaran selesai yang terukur dan konkret.
4. Story Point: Bilangan Fibonacci [1, 2, 3, 5, 8, 13].
5. suggestedSprintNumber: integer antara 1 sampai ${totalSprints} (terdistribusi wajar pada fase Customer Validation, biasanya sprint 1-3).
6. subtasks: 3 sampai 5 subtask konkret dengan estimatedHours (integer 1-16).

Output HARUS JSON murni:
{
  "tasks": [
    {
      "judul": "...",
      "deskripsi": "...",
      "acceptanceCriteria": "...",
      "storyPoint": 5,
      "suggestedSprintNumber": 1,
      "subtasks": [
        { "title": "...", "estimatedHours": 3 }
      ]
    }
  ]
}`;

    const planSummary = `
PROYEK: ${namaProyek}
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

    const userPrompt = `RANCANG 5-8 KARTU BACKLOG CUSTOMER VALIDATION BERDASARKAN DOKUMEN PERENCANAAN BERIKUT:
${planSummary}

Hasilkan JSON dengan key 'tasks'.`;

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

    const validatedTasks: AiBacklogTask[] = [];
    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      if (t && typeof t.judul === 'string' && t.judul.trim().length > 0) {
        let sprintNum = typeof t.suggestedSprintNumber === 'number' ? Math.round(t.suggestedSprintNumber) : null;
        if (!sprintNum || sprintNum < 1 || sprintNum > totalSprints) {
          sprintNum = (i % Math.max(1, totalSprints - 1)) + 1;
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

        if (subtasks.length === 0) {
          subtasks.push(
            { title: `Persiapan dan koordinasi teknis: ${t.judul.trim().substring(0, 45)}`, estimatedHours: Math.max(2, Math.round(sp * 1.2)) },
            { title: `Eksekusi aktivitas pengujian dan pencatatan hasil`, estimatedHours: Math.max(3, Math.round(sp * 2.0)) },
            { title: `Analisis luaran dan dokumentasi bukti validasi`, estimatedHours: Math.max(2, Math.round(sp * 1.0)) }
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
