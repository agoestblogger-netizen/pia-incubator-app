/**
 * Kamus Subtask Baku untuk 15 Kartu Template Customer Validation (7) & Market Validation (8)
 * Berdasarkan tahapan resmi Petunjuk Pelaksanaan (Juklak) Inkubasi Inovasi PT Pegadaian
 */

export interface PredefinedSubtask {
  title: string;
  estimatedHours: number;
}

export const BAKU_SUBTASKS_DICTIONARY: Record<string, PredefinedSubtask[]> = {
  // ─── 7 TEMPLATE BAKU CUSTOMER VALIDATION ───
  "Susun Perencanaan Customer Validation": [
    { title: "Rumuskan hipotesis Problem-Solution Fit (PSF)", estimatedHours: 3 },
    { title: "Tentukan profil responden & kriteria early adopters", estimatedHours: 2 },
    { title: "Susun panduan wawancara & instrumen pengujian", estimatedHours: 3 },
    { title: "Tetapkan target metrik & kriteria kelulusan PSF", estimatedHours: 2 },
  ],
  "Siapkan prototype untuk testing": [
    { title: "Susun alur interaksi pengguna (user journey & wireframe)", estimatedHours: 4 },
    { title: "Kembangkan mockup/clickable prototype interaktif", estimatedHours: 8 },
    { title: "Uji mandiri prototype & siapkan skenario demonstrasi", estimatedHours: 4 },
  ],
  "Rekrut early adopters/responden": [
    { title: "Buat daftar calon responden (minimal 5-10 orang)", estimatedHours: 3 },
    { title: "Hubungi calon responden & kirimkan brief pengujian", estimatedHours: 3 },
    { title: "Jadwalkan sesi interview / usability testing", estimatedHours: 2 },
  ],
  "Lakukan sesi user testing": [
    { title: "Eksekusi sesi testing dengan responden batch 1", estimatedHours: 6 },
    { title: "Eksekusi sesi testing dengan responden batch 2", estimatedHours: 6 },
    { title: "Catat feedback verbatim 4 dimensi (Problem, Solution, Usability, Willingness)", estimatedHours: 4 },
  ],
  "Analisis hasil & isi Laporan Customer Validation": [
    { title: "Rekapitulasi skor kuantitatif 4 dimensi validasi", estimatedHours: 3 },
    { title: "Sintesis temuan kualitatif utama & pain points pengguna", estimatedHours: 3 },
    { title: "Isi lengkap form Laporan Customer Validation di sistem", estimatedHours: 3 },
  ],
  "Preliminary Review (SME) - CV": [
    { title: "Siapkan ringkasan temuan validasi untuk review SME", estimatedHours: 2 },
    { title: "Jalankan sesi review bersama SME & Coach Inovasi", estimatedHours: 2 },
    { title: "Dokumentasikan masukan, catatan, & rekomendasi SME", estimatedHours: 2 },
  ],
  "Tentukan keputusan Fit/Tidak Fit": [
    { title: "Evaluasi ketercapaian target metrik PSF", estimatedHours: 2 },
    { title: "Diskusikan keputusan fase (Fit / Iterasi / Pivot) bersama tim", estimatedHours: 2 },
    { title: "Finalisasi dan simpan status keputusan fase CV", estimatedHours: 1 },
  ],

  // ─── 8 TEMPLATE BAKU MARKET VALIDATION ───
  "Susun Perencanaan Market Validation": [
    { title: "Tentukan parameter ruang lingkup uji coba pasar (pilot project)", estimatedHours: 3 },
    { title: "Tetapkan metrik Product-Market Fit (PMF) & target konversi", estimatedHours: 3 },
    { title: "Rancang skema akuisisi pengguna pilot & saluran distribusi", estimatedHours: 3 },
  ],
  "MVP Planning": [
    { title: "Petakan spesifikasi fungsional fitur inti MVP", estimatedHours: 4 },
    { title: "Alokasikan kebutuhan sumber daya (teknologi, anggaran, tim)", estimatedHours: 3 },
    { title: "Susun timeline rilis MVP & jadwal monitoring pilot", estimatedHours: 3 },
  ],
  "MVP Development": [
    { title: "Kembangkan komponen antarmuka pengguna (Frontend MVP)", estimatedHours: 12 },
    { title: "Kembangkan backend, database, & integrasi modul MVP", estimatedHours: 14 },
    { title: "Lakukan quality assurance (QA) & pengujian performa sistem", estimatedHours: 6 },
  ],
  "MVP Release": [
    { title: "Setup environment produksi / staging pilot", estimatedHours: 4 },
    { title: "Luncurkan rilis resmi MVP ke segmen pengguna sasaran", estimatedHours: 4 },
    { title: "Distribusikan panduan penggunaan & buka kanal bantuan", estimatedHours: 3 },
  ],
  "Market Testing (ukur metrik DFV)": [
    { title: "Pantau metrik Desirability (adopsi, retensi, kepuasan pengguna)", estimatedHours: 5 },
    { title: "Pantau metrik Feasibility (keandalan sistem & operasional)", estimatedHours: 5 },
    { title: "Pantau metrik Viability (dampak finansial/non-finansial & unit economics)", estimatedHours: 5 },
  ],
  "Preliminary Review (SME) - MV": [
    { title: "Rekapitulasi data performa pasar MVP & analisis DFV", estimatedHours: 3 },
    { title: "Sesi konsultasi evaluasi strategi bersama SME & Coach", estimatedHours: 2 },
    { title: "Susun rencana penyempurnaan berdasarkan masukan SME", estimatedHours: 3 },
  ],
  "Analisis hasil & isi Laporan Market Validation": [
    { title: "Hitung skor akhir PMF dan capaian metrik pilot", estimatedHours: 3 },
    { title: "Rumuskan analisis kelayakan skala implementasi luas", estimatedHours: 3 },
    { title: "Isi dan submit Laporan Market Validation di sistem", estimatedHours: 3 },
  ],
  "Persiapan Forum Manajemen Inovasi": [
    { title: "Susun slide executive summary DFV untuk Dewan Direksi", estimatedHours: 4 },
    { title: "Siapkan data dukung finansial, operasional, & rekomendasi scale-up", estimatedHours: 3 },
    { title: "Simulasi presentasi dan finalisasi materi sidang FMI", estimatedHours: 3 },
  ],
};

/**
 * Helper untuk mendapatkan subtask baku berdasarkan judul kartu dan tahap
 */
export function getPredefinedSubtasks(judul: string, tahap?: string): PredefinedSubtask[] | null {
  const cleanJudul = judul.trim();

  // Khusus Preliminary Review (SME) yang ada di CV dan MV
  if (cleanJudul.toLowerCase().includes("preliminary review")) {
    if (tahap === "market_validation") {
      return BAKU_SUBTASKS_DICTIONARY["Preliminary Review (SME) - MV"];
    }
    return BAKU_SUBTASKS_DICTIONARY["Preliminary Review (SME) - CV"];
  }

  for (const [key, subtasks] of Object.entries(BAKU_SUBTASKS_DICTIONARY)) {
    if (cleanJudul.toLowerCase() === key.toLowerCase()) {
      return subtasks;
    }
  }

  return null;
}
