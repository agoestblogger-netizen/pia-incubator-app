import OpenAI from "openai";

export interface GeneratedSubtask {
  title: string;
  estimatedHours: number;
}

/**
 * Generate 3-5 dynamic subtasks for an AI Draft Roadmap card using OpenAI
 */
export async function generateDynamicSubtasksForCard(params: {
  cardTitle: string;
  cardDesc?: string | null;
  acceptanceCriteria?: string | null;
  storyPoint?: number | null;
}): Promise<GeneratedSubtask[]> {
  const { cardTitle, cardDesc, acceptanceCriteria, storyPoint } = params;
  const sp = storyPoint || 3;

  // Fallback generator in case OpenAI is unavailable
  const generateFallbackSubtasks = (): GeneratedSubtask[] => {
    return [
      {
        title: `Persiapan, riset kebutuhan, & koordinasi: ${cardTitle.substring(0, 45)}`,
        estimatedHours: Math.max(2, Math.round(sp * 1.2)),
      },
      {
        title: `Implementasi teknis & eksekusi aktivitas utama`,
        estimatedHours: Math.max(3, Math.round(sp * 2.0)),
      },
      {
        title: `Validasi, pengujian hasil, & dokumentasi luaran`,
        estimatedHours: Math.max(2, Math.round(sp * 1.0)),
      },
    ];
  };

  if (!process.env.OPENAI_API_KEY) {
    return generateFallbackSubtasks();
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const prompt = `Anda adalah Senior Scrum Master & Innovation Lead di PT Pegadaian.
Tugas Anda adalah memecah (breakdown) sebuah kartu Kanban Backlog Inovasi menjadi 3 sampai 5 subtask teknis/operasional konkret yang siap dieksekusi oleh tim.

INFORMASI KARTU INDUK:
- Judul: ${cardTitle}
- Deskripsi: ${cardDesc || "-"}
- Kriteria Penerimaan (DoD): ${acceptanceCriteria || "-"}
- Story Point: ${sp} SP

PANDUAN PEMBUATAN SUBTASK:
1. Buat 3 sampai 5 subtask yang jelas, berurutan secara logis (Persiapan -> Eksekusi -> Validasi/Dokumentasi).
2. Setiap subtask harus memiliki estimasi jam kerja yang realistis (angka integer antara 1 sampai 16 jam).
3. Gunakan Bahasa Indonesia profesional perbankan / inovasi korporat.

FORMAT KELUARAN (JSON ONLY):
{
  "subtasks": [
    {
      "title": "Nama subtask tindakan spesifik",
      "estimatedHours": 4
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "Anda adalah AI asisten perencana tugas agile. Hanya keluarkan format JSON valid tanpa teks pengantar atau markdown tambahan.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return generateFallbackSubtasks();
    }

    const parsed = JSON.parse(responseText);
    const rawSubtasks = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];

    const validated: GeneratedSubtask[] = [];
    for (const st of rawSubtasks) {
      if (st && typeof st.title === "string" && st.title.trim().length > 0) {
        const est = typeof st.estimatedHours === "number" && st.estimatedHours > 0
          ? Math.round(st.estimatedHours)
          : Math.max(2, Math.round(sp * 1.5));
        validated.push({
          title: st.title.trim(),
          estimatedHours: Math.min(24, Math.max(1, est)),
        });
      }
    }

    return validated.length > 0 ? validated : generateFallbackSubtasks();
  } catch (err: any) {
    console.warn(`[generateDynamicSubtasksForCard] OpenAI error:`, err.message);
    return generateFallbackSubtasks();
  }
}
