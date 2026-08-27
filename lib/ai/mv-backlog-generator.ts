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

  const cvSprintSpan = Math.max(1, Math.min(2, Math.floor(totalSprints / 2)));
  const mvMinSprint = Math.min(totalSprints, cvSprintSpan + 1);
  const mvSprintSpan = Math.max(1, totalSprints - mvMinSprint + 1);

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
      sprint: mvMinSprint,
      sp: 5,
      subtasks: [
        { title: "Setup server / staging environment channel rilis", estimatedHours: 240 },
        { title: "Konfigurasi akun dan hak akses pengguna percontohan", estimatedHours: 180 },
        { title: "Lakukan pengujian akhir sanity check alur transaksi", estimatedHours: 180 },
      ],
    },
    {
      judul: `Finalisasi modul fitur MVP: ${fiturDirilis.slice(0, 50)}...`,
      deskripsi: `Selesaikan pengembangan dan pengujian fungsional fitur MVP yang dijadwalkan dirilis untuk memastikan keandalan alur operasional.`,
      acceptanceCriteria: `Fitur lulus User Acceptance Test (UAT) internal dan siap diakses pengguna di lokasi pilot.`,
      sprint: mvMinSprint,
      sp: 8,
      subtasks: [
        { title: "Penyempurnaan antarmuka dan alur transaksi inti", estimatedHours: 360 },
        { title: "Eksekusi skenario uji coba fungsional internal", estimatedHours: 240 },
        { title: "Perbaikan bug minor hasil pengujian internal", estimatedHours: 240 },
      ],
    },
    {
      judul: `Koordinasi kesiapan sumber daya & sosialisasi tim operasional ${lokasi}`,
      deskripsi: `Lakukan briefing teknis kepada tim pendukung dan PIC ${lokasi} mengenai SOP operasional sementara dan eskalasi issue.`,
      acceptanceCriteria: `SOP sementara terdistribusi, staf lini depan memahami alur bantuan, dan kesiapan resource terverifikasi.`,
      sprint: Math.min(totalSprints, mvMinSprint + (mvSprintSpan > 2 ? 1 : 0)),
      sp: 3,
      subtasks: [
        { title: "Susun panduan operasional cepat dan daftar kontak darurat", estimatedHours: 180 },
        { title: "Briefing PIC operasional dan agen layanan di lokasi pilot", estimatedHours: 180 },
        { title: "Verifikasi kesiapan logistik dan data pendukung di lapangan", estimatedHours: 120 },
      ],
    },
    {
      judul: `Onboarding ${userCount} early adopters segmen ${targetSegment}`,
      deskripsi: `Aktivasi akun pengguna awal di ${lokasi}, dampingi proses login pertama, dan pastikan pemahaman penggunaan fitur.`,
      acceptanceCriteria: `Minimal ${Math.floor(userCount * 0.8)} pengguna teraktivasi dan berhasil melakukan interaksi pertama pada sistem.`,
      sprint: Math.min(totalSprints, mvMinSprint + (mvSprintSpan > 2 ? 1 : 0)),
      sp: 5,
      subtasks: [
        { title: "Kirimkan undangan akses dan panduan registrasi awal", estimatedHours: 180 },
        { title: "Monitoring aktivasi akun dan respons awal pengguna", estimatedHours: 240 },
        { title: "Fasilitasi bantuan langsung bagi pengguna yang terkendala", estimatedHours: 180 },
      ],
    },
    {
      judul: `Monitoring operasional pilot & logging data metrik DFV harian`,
      deskripsi: `Pantau stabilitas sistem, waktu respon, tingkat kegagalan, dan rekapitulasi transaksi harian untuk pembuktian DFV.`,
      acceptanceCriteria: `Dashboard analitik pilot terbarui harian dan log transaksi tercatat dengan evidence valid.`,
      sprint: Math.min(totalSprints, mvMinSprint + Math.floor(mvSprintSpan / 2)),
      sp: 8,
      subtasks: [
        { title: "Monitoring server uptime dan latency response time", estimatedHours: 240 },
        { title: "Tracking volume transaksi dan adopsi penggunaan berulang", estimatedHours: 240 },
        { title: "Identifikasi insiden/error dan tindak lanjut perbaikan cepat", estimatedHours: 240 },
      ],
    },
    {
      judul: `Sebarkan survey kepuasan CSAT & evaluasi NPS ke pengguna aktif`,
      deskripsi: `Kumpulkan umpan balik terstruktur mengenai tingkat kepuasan, kemudahan, dan kesediaan merekomendasikan solusi.`,
      acceptanceCriteria: `Data kuesioner terkumpul dari minimal 70% pengguna aktif dengan dokumentasi verbatim testimonial.`,
      sprint: Math.min(totalSprints, Math.max(mvMinSprint, totalSprints - 1)),
      sp: 3,
      subtasks: [
        { title: "Distribusi instrumen survey CSAT/NPS via in-app/chat", estimatedHours: 120 },
        { title: "Lakukan wawancara mendalam dengan 5 perwakilan pengguna", estimatedHours: 240 },
        { title: "Tabulasi dan analisis skor kepuasan serta rekomendasi", estimatedHours: 180 },
      ],
    },
    {
      judul: `Rekapitulasi pencapaian DFV & susun Laporan Market Validation`,
      deskripsi: `Hitung rata-rata ketercapaian DFV, rumuskan kesimpulan Product-Market Fit (PMF), dan siapkan rekomendasi keputusan Go/No-Go.`,
      acceptanceCriteria: `Laporan Market Validation selesai lengkap dengan skor DFV dan rekomendasi tindak lanjut implementasi.`,
      sprint: totalSprints,
      sp: 5,
      subtasks: [
        { title: "Kalkulasi rekapitulasi pencapaian 9 metrik DFV", estimatedHours: 180 },
        { title: "Rumuskan kajian kelayakan skala nasional dan proyeksi ROI", estimatedHours: 180 },
        { title: "Finalisasi lembar laporan dan periksa kelengkapan tanda tangan", estimatedHours: 180 },
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

  const cvSprintSpan = Math.max(1, Math.min(2, Math.floor(totalSprints / 2)));
  const mvMinSprint = Math.min(totalSprints, cvSprintSpan + 1);
  const mvSprintSpan = Math.max(1, totalSprints - mvMinSprint + 1);

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
5. suggestedSprintNumber: integer antara ${mvMinSprint} sampai ${totalSprints} (terdistribusi secara proporsional sepanjang masa pilot Market Validation mulai Sprint ${mvMinSprint} hingga Sprint ${totalSprints}). JANGAN gunakan sprint sebelum Sprint ${mvMinSprint}.
6. subtasks: 3 sampai 4 subtask konkret dengan estimatedHours (angka integer dalam skala MENIT antara 30 sampai 480 menit, misalnya 60, 90, 120, 180, 240 menit).

Output HARUS JSON murni:
{
  "tasks": [
    {
      "judul": "...",
      "deskripsi": "...",
      "acceptanceCriteria": "...",
      "storyPoint": 5,
      "suggestedSprintNumber": ${mvMinSprint},
      "subtasks": [
        { "title": "...", "estimatedHours": 180 },
        { "title": "...", "estimatedHours": 240 }
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
TOTAL SPRINT: ${totalSprints} (MV Sprints: ${mvMinSprint}-${totalSprints})

Hasilkan 5-8 kartu Backlog Task MV yang terdistribusi antara Sprint ${mvMinSprint} sampai Sprint ${totalSprints}!`;

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

    return taskList.map((t: any, idx: number) => {
      let sprintNum = Number(t.suggestedSprintNumber || t.sprint || mvMinSprint);
      if (isNaN(sprintNum) || sprintNum < mvMinSprint || sprintNum > totalSprints) {
        sprintNum = mvMinSprint + (idx % mvSprintSpan);
      }

      return {
        judul: String(t.judul || t.title || "Tugas Market Validation"),
        deskripsi: String(t.deskripsi || t.description || ""),
        acceptanceCriteria: String(t.acceptanceCriteria || t.acceptance_criteria || ""),
        suggestedSprintNumber: sprintNum,
        storyPoint: Number(t.storyPoint || t.sp || 5),
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.map((st: any) => {
              let est = Number(st.estimatedHours || st.hours || 180);
              if (est <= 16) {
                est = est * 60;
              }
              return {
                title: String(st.title || st.judul || "Aktivitas subtask"),
                estimatedHours: Math.min(1440, Math.max(15, est)),
              };
            })
          : [],
      };
    });
  } catch (error) {
    console.error('[generateAiBacklogFromMvPlan] AI generation failed, falling back to curated tasks:', error);
    return getFallbackMvBacklogTasks({ namaProyek, plan, totalSprints });
  }
}
