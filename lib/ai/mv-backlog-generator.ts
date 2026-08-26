import OpenAI from 'openai';
import { AiBacklogTask, AiBacklogSubtask, normalizeToFibonacci } from './backlog-generator';

export interface MvPlanData {
  mvpVersion?: string | null;
  channelRelease?: string | null;
  periodeReleaseMulai?: string | null;
  periodeReleaseSelesai?: string | null;
  deskripsiMvp?: string | null;
  deskripsiProsesMvp?: string | null;
  fiturMvpDirilis?: string | null;
  targetEarlyAdopters?: string | null;
  lokasiPilot?: string | null;
  jumlahTargetPengguna?: number | null;
  daftarEarlyAdopters?: string | null;
  batasanScopeMvp?: string | null;
  mappingFitur?: Array<{
    fiturSolusi: string;
    fiturMvpStatus?: string;
    benefit?: string;
  }>;
  resources?: Array<{
    jenisResource: string;
    kebutuhanSpesifik: string;
    ownerSumber?: string;
  }>;
  metrik?: Array<{
    validasi: string;
    metrik: string;
    target?: string;
  }>;
}

export function getFallbackMvBacklogTasks(params: {
  namaProyek: string;
  plan: MvPlanData;
  totalSprints?: number;
}): AiBacklogTask[] {
  const { namaProyek, plan, totalSprints = 4 } = params;
  const version = plan.mvpVersion || "v1.0-pilot";
  const channel = plan.channelRelease || "Internal Web Pilot";
  const lokasi = plan.lokasiPilot || "Kantor Cabang Percontohan";
  const userCount = plan.jumlahTargetPengguna || 50;
  const targetSegment = plan.targetEarlyAdopters || "Early Adopters";
  const fiturDirilis = plan.fiturMvpDirilis || "Modul Utama MVP";

  const tasks: Array<{
    judul: string;
    deskripsi: string;
    acceptanceCriteria: string;
    sprint: number;
    sp: number;
    subtasks: Array<{ title: string; estimatedHours: number }>;
  }> = [
    {
      judul: `Konfigurasi lingkungan rilis ${version} pada channel ${channel}`,
      deskripsi: `Siapkan infrastruktur, kredensial akses, database pilot, dan verifikasi konektivitas channel ${channel} sebelum onboarding pengguna.`,
      acceptanceCriteria: `Environment ${channel} aktif, database siap, integrasi API terhubung tanpa error kritis.`,
      sprint: 1,
      sp: 5,
      subtasks: [
        { title: "Setup server / staging environment channel rilis", estimatedHours: 4 },
        { title: "Konfigurasi akun dan hak akses pengguna percontohan", estimatedHours: 3 },
        { title: "Lakukan pengujian akhir sanity check alur transaksi", estimatedHours: 3 },
      ],
    },
    {
      judul: `Finalisasi modul fitur MVP: ${fiturDirilis.slice(0, 50)}...`,
      deskripsi: `Selesaikan pengembangan dan pengujian fungsional fitur MVP yang dijadwalkan dirilis untuk memastikan keandalan alur operasional.`,
      acceptanceCriteria: `Fitur lulus User Acceptance Test (UAT) internal dan siap diakses pengguna di lokasi pilot.`,
      sprint: 1,
      sp: 8,
      subtasks: [
        { title: "Penyempurnaan antarmuka dan alur transaksi inti", estimatedHours: 6 },
        { title: "Eksekusi skenario uji coba fungsional internal", estimatedHours: 4 },
        { title: "Perbaikan bug minor hasil pengujian internal", estimatedHours: 4 },
      ],
    },
    {
      judul: `Koordinasi kesiapan sumber daya & sosialisasi tim operasional ${lokasi}`,
      deskripsi: `Lakukan briefing teknis kepada tim pendukung dan PIC ${lokasi} mengenai SOP operasional sementara dan eskalasi issue.`,
      acceptanceCriteria: `SOP sementara terdistribusi, staf lini depan memahami alur bantuan, dan kesiapan resource terverifikasi.`,
      sprint: Math.min(totalSprints, 2),
      sp: 3,
      subtasks: [
        { title: "Susun panduan operasional cepat dan daftar kontak darurat", estimatedHours: 3 },
        { title: "Briefing PIC operasional dan agen layanan di lokasi pilot", estimatedHours: 3 },
        { title: "Verifikasi kesiapan logistik dan data pendukung di lapangan", estimatedHours: 2 },
      ],
    },
    {
      judul: `Onboarding ${userCount} early adopters segmen ${targetSegment}`,
      deskripsi: `Aktivasi akun pengguna awal di ${lokasi}, dampingi proses login pertama, dan pastikan pemahaman penggunaan fitur.`,
      acceptanceCriteria: `Minimal ${Math.floor(userCount * 0.8)} pengguna teraktivasi dan berhasil melakukan interaksi pertama pada sistem.`,
      sprint: Math.min(totalSprints, 2),
      sp: 5,
      subtasks: [
        { title: "Kirimkan undangan akses dan panduan registrasi awal", estimatedHours: 3 },
        { title: "Monitoring aktivasi akun dan respons awal pengguna", estimatedHours: 4 },
        { title: "Fasilitasi bantuan langsung bagi pengguna yang terkendala", estimatedHours: 3 },
      ],
    },
    {
      judul: `Monitoring operasional pilot & logging data metrik DFV harian`,
      deskripsi: `Pantau stabilitas sistem, waktu respon, tingkat kegagalan, dan rekapitulasi transaksi harian untuk pembuktian DFV.`,
      acceptanceCriteria: `Dashboard analitik pilot terbarui harian dan log transaksi tercatat dengan evidence valid.`,
      sprint: Math.min(totalSprints, 3),
      sp: 8,
      subtasks: [
        { title: "Monitoring server uptime dan latency response time", estimatedHours: 4 },
        { title: "Tracking volume transaksi dan adopsi penggunaan berulang", estimatedHours: 4 },
        { title: "Identifikasi insiden/error dan tindak lanjut perbaikan cepat", estimatedHours: 4 },
      ],
    },
    {
      judul: `Sebarkan survey kepuasan CSAT & evaluasi NPS ke pengguna aktif`,
      deskripsi: `Kumpulkan umpan balik terstruktur mengenai tingkat kepuasan, kemudahan, dan kesediaan merekomendasikan solusi.`,
      acceptanceCriteria: `Data kuesioner terkumpul dari minimal 70% pengguna aktif dengan dokumentasi verbatim testimonial.`,
      sprint: Math.min(totalSprints, 3),
      sp: 3,
      subtasks: [
        { title: "Distribusi instrumen survey CSAT/NPS via in-app/chat", estimatedHours: 2 },
        { title: "Lakukan wawancara mendalam dengan 5 perwakilan pengguna", estimatedHours: 4 },
        { title: "Tabulasi dan analisis skor kepuasan serta rekomendasi", estimatedHours: 3 },
      ],
    },
    {
      judul: `Rekapitulasi pencapaian DFV & susun Laporan Market Validation`,
      deskripsi: `Hitung rata-rata ketercapaian DFV, rumuskan kesimpulan Product-Market Fit (PMF), dan siapkan rekomendasi keputusan Go/No-Go.`,
      acceptanceCriteria: `Laporan Market Validation selesai lengkap dengan skor DFV dan rekomendasi tindak lanjut implementasi.`,
      sprint: Math.min(totalSprints, 4),
      sp: 5,
      subtasks: [
        { title: "Kalkulasi rekapitulasi pencapaian 9 metrik DFV", estimatedHours: 3 },
        { title: "Rumuskan kajian kelayakan skala nasional dan proyeksi ROI", estimatedHours: 3 },
        { title: "Finalisasi lembar laporan dan periksa kelengkapan tanda tangan", estimatedHours: 3 },
      ],
    },
  ];

  return tasks.map((t) => ({
    judul: t.judul,
    deskripsi: t.deskripsi,
    acceptanceCriteria: t.acceptanceCriteria,
    suggestedSprintNumber: t.sprint,
    storyPoint: t.sp,
    subtasks: t.subtasks,
  }));
}

