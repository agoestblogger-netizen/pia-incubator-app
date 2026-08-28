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
}

export function getHeuristicCvPlanDraft(charterData: {
  projectMission?: string | null;
  customerEarlyAdopters?: string | null;
  contextAreaBantuan?: string | null;
  problemWorthSolving?: string | null;
  hmw?: string | null;
  desirabilityHypothesis?: string | null;
  feasibilityHypothesis?: string | null;
  viabilityHypothesis?: string | null;
  solusiAwal?: string | null;
  klasifikasiInovasi?: string | null;
}): FullCvPlanDraft {
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

  return {
    // Section A
    projectMission: (charterData.projectMission || "").trim(),
    customerDanContext,
    problemHypothesis: (charterData.problemWorthSolving || "").trim(),
    hmw: (charterData.hmw || "").trim(),
    solutionHypothesis,
    // Section B
    prototypeType: "Figma / Clickable Prototype",
    fiturAlurDiuji: "Alur utama penggunaan solusi: mulai dari onboarding/pengenalan, eksekusi proses utama, hingga konfirmasi hasil akhir.",
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
      { validasi: "Desirability", metrik: "Tingkat ketertarikan target pengguna awal untuk mencoba solusi", unitUkuran: "%", kriteriaKesuksesan: "> 70%", caraPengukuran: "Survei Minat", catatan: "" },
      { validasi: "Feasibility On Paper", metrik: "Kesesuaian solusi dengan arsitektur teknis atau regulasi yang ada", unitUkuran: "Ya/Tidak", kriteriaKesuksesan: "Ya", caraPengukuran: "Expert Review / Assessment Internal", catatan: "" },
      { validasi: "Viability On Paper", metrik: "Perkiraan rasio potensi keuntungan atau efisiensi biaya terhadap biaya operasional", unitUkuran: "ROI", kriteriaKesuksesan: "> 1", caraPengukuran: "Simulasi Finansial Sederhana", catatan: "" }
    ]
  };
}

export async function generateFullCvPlanDraft(charterData: {
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
}): Promise<FullCvPlanDraft> {
  const fallback = getHeuristicCvPlanDraft(charterData);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 20000 });

    const systemPrompt = `Anda adalah Innovation Coach dan Lead Product Researcher senior PT Pegadaian (Persero).
Tugas Anda adalah menyusun draf dokumen Perencanaan Customer Validation (Template Juklak 2.1) secara komprehensif, operasional, dan tajam berdasarkan Innovation Charter tim inovator.

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
    { "validasi": "Desirability", "metrik": "...", "unitUkuran": "...", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "" },
    { "validasi": "Feasibility On Paper", "metrik": "...", "unitUkuran": "...", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "" },
    { "validasi": "Viability On Paper", "metrik": "...", "unitUkuran": "...", "kriteriaKesuksesan": "...", "caraPengukuran": "...", "catatan": "" }
  ]
}

ATURAN PENTING:
1. Section A (projectMission, customerDanContext, problemHypothesis, hmw, solutionHypothesis): Gunakan dan rapikan langsung dari data Charter yang diberikan.
2. Section B (prototypeType, fiturAlurDiuji, skenarioUserTesting, instrumenValidasi): Susun metodologi testing yang konkret dan aplikatif sesuai tipe solusi.
3. Section C (targetEarlyAdopters, kriteriaSeleksi, jumlahTargetResponden, lokasiChannelTesting, metodeRekrutmen, etikaPersetujuanData): Spesifikasikan profil responden, kriteria inklusi/eksklusi, default jumlah 10-12 orang, etika informed consent.
4. Section D (dimensiRows): WAJIB berisi tepat 4 item array dengan dimensi persis: "Usability", "Functionality", "Solvability", "Payability". Sesuaikan fokus dan contoh pertanyaan dengan konteks inovasi ini.
5. Section E (metrikRows): WAJIB berisi tepat 3 item array dengan validasi persis: "Desirability", "Feasibility On Paper", "Viability On Paper". Sesuaikan metrik, unit, kriteria, dan cara pengukuran berdasarkan inovasi charter.
6. Gunakan bahasa Indonesia profesional dan standar perbankan / pegadaian.`;

    const userPrompt = `DATA INNOVATION CHARTER:
- Nama Proyek: ${charterData.namaProyekInovasi || "-"}
- Klasifikasi: ${charterData.klasifikasiInovasi || "BREAKTHROUGH"}
- Project Mission: ${charterData.projectMission || "-"}
- Customer / Early Adopter: ${charterData.customerEarlyAdopters || "-"}
- Konteks / Area Bantuan: ${charterData.contextAreaBantuan || "-"}
- Problem Worth Solving: ${charterData.problemWorthSolving || "-"}
- How Might We (HMW): ${charterData.hmw || "-"}
- Solusi Awal: ${charterData.solusiAwal || "-"}
- Desirability Hypothesis: ${charterData.desirabilityHypothesis || "-"}
- Feasibility Hypothesis: ${charterData.feasibilityHypothesis || "-"}
- Viability Hypothesis: ${charterData.viabilityHypothesis || "-"}

Hasilkan draf Perencanaan Customer Validation lengkap dalam JSON:`;

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
    };
  } catch (err: any) {
    console.warn("[generateFullCvPlanDraft] AI generation error, using fallback:", err.message);
    return fallback;
  }
}
