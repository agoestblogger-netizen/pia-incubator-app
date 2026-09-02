import OpenAI from 'openai';

export interface FullCvPlanDraft {
  // Section A
  projectMission: string;
  customerDanContext: string;
  problemHypothesis: string;
  hmw: string;
  solutionHypothesis: string;
  // Section B
  prototypeType: string;
  fiturAlurDiuji: string;
  skenarioUserTesting: string;
  instrumenValidasi: string;
  // Section C
  targetEarlyAdopters: string;
  kriteriaSeleksi: string;
  jumlahTargetResponden: number;
  lokasiChannelTesting: string;
  metodeRekrutmen: string;
  etikaPersetujuanData: string;
  // Section D
  dimensiRows?: Array<{
    dimensi: string;
    fokusValidasi: string;
    contohPertanyaan: string;
    evidenceYangDikumpulkan: string;
  }>;
  // Section E
  metrikRows?: Array<{
    validasi: string;
    metrik: string;
    unitUkuran: string;
    kriteriaKesuksesan: string;
    caraPengukuran: string;
    catatan: string;
  }>;
  // Grounding Validation Metadata
  groundingValidation?: {
    matchedFeatures: string[];
    missingFeatures: string[];
    isGrounded: boolean;
  };
}

export interface GenerateCvPlanContext {
  namaProyekInovasi?: string | null;
  klasifikasiInovasi?: string | null;
  projectMission?: string | null;
  customerEarlyAdopters?: string | null;
  contextAreaBantuan?: string | null;
  problemWorthSolving?: string | null;
  hmw?: string | null;
  desirabilityHypothesis?: string | null;
  feasibilityHypothesis?: string | null;
  viabilityHypothesis?: string | null;
  solusiAwal?: string | null;
  // Konteks penguatan grounding dari Grand Final / internal proposal
  fiturUtama?: string[] | string | null;
  businessImpact?: string | null;
  riskMitigation?: string | null;
  validationSummary?: string | null;
  customerContextDetail?: string | null;
}

