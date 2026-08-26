import OpenAI from 'openai';

// ─── From Backlog Cards ─────────────────────────────────────────────────────

export function getHeuristicSprintGoal(
  cards: Array<{ judul: string; tahap?: string | null; deskripsi?: string | null }>
): string {
  if (!cards || cards.length === 0) return "";

  const countCv = cards.filter((c) => c.tahap === "customer_validation").length;
  const countMv = cards.filter((c) => c.tahap === "market_validation").length;
  const countIs = cards.filter((c) => c.tahap === "innovation_setup").length;

  if (countCv >= countMv && countCv >= countIs) {
    const hasTesting = cards.some(
      (c) =>
        (c.judul || "").toLowerCase().includes("testing") ||
        (c.judul || "").toLowerCase().includes("uji") ||
        (c.judul || "").toLowerCase().includes("prototype")
    );
    const hasReport = cards.some(
      (c) =>
        (c.judul || "").toLowerCase().includes("laporan") ||
        (c.judul || "").toLowerCase().includes("analisis") ||
        (c.judul || "").toLowerCase().includes("keputusan")
    );
    if (hasTesting && hasReport) {
      return "Susun dan uji prototype, laksanakan user testing, dan selesaikan Laporan Customer Validation.";
    }
    if (hasTesting) {
      return "Siapkan prototype interaktif dan laksanakan pengujian pengguna bersama responden early adopter.";
    }
    return "Validasi Problem-Solution Fit melalui pengujian prototype dan wawancara bersama early adopter.";
  }

  if (countMv > countCv) {
    const isLateSprint = cards.some(
      (c) =>
        (c.judul || "").toLowerCase().includes("laporan") ||
        (c.judul || "").toLowerCase().includes("fmi") ||
        (c.judul || "").toLowerCase().includes("evaluasi") ||
        (c.judul || "").toLowerCase().includes("pitch")
    );
    if (isLateSprint) {
      return "Evaluasi metrik bisnis Product-Market Fit dan selesaikan Laporan Market Validation.";
    }
    return "Rilis MVP, laksanakan market testing, dan ukur traksi adopsi pengguna.";
  }

  return "Penyelarasan ruang masalah, perancangan arsitektur solusi, dan persiapan eksekusi backlog validasi.";
}

