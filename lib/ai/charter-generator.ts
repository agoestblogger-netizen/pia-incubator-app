import OpenAI from 'openai';

export interface AiCharterGeneratedFields {
  customerEarlyAdopters: string;
  problemWorthSolving: string;
  solusiAwal: string;
  desirabilityHypothesis: string;
  feasibilityHypothesis: string;
  viabilityHypothesis: string;
  kebutuhanDukungan: string;
  contextAreaBantuan?: string;
  opportunityStatement?: string;
  businessOpportunity?: string;
  hmw?: string;
}

export async function generateAiCharterFields(params: {
  teamId: string;
  proposalId: string;
  namaProyek: string;
  kategoriPia: string;
  rawProposalData: Record<string, any>;
}): Promise<AiCharterGeneratedFields | null> {
  const { teamId, proposalId, namaProyek, kategoriPia, rawProposalData } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(`[AI Charter] OPENAI_API_KEY is not configured. Skipping AI generation for proposal ${proposalId}.`);
    return null;
  }

  console.log(`[AI Charter] 🚀 Starting AI-powered Charter generation for Team ID: ${teamId}, Proposal ID: ${proposalId} (${namaProyek})`);

  try {
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Anda adalah AI Innovation Architect ahli metodologi Lean Startup dan Design Sprint di PT Pegadaian (Persero).
Tugas Anda adalah merumuskan Innovation Charter yang tajam, profesional, dan berbobot tinggi berdasarkan data proposal resmi submisi PIA Season 12.

ATURAN KETAT & GUARDRAILS:
1. HANYA gunakan informasi yang ada di DATA SUMBER PROPOSAL di bawah ini. JANGAN MENAMBAH atau MENGARANG fakta/angka/fitur yang tidak tercantum.
2. Formulasi harus dalam Bahasa Indonesia baku korporat yang profesional, jelas, dan lugas.
3. FORMAT HIPOTESIS DFV (Desirability, Feasibility, Viability):
   - Desirability Hypothesis: Rumuskan sebagai pernyataan hipotesis kebutuhan/nilai tambah pengguna (contoh: "Kami meyakini bahwa [target pengguna] sangat membutuhkan [solusi] karena [manfaat utama]...").
   - Feasibility Hypothesis: Rumuskan sebagai pernyataan hipotesis kelayakan teknis/arsitektur/operasional (contoh: "Kami meyakini bahwa solusi ini dapat diwujudkan secara teknis dan operasional melalui [mekanisme teknis/arsitektur/integrasi sistem]...").
   - Viability Hypothesis: Rumuskan sebagai pernyataan hipotesis kelayakan bisnis/keuangan (contoh: "Kami meyakini bahwa inisiatif ini layak secara finansial dengan target [potensi revenue/efisiensi/OSL/transaksi]...").
4. Output HARUS dalam format JSON murni tanpa markdown wrapper.`;

    const userPrompt = `PROPOSAL METADATA:
- Proposal ID: ${proposalId}
- Nama Inovasi: ${namaProyek}
- Kategori PIA: ${kategoriPia}

DATA SUMBER PROPOSAL (RAW DATA MILIK PROPOSAL ${proposalId}):
${JSON.stringify(rawProposalData, null, 2)}

Silakan hasilkan JSON dengan key berikut:
{
  "customerEarlyAdopters": "Segmen pengguna sasaran dan alasan kuat pemilihan segmen awal",
  "problemWorthSolving": "Ringkasan permasalahan utama dan urgensi pentingnya diselesaikan",
  "solusiAwal": "Deskripsi solusi inovasi awal dan cara penyelesaiannya",
  "desirabilityHypothesis": "Pernyataan hipotesis Desirability",
  "feasibilityHypothesis": "Pernyataan hipotesis Feasibility",
  "viabilityHypothesis": "Pernyataan hipotesis Viability",
  "kebutuhanDukungan": "Rincian kebutuhan sumber daya (tim, infrastruktur, teknologi, tata kelola)",
  "contextAreaBantuan": "Konteks inovasi dan relevansi area bisnis",
  "opportunityStatement": "Pernyataan peluang dan target non-finansial",
  "businessOpportunity": "Peluang bisnis dan target capaian",
  "hmw": "Rumusan How Might We (Bagaimana kita dapat...)"
}`;

    // Prefer gpt-5.4-mini, fallback to gpt-4o-mini
    let modelName = 'gpt-5.4-mini';
    let responseText = '';

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (modelErr: any) {
      console.warn(`[AI Charter] Model ${modelName} failed (${modelErr.message}), falling back to gpt-4o-mini...`);
      modelName = 'gpt-4o-mini';
      const fallbackCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      responseText = fallbackCompletion.choices[0]?.message?.content || '';
    }

    if (!responseText) {
      console.warn(`[AI Charter] Empty response from OpenAI for proposal ${proposalId}`);
      return null;
    }

    const parsed = JSON.parse(responseText) as AiCharterGeneratedFields;
    console.log(`[AI Charter] ✅ Successfully generated Charter fields for Proposal ID: ${proposalId} using model: ${modelName}`);

    return {
      customerEarlyAdopters: parsed.customerEarlyAdopters || '',
      problemWorthSolving: parsed.problemWorthSolving || '',
      solusiAwal: parsed.solusiAwal || '',
      desirabilityHypothesis: parsed.desirabilityHypothesis || '',
      feasibilityHypothesis: parsed.feasibilityHypothesis || '',
      viabilityHypothesis: parsed.viabilityHypothesis || '',
      kebutuhanDukungan: parsed.kebutuhanDukungan || '',
      contextAreaBantuan: parsed.contextAreaBantuan || '',
      opportunityStatement: parsed.opportunityStatement || '',
      businessOpportunity: parsed.businessOpportunity || '',
      hmw: parsed.hmw || '',
    };
  } catch (err: any) {
    console.error(`[AI Charter] ❌ Error during AI generation for Proposal ID ${proposalId}:`, err.message);
    return null;
  }
}