export async function generateAiBacklogFromMvPlan(params: {
  teamId: string;
  namaProyek: string;
  plan: MvPlanData;
  totalSprints?: number;
}): Promise<AiBacklogTask[]> {
  const { teamId, namaProyek, plan, totalSprints = 4 } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(`[AI MV Backlog] OpenAI API key not found, using curated fallback tasks for ${namaProyek}.`);
    return getFallbackMvBacklogTasks({ namaProyek, plan, totalSprints });
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 25000 });

    const systemPrompt = `Anda adalah Scrum Master & Innovation Lead senior PT Pegadaian (Persero).
Tugas: Berdasarkan Dokumen Perencanaan Rilis MVP (Market Validation Plan - Template 3.1), hasilkan 5-8 kartu Backlog Task konkret, operasional, dan terukur untuk tim inovator dalam merilis MVP, menguji pasar pilot, dan membuktikan Product-Market Fit (PMF).

ATURAN STRUKTUR SETIAP TASK:
1. JUDUL: Dimulai KATA KERJA AKTIF imperatif (contoh: "Setup...", "Kembangkan...", "Koordinasikan...", "Onboard...", "Pantau...", "Analisis...", "Susun...").
2. DESKRIPSI: Instruksi operasional ringkas dan jelas tanpa subjek "Tim".
3. ACCEPTANCE CRITERIA: Luaran selesai yang terukur, dapat diverifikasi, dan konkret.
4. Story Point: Estimasikan beban kerja (misal 3, 5, 8 story points).
5. suggestedSprintNumber: integer antara 1 sampai ${totalSprints} (terdistribusi wajar sepanjang masa pilot Market Validation).
6. subtasks: 3 sampai 4 subtask konkret dengan estimatedHours (integer 1-12).

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
        { "title": "...", "estimatedHours": 3 },
        { "title": "...", "estimatedHours": 4 }
      ]
    }
  ]
}`;

    const userPrompt = `PROYEK: ${namaProyek}
VERSI MVP: ${plan.mvpVersion || "v1.0-pilot"}
CHANNEL RELEASE: ${plan.channelRelease || "-"}
LOKASI PILOT: ${plan.lokasiPilot || "-"}
TARGET EARLY ADOPTERS: ${plan.targetEarlyAdopters || "-"} (${plan.jumlahTargetPengguna || 50} pengguna)
DESKRIPSI MVP: ${plan.deskripsiMvp || "-"}
DESKRIPSI PROSES: ${plan.deskripsiProsesMvp || "-"}
FITUR MVP DIRILIS: ${plan.fiturMvpDirilis || "-"}
MAPPING FITUR: ${JSON.stringify(plan.mappingFitur || [])}
RESOURCES NEEDED: ${JSON.stringify(plan.resources || [])}
METRIK DFV: ${JSON.stringify(plan.metrik || [])}
TOTAL SPRINT: ${totalSprints}

Hasilkan 5-8 kartu Backlog Task MV yang siap dieksekusi tim!`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return getFallbackMvBacklogTasks({ namaProyek, plan, totalSprints });
    }

    const parsed = JSON.parse(rawContent);
    const taskList = parsed.tasks || parsed.data || [];

    if (!Array.isArray(taskList) || taskList.length === 0) {
      return getFallbackMvBacklogTasks({ namaProyek, plan, totalSprints });
    }

    return taskList.map((t: any) => ({
      judul: String(t.judul || t.title || "Tugas Market Validation"),
      deskripsi: String(t.deskripsi || t.description || ""),
      acceptanceCriteria: String(t.acceptanceCriteria || t.acceptance_criteria || ""),
      suggestedSprintNumber: Number(t.suggestedSprintNumber || t.sprint || 1),
      storyPoint: Number(t.storyPoint || t.sp || 5),
      subtasks: Array.isArray(t.subtasks)
        ? t.subtasks.map((st: any) => ({
            title: String(st.title || st.judul || "Aktivitas subtask"),
            estimatedHours: Number(st.estimatedHours || st.hours || 3),
          }))
        : [],
    }));
  } catch (error) {
    console.error('[generateAiBacklogFromMvPlan] AI generation failed, falling back to curated tasks:', error);
    return getFallbackMvBacklogTasks({ namaProyek, plan, totalSprints });
  }
}
