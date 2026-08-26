export type MvBakuCardType =
  | "mvp_release"
  | "market_testing"
  | "sme_mv"
  | "analisis_mv";

export function detectMvBakuCardType(judul: string, tahap?: string): MvBakuCardType | null {
  const norm = (judul || "").toLowerCase().trim();
  
  if (norm.includes("mvp release")) {
    return "mvp_release";
  }
  if (norm.includes("market testing") || norm.includes("ukur metrik dfv")) {
    return "market_testing";
  }
  if (
    norm.includes("preliminary review (sme) - mv") ||
    (norm.includes("preliminary review") && tahap === "market_validation") ||
    (norm.includes("preliminary review") && norm.includes("mv"))
  ) {
    return "sme_mv";
  }
  if (
    norm.includes("analisis hasil & isi laporan market validation") ||
    (norm.includes("analisis hasil & isi laporan") && tahap === "market_validation") ||
    (norm.includes("analisis hasil") && (tahap === "market_validation" || norm.includes("market validation")))
  ) {
    return "analisis_mv";
  }

  return null;
}
