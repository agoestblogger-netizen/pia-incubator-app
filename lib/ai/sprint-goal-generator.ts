import OpenAI from 'openai';

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

    const userPrompt = `SPRINT ${sprintNumber} BACKLOG:
${cardSummary}

Buat 1 kalimat Sprint Goal ringkas:`;

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
