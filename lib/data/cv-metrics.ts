export interface CvMetricRow {
  validasi: "Desirability" | "Feasibility" | "Viability";
  metrik: string;
  unit: string;
  kriteria: string;
  cara: string;
  catatan: string;
}

export const METRIK_ROWS: CvMetricRow[] = [
  {
    validasi: "Desirability",
    metrik: "Kepuasan Pengguna",
    unit: "Skala 1-5",
    kriteria: "Rata-rata ≥4 atau target lain yang disepakati",
    cara: "Survey pasca-testing dan alasan verbal di balik skor",
    catatan: "Diisi",
  },
  {
    validasi: "Desirability",
    metrik: "Ketertarikan Penggunaan Berulang",
    unit: "Sering sekali/Sering/Kadang/Jarang/Tidak pernah",
    kriteria: "Mayoritas minimal \"Sering\" atau target lain yang disepakati",
    cara: "Survey/wawancara",
    catatan: "Diisi",
  },
  {
    validasi: "Desirability",
    metrik: "Rekomendasi kepada Orang Lain",
    unit: "Ya pasti/Mungkin/Tidak yakin/Mungkin tidak/Pasti tidak",
    kriteria: "Mayoritas minimal \"Mungkin\"",
    cara: "Survey/wawancara",
    catatan: "Diisi",
  },
  {
    validasi: "Desirability",
    metrik: "Kejelasan dan Kemudahan Penggunaan",
    unit: "Skala 1-5 atau Mudah sekali s.d. Sangat sulit",
    kriteria: "Rata-rata ≥4 atau mayoritas \"Mudah\"",
    cara: "Observasi dan survey",
    catatan: "Diisi",
  },
  {
    validasi: "Desirability",
    metrik: "Kesediaan Membayar/Menggunakan",
    unit: "Skala kesediaan",
    kriteria: "Mayoritas bersedia membayar/menggunakan sesuai konteks inovasi",
    cara: "Survey harga/value atau komitmen penggunaan",
    catatan: "Diisi",
  },
  {
    validasi: "Feasibility",
    metrik: "Kelayakan teknis/operasional awal",
    unit: "Skala 1-5/catatan SME",
    kriteria: "Tidak ada blocker kritis sebelum MVP",
    cara: "Review awal IT/Operasional/SME",
    catatan: "Diisi bila relevan",
  },
  {
    validasi: "Viability",
    metrik: "Potensi dampak bisnis/ekonomi awal",
    unit: "Estimasi Rp/%/skala 1-5",
    kriteria: "Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP",
    cara: "Estimasi dampak, cost-benefit awal, input Renstra/Finance",
    catatan: "Diisi bila relevan",
  },
];
