/**
 * Kamus Subtask Baku untuk 14 Kartu Template Customer Validation (6) & Market Validation (8)
 * Berdasarkan tahapan resmi Petunjuk Pelaksanaan (Juklak) Inkubasi Inovasi PT Pegadaian
 */

export type SubtaskType = "regular" | "mandatory_simple" | "mandatory_complex";

export interface PredefinedSubtask {
  title: string;
  estimatedHours: number;
  subtaskType?: SubtaskType;
  reportFieldMapping?: Record<string, any>;
}

export const BAKU_SUBTASKS_DICTIONARY: Record<string, PredefinedSubtask[]> = {
  // ─── 6 TEMPLATE BAKU CUSTOMER VALIDATION ───
  "Siapkan prototype untuk testing": [
    {
      title: "Isi Link Prototype Solusi",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "prototype_link" },
    },
    { title: "Susun alur interaksi pengguna (user journey & wireframe)", estimatedHours: 240, subtaskType: "regular" },
    { title: "Kembangkan mockup/clickable prototype interaktif", estimatedHours: 480, subtaskType: "regular" },
    { title: "Uji mandiri prototype & siapkan skenario demonstrasi", estimatedHours: 240, subtaskType: "regular" },
  ],
  "Rekrut early adopters/responden": [
    {
      title: "Isi Jumlah & Profil Responden Aktual",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "responden_profil" },
    },
    { title: "Buat daftar calon responden (minimal 5-10 orang)", estimatedHours: 180, subtaskType: "regular" },
    { title: "Hubungi calon responden & kirimkan brief pengujian", estimatedHours: 180, subtaskType: "regular" },
    { title: "Jadwalkan sesi interview / usability testing", estimatedHours: 120, subtaskType: "regular" },
  ],
  "Lakukan sesi user testing": [
    {
      title: "Isi Mekanisme & Lokasi Testing",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "mekanisme_lokasi" },
    },
    {
      title: "Isi Feedback Matrix per Responden",
      estimatedHours: 180,
      subtaskType: "mandatory_complex",
      reportFieldMapping: { field: "feedback_matrix" },
    },
    { title: "Eksekusi sesi testing dengan responden batch 1", estimatedHours: 360, subtaskType: "regular" },
    { title: "Eksekusi sesi testing dengan responden batch 2", estimatedHours: 360, subtaskType: "regular" },
    { title: "Catat feedback verbatim 4 dimensi (Problem, Solution, Usability, Willingness)", estimatedHours: 240, subtaskType: "regular" },
  ],
  "Analisis hasil & isi Laporan Customer Validation": [
    {
      title: "Isi Validated Solution & Ketercapaian PSF",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "validated_solution_psf" },
    },
    {
      title: "Isi Kesimpulan & Pembelajaran",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "kesimpulan_pembelajaran" },
    },
    { title: "Rekapitulasi skor kuantitatif 4 dimensi validasi", estimatedHours: 180, subtaskType: "regular" },
    { title: "Sintesis temuan kualitatif utama & pain points pengguna", estimatedHours: 180, subtaskType: "regular" },
    { title: "Isi lengkap form Laporan Customer Validation di sistem", estimatedHours: 180, subtaskType: "regular" },
  ],
  "Preliminary Review (SME) - CV": [
    {
      title: "Isi Catatan Review & Upload Dokumen",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "preliminary_review" },
    },
    { title: "Siapkan ringkasan temuan validasi untuk review SME", estimatedHours: 120, subtaskType: "regular" },
    { title: "Jalankan sesi review bersama SME & Coach Inovasi", estimatedHours: 120, subtaskType: "regular" },
    { title: "Dokumentasikan masukan, catatan, & rekomendasi SME", estimatedHours: 120, subtaskType: "regular" },
  ],
  "Tentukan keputusan Fit/Tidak Fit": [
    {
      title: "Tentukan Keputusan Lanjut",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "keputusan_lanjut" },
    },
    { title: "Evaluasi ketercapaian target metrik PSF", estimatedHours: 120, subtaskType: "regular" },
    { title: "Diskusikan keputusan fase (Fit / Iterasi / Pivot) bersama tim", estimatedHours: 120, subtaskType: "regular" },
    { title: "Finalisasi dan simpan status keputusan fase CV", estimatedHours: 60, subtaskType: "regular" },
  ],

  // ─── 7 TEMPLATE BAKU MARKET VALIDATION ───
  "MVP Planning": [
    { title: "Petakan spesifikasi fungsional fitur inti MVP", estimatedHours: 240, subtaskType: "regular" },
    { title: "Alokasikan kebutuhan sumber daya (teknologi, anggaran, tim)", estimatedHours: 180, subtaskType: "regular" },
    { title: "Susun timeline rilis MVP & jadwal monitoring pilot", estimatedHours: 180, subtaskType: "regular" },
  ],
  "MVP Development": [
    { title: "Kembangkan komponen antarmuka pengguna (Frontend MVP)", estimatedHours: 720, subtaskType: "regular" },
    { title: "Kembangkan backend, database, & integrasi modul MVP", estimatedHours: 840, subtaskType: "regular" },
    { title: "Lakukan quality assurance (QA) & pengujian performa sistem", estimatedHours: 360, subtaskType: "regular" },
  ],
  "MVP Release": [
    {
      title: "Isi Data Rilis MVP",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "mvp_release_data" },
    },
    { title: "Setup environment produksi / staging pilot", estimatedHours: 240, subtaskType: "regular" },
    { title: "Luncurkan rilis resmi MVP ke segmen pengguna sasaran", estimatedHours: 240, subtaskType: "regular" },
    { title: "Distribusikan panduan penggunaan & buka kanal bantuan", estimatedHours: 180, subtaskType: "regular" },
  ],
  "Market Testing (ukur metrik DFV)": [
    {
      title: "Isi Hasil Pengukuran DFV & Traction",
      estimatedHours: 180,
      subtaskType: "mandatory_complex",
      reportFieldMapping: { field: "dfv_traction_measurement" },
    },
    { title: "Pantau metrik Desirability (adopsi, retensi, kepuasan pengguna)", estimatedHours: 300, subtaskType: "regular" },
    { title: "Pantau metrik Feasibility (keandalan sistem & operasional)", estimatedHours: 300, subtaskType: "regular" },
    { title: "Pantau metrik Viability (dampak finansial/non-finansial & unit economics)", estimatedHours: 300, subtaskType: "regular" },
  ],
  "Preliminary Review (SME) - MV": [
    {
      title: "Isi Catatan Review & Upload Dokumen",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "preliminary_review_mv" },
    },
    { title: "Rekapitulasi data performa pasar MVP & analisis DFV", estimatedHours: 180, subtaskType: "regular" },
    { title: "Sesi konsultasi evaluasi strategi bersama SME & Coach", estimatedHours: 120, subtaskType: "regular" },
    { title: "Susun rencana penyempurnaan berdasarkan masukan SME", estimatedHours: 180, subtaskType: "regular" },
  ],
  "Analisis hasil & isi Laporan Market Validation": [
    {
      title: "Isi Kesimpulan & Keputusan Go/No-Go",
      estimatedHours: 60,
      subtaskType: "mandatory_simple",
      reportFieldMapping: { field: "kesimpulan_keputusan_mv" },
    },
    { title: "Hitung skor akhir PMF dan capaian metrik pilot", estimatedHours: 180, subtaskType: "regular" },
    { title: "Rumuskan analisis kelayakan skala implementasi luas", estimatedHours: 180, subtaskType: "regular" },
    { title: "Isi dan submit Laporan Market Validation di sistem", estimatedHours: 180, subtaskType: "regular" },
  ],
  "Persiapan Forum Manajemen Inovasi": [
    { title: "Susun slide executive summary DFV untuk Dewan Direksi", estimatedHours: 240, subtaskType: "regular" },
    { title: "Siapkan data dukung finansial, operasional, & rekomendasi scale-up", estimatedHours: 180, subtaskType: "regular" },
    { title: "Simulasi presentasi dan finalisasi materi sidang FMI", estimatedHours: 180, subtaskType: "regular" },
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
