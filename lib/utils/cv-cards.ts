export type CvBakuCardType =
  | "prototype"
  | "responden"
  | "testing"
  | "analisis"
  | "sme"
  | "keputusan";

export function detectCvBakuCardType(judul: string, tahap?: string): CvBakuCardType | null {
  if (tahap === "market_validation") return null;
  const norm = (judul || "").toLowerCase().trim();
  if (norm.includes("market validation") || norm.includes("- mv")) return null;
  if (norm.includes("siapkan prototype untuk testing") || norm.includes("siapkan prototype")) {
    return "prototype";
  }
  if (
    norm.includes("rekrut early adopters/responden") ||
    norm.includes("rekrut early adopters") ||
    norm.includes("rekrut early adopter")
  ) {
    return "responden";
  }
  if (norm.includes("lakukan sesi user testing") || norm.includes("sesi user testing")) {
    return "testing";
  }
  if (
    norm.includes("analisis hasil & isi laporan customer validation") ||
    norm.includes("analisis hasil & isi laporan") ||
    norm.includes("analisis hasil")
  ) {
    return "analisis";
  }
  if (norm.includes("preliminary review (sme)") || norm.includes("preliminary review")) {
    return "sme";
  }
  if (
    norm.includes("tentukan keputusan fit/tidak fit") ||
    norm.includes("tentukan keputusan fit")
  ) {
    return "keputusan";
  }
  return null;
}