export function getHeuristicCvPlanDraft(charterData: GenerateCvPlanContext): FullCvPlanDraft {
  const customer = (charterData.customerEarlyAdopters || "").trim();
  const context = (charterData.contextAreaBantuan || "").trim();
  let customerDanContext = "";
  if (customer && context) {
    customerDanContext = `${customer} dalam konteks ${context}`;
  } else {
    customerDanContext = customer || context || "Nasabah dan unit kerja operasional PT Pegadaian (Persero)";
  }

  const dfvParts = [
    charterData.desirabilityHypothesis?.trim(),
    charterData.feasibilityHypothesis?.trim(),
    charterData.viabilityHypothesis?.trim(),
  ].filter(Boolean);

  const solutionHypothesis = dfvParts.length > 0
    ? dfvParts.join(" | ")
    : (charterData.solusiAwal || "Solusi prototype dapat menyelesaikan kendala utama customer secara efektif.");

  const fiturText = Array.isArray(charterData.fiturUtama)
    ? `Pengujian fitur utama: ${charterData.fiturUtama.join(', ')}.`
    : (charterData.fiturUtama ? `Pengujian fitur utama: ${charterData.fiturUtama}` : "Alur utama penggunaan solusi: mulai dari onboarding/pengenalan, eksekusi proses utama, hingga konfirmasi hasil akhir.");

  return {
    // Section A
    projectMission: (charterData.projectMission || "").trim(),
    customerDanContext,
    problemHypothesis: (charterData.problemWorthSolving || "").trim(),
    hmw: (charterData.hmw || "").trim(),
    solutionHypothesis,
    // Section B
    prototypeType: "Interactive Prototype / Dashboard",
    fiturAlurDiuji: fiturText,
    skenarioUserTesting: "1. Pengguna membuka prototype dan mengeksplorasi navigasi.\n2. Pengguna menjalankan skenario penyelesaian masalah utama.\n3. Pengguna memberikan feedback terkait kemudahan, kejelasan, dan nilai manfaat.",
    instrumenValidasi: "Panduan wawancara mendalam (In-Depth Interview Guide), lembar observasi usability testing, dan kuesioner feedback 5 dimensi.",
    // Section C
    targetEarlyAdopters: customer || "Pengguna awal yang paling terdampak oleh masalah dan bersedia mencoba prototype.",
    kriteriaSeleksi: "Kriteria inklusi: Pengguna aktif dengan pengalaman relevan minimum 6 bulan. Kriteria eksklusi: Pengguna yang tidak terlibat langsung dalam alur operasional terkait.",
    jumlahTargetResponden: 10,
    lokasiChannelTesting: "Sesi wawancara tatap muka di unit kerja terkait dan online testing via Zoom / Google Meet.",
    metodeRekrutmen: "Undangan langsung kepada PIC unit kerja operasional dan pendekatan terarah kepada perwakilan early adopters.",
    etikaPersetujuanData: "Formulir persetujuan partisipasi (informed consent), penjaminan kerahasiaan identitas responden, dan kepatuhan terhadap regulasi perlindungan data internal.",
    dimensiRows: [
      { dimensi: "Usability", fokusValidasi: "Kemudahan dan kenyamanan penggunaan antarmuka solusi.", contohPertanyaan: "Apakah navigasi menu mudah dipahami tanpa panduan?", evidenceYangDikumpulkan: "" },
      { dimensi: "Functionality", fokusValidasi: "Keandalan dan keberhasilan fitur-fitur utama.", contohPertanyaan: "Apakah fitur utama berfungsi dengan baik dan tanpa error?", evidenceYangDikumpulkan: "" },
      { dimensi: "Solvability", fokusValidasi: "Efektivitas solusi dalam menyelesaikan masalah utama pengguna.", contohPertanyaan: "Sejauh mana solusi ini membantu menyelesaikan masalah Anda?", evidenceYangDikumpulkan: "" },
      { dimensi: "Payability", fokusValidasi: "Kesediaan pengguna untuk membayar atas nilai tambah yang diberikan.", contohPertanyaan: "Jika solusi ini berbayar, apakah Anda bersedia berlangganan?", evidenceYangDikumpulkan: "" }
    ],
    metrikRows: [
      { validasi: "Desirability", metrik: "Kepuasan Pengguna", unitUkuran: "Skala 1-5", kriteriaKesuksesan: "Rata-rata ≥ 4 atau target lain yang disepakati", caraPengukuran: "Survey pasca-testing dan alasan verbal di balik skor", catatan: "Diisi" },
      { validasi: "Desirability", metrik: "Ketertarikan Penggunaan Berulang", unitUkuran: "Sering sekali/Sering/Kadang/Jarang/Tidak pernah", kriteriaKesuksesan: 'Mayoritas minimal "Sering" atau target lain yang disepakati', caraPengukuran: "Survey / wawancara", catatan: "Diisi" },
      { validasi: "Desirability", metrik: "Rekomendasi kepada Orang Lain", unitUkuran: "Ya pasti/Mungkin/Tidak yakin/Mungkin tidak/Pasti tidak", kriteriaKesuksesan: 'Mayoritas minimal "Mungkin"', caraPengukuran: "Survey / wawancara", catatan: "Diisi" },
      { validasi: "Desirability", metrik: "Kejelasan dan Kemudahan Penggunaan", unitUkuran: "Skala 1-5 atau Mudah sekali s.d. Sangat sulit", kriteriaKesuksesan: 'Rata-rata ≥ 4 atau mayoritas "Mudah"', caraPengukuran: "Observasi dan survey", catatan: "Diisi" },
      { validasi: "Desirability", metrik: "Kesediaan Membayar/Menggunakan", unitUkuran: "Skala kesediaan", kriteriaKesuksesan: "Mayoritas bersedia membayar/menggunakan sesuai konteks inovasi", caraPengukuran: "Survey harga/value atau komitmen penggunaan", catatan: "Diisi" },
      { validasi: "Feasibility On Paper", metrik: "Kelayakan teknis/operasional awal", unitUkuran: "Skala 1-5 / catatan SME", kriteriaKesuksesan: "Tidak ada blocker kritis sebelum MVP", caraPengukuran: "Review awal IT/Operasional/SME", catatan: "Diisi bila relevan" },
      { validasi: "Viability On Paper", metrik: "Potensi dampak bisnis/ekonomi awal", unitUkuran: "Estimasi Rp/%/skala 1-5", kriteriaKesuksesan: "Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP", caraPengukuran: "Estimasi dampak, cost-benefit awal, input Renstra/Finance", catatan: "Diisi bila relevan" }
    ]
  };
}