export async function generateAiSprintGoal(params: {
  sprintNumber: number;
  cards: Array<{ judul: string; deskripsi?: string | null; tahap?: string | null }>;
}): Promise<string> {
  const { sprintNumber, cards } = params;
  if (!cards || cards.length === 0) return "";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getHeuristicSprintGoal(cards);
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 15000 });
    const cardSummary = cards
      .map((c, i) => `${i + 1}. [${c.tahap || "umum"}] ${c.judul}`)
      .join("\n");

    const systemPrompt = `Anda adalah Scrum Master & Agile Coach senior PT Pegadaian (Persero).
Tugas: Buat 1 kalimat "Sprint Goal" ringkas, jelas, dan berorientasi pada hasil (outcome-driven) berdasarkan daftar backlog task yang dialokasikan pada Sprint ini.

ATURAN SPRINT GOAL:
1. HARUS 1 kalimat singkat (maksimal 20 kata).
2. Menggunakan bahasa Indonesia profesional.
3. Fokus pada sasaran utama sprint (misal: "Susun dan uji prototype, laksanakan user testing, dan selesaikan Laporan Customer Validation" atau "Rilis MVP dan ukur traksi adopsi pengguna").
4. Output HARUS teks 1 kalimat murni tanpa tanda petik dan tanpa markdown.`;

    const userPrompt = `SPRINT ${sprintNumber} BACKLOG:\n${cardSummary}\n\nBuat 1 kalimat Sprint Goal ringkas:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 80,
    });

    const goal = completion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
    return goal || getHeuristicSprintGoal(cards);
  } catch (err: any) {
    console.warn("[AI Sprint Goal] Fallback to heuristic:", err.message);
    return getHeuristicSprintGoal(cards);
  }
}

// ─── From CV Planning Form (fallback when no backlog) ───────────────────────

export interface CvPlanContext {
  projectMission?: string | null;
  customerDanContext?: string | null;
  problemHypothesis?: string | null;
  hmw?: string | null;
  solutionHypothesis?: string | null;
  prototypeType?: string | null;
  fiturAlurDiuji?: string | null;
  targetEarlyAdopters?: string | null;
}

/** Returns true if at least one key field in the CV plan is filled */
export function isCvPlanFilled(cvPlan: CvPlanContext): boolean {
  return !!(
    cvPlan.projectMission ||
    cvPlan.customerDanContext ||
    cvPlan.problemHypothesis ||
    cvPlan.hmw ||
    cvPlan.solutionHypothesis
  );
}

/**
 * Heuristic Sprint Goal from CV plan form (no-backlog scenario).
 * Uses sprint position relative to total sprints to give contextual guidance.
 */
export function getHeuristicSprintGoalFromCvPlan(
  cvPlan: CvPlanContext,
  sprintNumber: number,
  totalSprints: number
): string {
  const position =
    totalSprints <= 1
      ? "only"
      : sprintNumber === 1
      ? "first"
      : sprintNumber === totalSprints
      ? "last"
      : "middle";

  const prototype = cvPlan.prototypeType?.trim() || "";
  const solutionSnippet = cvPlan.solutionHypothesis?.split(/[.,]/)[0]?.trim() || "";

  if (position === "first" || position === "only") {
    if (cvPlan.problemHypothesis && cvPlan.customerDanContext) {
      return "Konfirmasi hipotesis masalah dan rekrut responden early adopter untuk customer interview awal.";
    }
    if (cvPlan.hmw) {
      return "Formulasikan How Might We, susun instrumen wawancara, dan mulai rekrutmen responden target.";
    }
    return "Persiapkan setup Customer Validation: susun instrumen, rekrut responden, dan jadwalkan sesi awal.";
  }

  if (position === "last") {
    return "Selesaikan semua sesi user testing, analisis temuan validasi, dan susun Laporan Customer Validation.";
  }

  // Middle sprint
  if (prototype) {
    return `Uji prototype (${prototype}) bersama responden dan kumpulkan data feedback terstruktur.`;
  }
  if (solutionSnippet) {
    return "Uji solusi bersama pengguna nyata, kumpulkan bukti validasi, dan iterasi berdasarkan temuan.";
  }
  return "Laksanakan sesi user testing, catat temuan lapangan, dan evaluasi Problem-Solution Fit.";
}

/**
 * AI-powered Sprint Goal from CV plan form (no-backlog scenario).
 * Falls back to heuristic if OPENAI_API_KEY is not set or on error.
 */
export async function generateAiSprintGoalFromCvPlan(params: {
  cvPlan: CvPlanContext;
  sprintNumber: number;
  totalSprints: number;
}): Promise<string> {
  const { cvPlan, sprintNumber, totalSprints } = params;

  const heuristic = getHeuristicSprintGoalFromCvPlan(cvPlan, sprintNumber, totalSprints);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return heuristic;

  try {
    const openai = new OpenAI({ apiKey, timeout: 15000 });

    const planContext = [
      cvPlan.projectMission && `Project Mission: ${cvPlan.projectMission}`,
      cvPlan.customerDanContext && `Customer & Context: ${cvPlan.customerDanContext}`,
      cvPlan.problemHypothesis && `Problem Hypothesis: ${cvPlan.problemHypothesis}`,
      cvPlan.hmw && `How Might We: ${cvPlan.hmw}`,
      cvPlan.solutionHypothesis && `Solution Hypothesis: ${cvPlan.solutionHypothesis}`,
      cvPlan.prototypeType && `Tipe Prototype: ${cvPlan.prototypeType}`,
      cvPlan.fiturAlurDiuji && `Fitur/Alur yang Diuji: ${cvPlan.fiturAlurDiuji}`,
      cvPlan.targetEarlyAdopters && `Target Early Adopters: ${cvPlan.targetEarlyAdopters}`,
    ]
      .filter(Boolean)
      .join("\n");

    const positionLabel =
      sprintNumber === 1
        ? "Sprint pertama (fase awal — setup dan rekrutmen responden)"
        : sprintNumber === totalSprints
        ? `Sprint terakhir (Sprint ${sprintNumber}/${totalSprints} — finalisasi dan laporan)`
        : `Sprint tengah (Sprint ${sprintNumber} dari ${totalSprints} — eksekusi pengujian utama)`;

    const systemPrompt = `Anda adalah Scrum Master & Agile Coach PT Pegadaian (Persero) yang memandu fase Customer Validation.
Tugas: Buat 1 kalimat Sprint Goal singkat, kontekstual, dan berorientasi pada hasil berdasarkan Form Perencanaan Customer Validation tim ini.

ATURAN:
1. Maksimal 20 kata, 1 kalimat.
2. Bahasa Indonesia profesional.
3. Sesuaikan dengan posisi sprint dalam siklus CV (awal/tengah/akhir).
4. Fokus pada LUARAN UTAMA sprint ini — bukan sekadar "buat rencana".
5. Output hanya teks 1 kalimat murni — tanpa tanda petik, tanpa markdown.`;

    const userPrompt = `POSISI SPRINT: ${positionLabel}

FORM PERENCANAAN CUSTOMER VALIDATION:
${planContext || "(belum terisi)"}

Buat 1 kalimat Sprint Goal yang relevan:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 80,
    });

    const goal = completion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
    return goal || heuristic;
  } catch (err: any) {
    console.warn("[AI Sprint Goal from CV Plan] Fallback to heuristic:", err.message);
    return heuristic;
  }
}
