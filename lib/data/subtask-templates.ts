/**
 * Kamus Subtask Baku untuk 14 Kartu Template Customer Validation (6) & Market Validation (8)
 * Berdasarkan tahapan resmi Petunjuk Pelaksanaan (Juklak) Inkubasi Inovasi PT Pegadaian
 */

export interface PredefinedSubtask {
  title: string;
  estimatedHours: number;
}

export const BAKU_SUBTASKS_DICTIONARY: Record<string, PredefinedSubtask[]> = {
  // ─── 6 TEMPLATE BAKU CUSTOMER VALIDATION ───
  "Siapkan prototype untuk testing": [
    { title: "Susun alur interaksi pengguna (user journey & wireframe)", estimatedHours: 240 },
    { title: "Kembangkan mockup/clickable prototype interaktif", estimatedHours: 480 },
    { title: "Uji mandiri prototype & siapkan skenario demonstrasi", estimatedHours: 240 },
  ],
  "Rekrut early adopters/responden": [
    { title: "Buat daftar calon responden (minimal 5-10 orang)", estimatedHours: 180 },
    { title: "Hubungi calon responden & kirimkan brief pengujian", estimatedHours: 180 },
    { title: "Jadwalkan sesi interview / usability testing", estimatedHours: 120 },
  ],
  "Lakukan sesi user testing": [
    { title: "Eksekusi sesi testing dengan responden batch 1", estimatedHours: 360 },
    { title: "Eksekusi sesi testing dengan responden batch 2", estimatedHours: 360 },
    { title: "Catat feedback verbatim 4 dimensi (Problem, Solution, Usability, Willingness)", estimatedHours: 240 },
  ],
  "Analisis hasil & isi Laporan Customer Validation": [
    { title: "Rekapitulasi skor kuantitatif 4 dimensi validasi", estimatedHours: 180 },
    { title: "Sintesis temuan kualitatif utama & pain points pengguna", estimatedHours: 180 },
    { title: "Isi lengkap form Laporan Customer Validation di sistem", estimatedHours: 180 },
  ],
  "Preliminary Review (SME) - CV": [
    { title: "Siapkan ringkasan temuan validasi untuk review SME", estimatedHours: 120 },
    { title: "Jalankan sesi review bersama SME & Coach Inovasi", estimatedHours: 120 },
    { title: "Dokumentasikan masukan, catatan, & rekomendasi SME", estimatedHours: 120 },
  ],
  "Tentukan keputusan Fit/Tidak Fit": [
    { title: "Evaluasi ketercapaian target metrik PSF", estimatedHours: 120 },
    { title: "Diskusikan keputusan fase (Fit / Iterasi / Pivot) bersama tim", estimatedHours: 120 },
    { title: "Finalisasi dan simpan status keputusan fase CV", estimatedHours: 60 },
  ],

  // ─── 7 TEMPLATE BAKU MARKET VALIDATION ───
  "MVP Planning": [
    { title: "Petakan spesifikasi fungsional fitur inti MVP", estimatedHours: 240 },
    { title: "Alokasikan kebutuhan sumber daya (teknologi, anggaran, tim)", estimatedHours: 180 },
    { title: "Susun timeline rilis MVP & jadwal monitoring pilot", estimatedHours: 180 },
  ],
  "MVP Development": [
    { title: "Kembangkan komponen antarmuka pengguna (Frontend MVP)", estimatedHours: 720 },
    { title: "Kembangkan backend, database, & integrasi modul MVP", estimatedHours: 840 },
    { title: "Lakukan quality assurance (QA) & pengujian performa sistem", estimatedHours: 360 },
  ],
  "MVP Release": [
    { title: "Setup environment produksi / staging pilot", estimatedHours: 240 },
    { title: "Luncurkan rilis resmi MVP ke segmen pengguna sasaran", estimatedHours: 240 },
    { title: "Distribusikan panduan penggunaan & buka kanal bantuan", estimatedHours: 180 },
  ],
  "Market Testing (ukur metrik DFV)": [
    { title: "Pantau metrik Desirability (adopsi, retensi, kepuasan pengguna)", estimatedHours: 300 },
    { title: "Pantau metrik Feasibility (keandalan sistem & operasional)", estimatedHours: 300 },
    { title: "Pantau metrik Viability (dampak finansial/non-finansial & unit economics)", estimatedHours: 300 },
  ],
  "Preliminary Review (SME) - MV": [
    { title: "Rekapitulasi data performa pasar MVP & analisis DFV", estimatedHours: 180 },
    { title: "Sesi konsultasi evaluasi strategi bersama SME & Coach", estimatedHours: 120 },
    { title: "Susun rencana penyempurnaan berdasarkan masukan SME", estimatedHours: 180 },
  ],
  "Analisis hasil & isi Laporan Market Validation": [
    { title: "Hitung skor akhir PMF dan capaian metrik pilot", estimatedHours: 180 },
    { title: "Rumuskan analisis kelayakan skala implementasi luas", estimatedHours: 180 },
    { title: "Isi dan submit Laporan Market Validation di sistem", estimatedHours: 180 },
  ],
  "Persiapan Forum Manajemen Inovasi": [
    { title: "Susun slide executive summary DFV untuk Dewan Direksi", estimatedHours: 240 },
    { title: "Siapkan data dukung finansial, operasional, & rekomendasi scale-up", estimatedHours: 180 },
    { title: "Simulasi presentasi dan finalisasi materi sidang FMI", estimatedHours: 180 },
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
