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

function filterNulls(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const filtered = obj.map(filterNulls).filter((v) => v !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanVal = filterNulls(v);
      if (cleanVal !== undefined && cleanVal !== '' && cleanVal !== null) {
        res[k] = cleanVal;
      }
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }
  return obj;
}

export async function generateAiCharterFields(params: {
  teamId: string;
  proposalId: string;
  namaProyek: string;
  kategoriPia: string;
  rawProposalData: Record<string, any>;
  hasilGrandFinal?: Record<string, any> | null;
}): Promise<AiCharterGeneratedFields | null> {
  const { teamId, proposalId, namaProyek, kategoriPia, rawProposalData, hasilGrandFinal } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(`[AI Charter] OPENAI_API_KEY is not configured. Skipping AI generation for proposal ${proposalId}.`);
    return null;
  }

  console.log(`[AI Charter] 🚀 Starting AI-powered Charter generation for Team ID: ${teamId}, Proposal ID: ${proposalId} (${namaProyek})`);

  try {
    const openai = new OpenAI({ apiKey });

    const cleanGrandFinal = filterNulls(hasilGrandFinal || rawProposalData?.hasil_grand_final);
    const cleanRawProposal = filterNulls(rawProposalData);

    const systemPrompt = `Anda adalah AI Innovation Architect ahli metodologi Lean Startup dan Design Sprint di PT Pegadaian (Persero).
Tugas Anda adalah merumuskan Innovation Charter yang tajam, profesional, dan berbobot tinggi untuk tim inovasi PIA Season 12.

SUMBER DATA & TINGKAT PRIORITAS:
1. DATA MATERI GRAND FINAL (HASIL GRAND FINAL / PITCH DECK FINAL):
   Merupakan data kurasi TERAKHIR, PALING MATANG, dan RESMI yang disepakati bersama Dewan Penilai dan Sponsor pada Grand Final PIA Season 12.
   WAJIB DIPRIORITASKAN SEBAGAI SUMBER UTAMA untuk:
   - Section 1 (Problem & Customer Focus): Gunakan 'customer_context' (target_pengguna, context_chosen, customer_insight) dan 'problem' (pernyataan_masalah, bukti_masalah, kenapa_penting, relevansi_bisnis).
   - Section 2 (Solusi & Hipotesis DFV): Gunakan 'solution', 'fitur_utama', dan 'business_impact'.
   - Section 4 (Kebutuhan Dukungan): Gunakan 'support_needed'.
2. DATA PROPOSAL SUBMISI AWAL (FORM DETAIL / PROPOSAL AWAL):
   Merupakan draft awal inovasi. Gunakan sebagai FALLBACK apabila field tertentu pada Data Grand Final tidak tersedia atau kosong.

ATURAN KETAT & GUARDRAILS:
1. HANYA gunakan informasi yang ada di DATA SUMBER di bawah ini. JANGAN MENAMBAH atau MENGARANG fakta/angka/fitur yang tidak tercantum.
2. Formulasi harus dalam Bahasa Indonesia baku korporat yang profesional, jelas, dan lugas.
3. JANGAN PERNAH menyertakan teks literal "null" atau "undefined" di output Anda.
4. FORMAT HIPOTESIS DFV (Desirability, Feasibility, Viability):
   - Desirability Hypothesis: Rumuskan sebagai pernyataan hipotesis kebutuhan/nilai tambah pengguna berdasarkan customer_context & solution (contoh: "Kami meyakini bahwa [target pengguna] sangat membutuhkan [solusi] karena [manfaat utama]...").
   - Feasibility Hypothesis: Rumuskan sebagai pernyataan hipotesis kelayakan teknis/arsitektur/operasional berdasarkan fitur_utama & cara kerja (contoh: "Kami meyakini bahwa solusi ini dapat diwujudkan secara teknis dan operasional melalui [fitur utama & mekanisme integrasi]...").
   - Viability Hypothesis: Rumuskan sebagai pernyataan hipotesis kelayakan bisnis/keuangan berdasarkan business_impact & target finansial (contoh: "Kami meyakini bahwa inisiatif ini layak secara finansial dengan target [potensi revenue/efisiensi/OSL/transaksi]...").
5. Output HARUS dalam format JSON murni tanpa markdown wrapper.`;

    const userPrompt = `PROPOSAL METADATA:
- Proposal ID: ${proposalId}
- Nama Inovasi: ${namaProyek}
- Kategori PIA: ${kategoriPia}

${cleanGrandFinal ? `DATA MATERI RESMI GRAND FINAL (PRIORITAS UTAMA - VERSI PALING AKURAT):
${JSON.stringify(cleanGrandFinal, null, 2)}
` : ''}
DATA PROPOSAL AWAL (SUMBER CADANGAN / FALLBACK):
${JSON.stringify(cleanRawProposal, null, 2)}

Silakan hasilkan JSON dengan key berikut:
{
  "customerEarlyAdopters": "Segmen pengguna sasaran dan alasan kuat pemilihan segmen awal (prioritaskan customer_context Grand Final)",
  "problemWorthSolving": "Ringkasan permasalahan utama dan urgensi pentingnya diselesaikan (prioritaskan problem Grand Final)",
  "solusiAwal": "Deskripsi solusi inovasi awal dan cara penyelesaiannya (prioritaskan solution Grand Final)",
  "desirabilityHypothesis": "Pernyataan hipotesis Desirability berbasis customer_context & solution Grand Final",
  "feasibilityHypothesis": "Pernyataan hipotesis Feasibility berbasis fitur_utama Grand Final",
  "viabilityHypothesis": "Pernyataan hipotesis Viability berbasis business_impact & target capaian",
  "kebutuhanDukungan": "Rincian kebutuhan sumber daya (prioritaskan support_needed Grand Final)",
  "contextAreaBantuan": "Konteks inovasi dan relevansi area bisnis (prioritaskan context_chosen Grand Final)",
  "opportunityStatement": "Pernyataan peluang dan target non-finansial",
  "businessOpportunity": "Peluang bisnis dan proyeksi nilai ekonomi",
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