export async function generateFullCvPlanDraft(charterData: GenerateCvPlanContext): Promise<FullCvPlanDraft> {
  const fallback = getHeuristicCvPlanDraft(charterData);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 20000 });

    const systemPrompt = `Anda adalah Innovation Coach dan Lead Product Researcher senior PT Pegadaian (Persero).
Tugas Anda adalah menyusun draf dokumen Perencanaan Customer Validation (Template Juklak 2.1) yang sangat operasional, tajam, dan 100% TERIKAT (GROUNDED) pada data proposal dan materi Grand Final tim inovator yang diberikan.

Output HARUS berupa JSON murni dengan format:
{
  "projectMission": "...",
  "customerDanContext": "...",
  "problemHypothesis": "...",
  "hmw": "...",
  "solutionHypothesis": "...",
  "prototypeType": "...",
  "fiturAlurDiuji": "...",
  "skenarioUserTesting": "...",
  "instrumenValidasi": "...",
  "targetEarlyAdopters": "...",
  "kriteriaSeleksi": "...",
  "jumlahTargetResponden": 10,
  "lokasiChannelTesting": "...",
  "metodeRekrutmen": "...",
  "etikaPersetujuanData": "...",
  "dimensiRows": [
    { "dimensi": "Usability", "fokusValidasi": "...", "contohPertanyaan": "...", "evidenceYangDikumpulkan": "" },
    { "dimensi": "Functionality", "fokusValidasi": "...", "contohPertanyaan": "...", "evidenceYangDikumpulkan": "" },
    { "dimensi": "Solvability", "fokusValidasi": "...", "contohPertanyaan": "...", "evidenceYangDikumpulkan": "" },
    { "dimensi": "Payability", "fokusValidasi": "...", "contohPertanyaan": "...", "evidenceYangDikumpulkan": "" }
  ],
  "metrikRows": [
    { "validasi": "Desirability", "metrik": "Kepuasan Pengguna", "unitUkuran": "Skala 1-5", "kriteriaKesuksesan": "Rata-rata ≥ 4...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Desirability", "metrik": "Ketertarikan Penggunaan Berulang", "unitUkuran": "Sering sekali/Sering/Kadang/Jarang/Tidak pernah", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Desirability", "metrik": "Rekomendasi kepada Orang Lain", "unitUkuran": "Ya pasti/Mungkin/Tidak yakin/Mungkin tidak/Pasti tidak", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Desirability", "metrik": "Kejelasan dan Kemudahan Penggunaan", "unitUkuran": "Skala 1-5 atau Mudah s.d. Sulit", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Desirability", "metrik": "Kesediaan Membayar/Menggunakan", "unitUkuran": "Skala kesediaan", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Feasibility On Paper", "metrik": "Kelayakan teknis/operasional awal", "unitUkuran": "Skala 1-5 / catatan SME", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." },
    { "validasi": "Viability On Paper", "metrik": "Potensi dampak bisnis/ekonomi awal", "unitUkuran": "Estimasi Rp/%/skala 1-5", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "..." }
  ]
}

PRINSIP GROUNDING & ANTI-HALUSINASI KETAT (WAJIB DIIKUTI):
1. Setiap elemen yang dihasilkan (metodologi prototype, skenario testing, kriteria responden, pertanyaan dimensi, metrik) HARUS merujuk dan konsisten dengan FITUR_UTAMA, CUSTOMER_CONTEXT, dan BUSINESS_IMPACT spesifik yang sudah diberikan. JANGAN membuat klaim, angka, atau detail teknis yang tidak berdasar dari konteks yang diberikan.
2. JANGAN MENGARANG detail spesifik industri atau statistik eksternal yang tidak ada dasarnya di data ini. Jika memerlukan skala ukur, gunakan kerangka umum yang netral (misal: "skala Likert 1-5", "wawancara mendalam / In-Depth Interview", "observasi tugas langsung"), BUKAN angka/klaim seolah-olah hasil riset empiris yang belum pernah dilakukan.
3. NAMA FITUR dan skenario testing yang disebutkan di Section B, D, dan E HARUS menggunakan istilah PERSIS dari FITUR_UTAMA yang sudah ada di data inovasi tim, BUKAN istilah baru atau nama modul fiktif yang tidak dikenali di proposal.

ATURAN DETAIL PER BAGIAN:
- Section A (projectMission, customerDanContext, problemHypothesis, hmw, solutionHypothesis): Gunakan dan rapikan langsung dari data Charter dan Grand Final yang diberikan tanpa mengubah substansi aslinya.
- Section B (prototypeType, fiturAlurDiuji, skenarioUserTesting, instrumenValidasi):
  * prototypeType: Tentukan tipe prototype yang realistis sesuai kategori inovasi (misal: Interactive Dashboard / AI Prototype, Clickable Figma Prototype, atau Dokumen SOP/Alur Layanan).
  * fiturAlurDiuji: WAJIB menyebutkan eksplisit nama-nama fitur dari FITUR_UTAMA yang akan diuji dalam siklus alur prototype.
  * skenarioUserTesting: Susun langkah pengujian bernomor (1, 2, 3...) yang memandu responden mencoba fitur-fitur utama tersebut secara runtut.
  * instrumenValidasi: Sebutkan instrumen konkret (In-Depth Interview Guide, Lembar Observasi Usability Testing, Kuesioner Feedback 4 Dimensi).
- Section C (targetEarlyAdopters, kriteriaSeleksi, jumlahTargetResponden, lokasiChannelTesting, metodeRekrutmen, etikaPersetujuanData):
  * targetEarlyAdopters: Ambil dari persona Customer / Early Adopters spesifik tim.
  * kriteriaSeleksi: Rumuskan kriteria inklusi dan eksklusi responden yang relevan dengan tugas pengguna terkait inovasi ini.
  * jumlahTargetResponden: Rentang 8-15 orang (standar riset kualitatif CV), default 10 orang.
  * lokasiChannelTesting & metodeRekrutmen: Sesuaikan dengan unit kerja atau kanal nasabah yang menjadi target inovasi.
  * etikaPersetujuanData: Tegaskan klausul informed consent dan kerahasiaan data operasional PT Pegadaian.
- Section D (dimensiRows):
  * WAJIB berisi tepat 4 baris dimensi: "Usability", "Functionality", "Solvability", "Payability".
  * Fokus validasi dan contoh pertanyaan wawancara HARUS secara spesifik menyebutkan nama fitur dari FITUR_UTAMA dan konteks masalah tim, BUKAN pertanyaan generik perangkat lunak!
  * Payability: Jika solusi internal Pegadaian, fokuskan pada "kesediaan unit kerja mengadopsi / mengalokasikan waktu & komitmen sumber daya". Jika untuk nasabah eksternal, fokuskan pada "kesediaan nasabah bertransaksi / membayar biaya layanan".
- Section E (metrikRows):
  * WAJIB berisi tepat 7 baris baku standar Juklak Lampiran V dengan urutan dan nama metrik PERSIS:
    1. "Kepuasan Pengguna" (Desirability)
    2. "Ketertarikan Penggunaan Berulang" (Desirability)
    3. "Rekomendasi kepada Orang Lain" (Desirability)
    4. "Kejelasan dan Kemudahan Penggunaan" (Desirability)
    5. "Kesediaan Membayar/Menggunakan" (Desirability)
    6. "Kelayakan teknis/operasional awal" (Feasibility On Paper)
    7. "Potensi dampak bisnis/ekonomi awal" (Viability On Paper)
  * JANGAN mengubah nama metrik atau validasi pada ke-7 baris ini. AI hanya merumuskan unitUkuran, kriteriaKesuksesan, caraPengukuran, dan catatan yang spesifik dan tajam sesuai target Business Impact dan solusi inovasi tim!
- Bahasa: Gunakan bahasa Indonesia baku dan istilah profesional korporat PT Pegadaian (Persero).`;

    const fiturList = Array.isArray(charterData.fiturUtama)
      ? charterData.fiturUtama.map((f, i) => `${i + 1}. ${f}`).join('\n')
      : (charterData.fiturUtama || "-");

    const userPrompt = `DATA INNOVATION CHARTER & MATERI GRAND FINAL:
- Nama Proyek: ${charterData.namaProyekInovasi || "-"}
- Klasifikasi: ${charterData.klasifikasiInovasi || "BREAKTHROUGH"}
- Project Mission: ${charterData.projectMission || "-"}
- Customer / Early Adopter: ${charterData.customerEarlyAdopters || "-"}
- Konteks / Area Bantuan: ${charterData.contextAreaBantuan || "-"}
- Detail Konteks Pelanggan: ${charterData.customerContextDetail || "-"}
- Problem Worth Solving: ${charterData.problemWorthSolving || "-"}
- How Might We (HMW): ${charterData.hmw || "-"}
- Solusi Resmi: ${charterData.solusiAwal || "-"}
- FITUR UTAMA SISTEM / ARSITEKTUR:
${fiturList}
- Desirability Hypothesis: ${charterData.desirabilityHypothesis || "-"}
- Feasibility Hypothesis: ${charterData.feasibilityHypothesis || "-"}
- Viability Hypothesis: ${charterData.viabilityHypothesis || "-"}
- Target Dampak Bisnis (Business Impact): ${charterData.businessImpact || "-"}
- Mitigasi Risiko Utama: ${charterData.riskMitigation || "-"}
- Hasil & Pembelajaran Validasi Sebelumnya: ${charterData.validationSummary || "-"}

Hasilkan draf Perencanaan Customer Validation lengkap dalam format JSON yang sangat terikat (grounded) pada data di atas:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    // ── Self-check validasi grounding pasca-generate ─────────────────────────
    const rawFeatures: string[] = Array.isArray(charterData.fiturUtama)
      ? charterData.fiturUtama
      : charterData.fiturUtama
      ? [charterData.fiturUtama]
      : [];

    const normalizedFeatureNames = rawFeatures.map((f) => {
      // Ambil nama fitur utama sebelum tanda "—" atau ":" atau "-"
      return f.split(/[—:\-]/)[0].trim().toLowerCase();
    }).filter((name) => name.length >= 3);

    const generatedText = `${parsed.fiturAlurDiuji || ''} ${parsed.skenarioUserTesting || ''} ${JSON.stringify(parsed.dimensiRows || [])}`.toLowerCase();

    const matchedFeatures: string[] = [];
    const missingFeatures: string[] = [];

    for (const feat of normalizedFeatureNames) {
      if (generatedText.includes(feat)) {
        matchedFeatures.push(feat);
      } else {
        missingFeatures.push(feat);
      }
    }

    if (normalizedFeatureNames.length > 0) {
      if (matchedFeatures.length > 0) {
        console.log(`[CV Plan Grounding Check] ✅ Grounded! Fitur cocok dalam rencana uji: "${matchedFeatures.join('", "')}"`);
      }
      if (missingFeatures.length > 0) {
        console.warn(`[CV Plan Grounding Check] ⚠️ Warning: Sebagian fitur utama belum disebutkan eksplisit di Section B/D: "${missingFeatures.join('", "')}"`);
      }
    }

    return {
      projectMission: parsed.projectMission || fallback.projectMission,
      customerDanContext: parsed.customerDanContext || fallback.customerDanContext,
      problemHypothesis: parsed.problemHypothesis || fallback.problemHypothesis,
      hmw: parsed.hmw || fallback.hmw,
      solutionHypothesis: parsed.solutionHypothesis || fallback.solutionHypothesis,
      prototypeType: parsed.prototypeType || fallback.prototypeType,
      fiturAlurDiuji: parsed.fiturAlurDiuji || fallback.fiturAlurDiuji,
      skenarioUserTesting: parsed.skenarioUserTesting || fallback.skenarioUserTesting,
      instrumenValidasi: parsed.instrumenValidasi || fallback.instrumenValidasi,
      targetEarlyAdopters: parsed.targetEarlyAdopters || fallback.targetEarlyAdopters,
      kriteriaSeleksi: parsed.kriteriaSeleksi || fallback.kriteriaSeleksi,
      jumlahTargetResponden: Number(parsed.jumlahTargetResponden) || 10,
      lokasiChannelTesting: parsed.lokasiChannelTesting || fallback.lokasiChannelTesting,
      metodeRekrutmen: parsed.metodeRekrutmen || fallback.metodeRekrutmen,
      etikaPersetujuanData: parsed.etikaPersetujuanData || fallback.etikaPersetujuanData,
      dimensiRows: parsed.dimensiRows || fallback.dimensiRows,
      metrikRows: parsed.metrikRows || fallback.metrikRows,
      groundingValidation: {
        matchedFeatures,
        missingFeatures,
        isGrounded: matchedFeatures.length > 0 || normalizedFeatureNames.length === 0,
      },
    };
  } catch (err: any) {
    console.warn("[generateFullCvPlanDraft] AI generation error, using fallback:", err.message);
    return fallback;
  }
}
