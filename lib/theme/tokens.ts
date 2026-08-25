/**
 * PIA Incubator Centralized Design Tokens
 * Consolidated color palettes, gradients, and phase styling across the entire app.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HEADER / BANNER GRADIENT (Pegadaian Deep Green 120deg)
// ═══════════════════════════════════════════════════════════════════════════════

export const PEGADAIAN_HEADER_GRADIENT_STYLE = {
  background: "linear-gradient(120deg, #8FCB9B 0%, #3E9463 50%, #0B3D2E 100%)",
};

export const PEGADAIAN_HEADER_CLASS =
  "bg-[linear-gradient(120deg,#8FCB9B_0%,#3E9463_50%,#0B3D2E_100%)] text-white shadow-md";

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 5-PHASE & CATEGORY SOLID TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhaseToken {
  id: string;
  name: string;
  shortName: string;
  solidGradient: string; // Tailwind class
  solidGradientCss: string; // Direct CSS gradient
  solidBgHex: string;
  solidHover: string;
  accentColor: string;
  textColor: string;
  // Pastel variants
  pastelBg: string;
  pastelBorder: string;
  pastelText: string;
  pastelHover: string;
  badgeClass: string;
}

export const PHASE_TOKENS: Record<string, PhaseToken> = {
  phase1: {
    id: "innovation_setup",
    name: "Innovation Setup",
    shortName: "Setup",
    solidGradient: "bg-gradient-to-br from-[#7B6EF0] to-[#5142D6]",
    solidGradientCss: "linear-gradient(135deg, #7B6EF0 0%, #5142D6 100%)",
    solidBgHex: "#5142D6",
    solidHover: "hover:from-[#6C5EE8] hover:to-[#4335C7]",
    accentColor: "#5142D6",
    textColor: "text-white",
    pastelBg: "bg-[#F5F3FF]",
    pastelBorder: "border-[#DDD6FE]",
    pastelText: "text-[#5142D6]",
    pastelHover: "hover:bg-[#EDE9FE]",
    badgeClass: "bg-[#5142D6]/10 text-[#5142D6] border-[#5142D6]/20",
  },
  phase2: {
    id: "customer_validation",
    name: "Customer Validation",
    shortName: "Cust Val",
    solidGradient: "bg-gradient-to-br from-[#E29A2E] to-[#B8720E]",
    solidGradientCss: "linear-gradient(135deg, #E29A2E 0%, #B8720E 100%)",
    solidBgHex: "#B8720E",
    solidHover: "hover:from-[#D48F24] hover:to-[#A36208]",
    accentColor: "#B8720E",
    textColor: "text-white",
    pastelBg: "bg-[#FFFBEB]",
    pastelBorder: "border-[#FDE68A]",
    pastelText: "text-[#B8720E]",
    pastelHover: "hover:bg-[#FEF3C7]",
    badgeClass: "bg-[#B8720E]/10 text-[#B8720E] border-[#B8720E]/20",
  },
  phase3: {
    id: "market_validation",
    name: "Market Validation",
    shortName: "Market Val",
    solidGradient: "bg-gradient-to-br from-[#22B06E] to-[#0E8C55]",
    solidGradientCss: "linear-gradient(135deg, #22B06E 0%, #0E8C55 100%)",
    solidBgHex: "#0E8C55",
    solidHover: "hover:from-[#1CA062] hover:to-[#0B7A49]",
    accentColor: "#0E8C55",
    textColor: "text-white",
    pastelBg: "bg-[#ECFDF5]",
    pastelBorder: "border-[#A7F3D0]",
    pastelText: "text-[#0E8C55]",
    pastelHover: "hover:bg-[#D1FAE5]",
    badgeClass: "bg-[#0E8C55]/10 text-[#0E8C55] border-[#0E8C55]/20",
  },
  phase4: {
    id: "keuangan",
    name: "RAB & LPJ",
    shortName: "Keuangan",
    solidGradient: "bg-gradient-to-br from-[#1F98A8] to-[#0E6E7A]",
    solidGradientCss: "linear-gradient(135deg, #1F98A8 0%, #0E6E7A 100%)",
    solidBgHex: "#0E6E7A",
    solidHover: "hover:from-[#198998] hover:to-[#0B5C66]",
    accentColor: "#0E6E7A",
    textColor: "text-white",
    pastelBg: "bg-[#F0FDFA]",
    pastelBorder: "border-[#99F6E4]",
    pastelText: "text-[#0E6E7A]",
    pastelHover: "hover:bg-[#CCFBF1]",
    badgeClass: "bg-[#0E6E7A]/10 text-[#0E6E7A] border-[#0E6E7A]/20",
  },
  phase5: {
    id: "governance",
    name: "FMI & Hasil",
    shortName: "Governance",
    solidGradient: "bg-gradient-to-br from-[#DB4E80] to-[#B23262]",
    solidGradientCss: "linear-gradient(135deg, #DB4E80 0%, #B23262 100%)",
    solidBgHex: "#B23262",
    solidHover: "hover:from-[#CE3E71] hover:to-[#9E2753]",
    accentColor: "#B23262",
    textColor: "text-white",
    pastelBg: "bg-[#FFF1F2]",
    pastelBorder: "border-[#FECDD3]",
    pastelText: "text-[#B23262]",
    pastelHover: "hover:bg-[#FFE4E6]",
    badgeClass: "bg-[#B23262]/10 text-[#B23262] border-[#B23262]/20",
  },
};

export function getPhaseTokenBySlug(stageSlug?: string | null): PhaseToken {
  if (!stageSlug) return PHASE_TOKENS.phase1;
  const slug = stageSlug.toLowerCase().trim();
  if (slug.includes("setup") || slug.includes("phase1") || slug.includes("tahap 1") || slug.includes("charter")) {
    return PHASE_TOKENS.phase1;
  }
  if (slug.includes("customer") || slug.includes("cust") || slug.includes("phase2") || slug.includes("tahap 2")) {
    return PHASE_TOKENS.phase2;
  }
  if (slug.includes("market") || slug.includes("phase3") || slug.includes("tahap 3")) {
    return PHASE_TOKENS.phase3;
  }
  if (slug.includes("keuangan") || slug.includes("rab") || slug.includes("lpj") || slug.includes("phase4") || slug.includes("tahap 4")) {
    return PHASE_TOKENS.phase4;
  }
  if (slug.includes("governance") || slug.includes("fmi") || slug.includes("hasil") || slug.includes("phase5") || slug.includes("tahap 5")) {
    return PHASE_TOKENS.phase5;
  }
  return PHASE_TOKENS.phase1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ALTERNATING PASTEL CARDS (For Kanban Backlog & Lists)
// ═══════════════════════════════════════════════════════════════════════════════

export const PASTEL_CARD_VARIANTS = [
  {
    bg: "bg-[#F3F0FF]",
    border: "border-[#DDD6FE]",
    hexBg: "#F3F0FF",
    hexBorder: "#DDD6FE",
    hover: "hover:border-[#7B6EF0] hover:shadow-indigo-100",
    accent: "#5142D6",
    badge: "bg-[#5142D6]/15 text-[#5142D6] border border-[#5142D6]/30",
  },
  {
    bg: "bg-[#FEF3C7]",
    border: "border-[#FDE68A]",
    hexBg: "#FEF3C7",
    hexBorder: "#FDE68A",
    hover: "hover:border-[#E29A2E] hover:shadow-amber-100",
    accent: "#B8720E",
    badge: "bg-[#B8720E]/15 text-[#B8720E] border border-[#B8720E]/30",
  },
  {
    bg: "bg-[#D1FAE5]",
    border: "border-[#A7F3D0]",
    hexBg: "#D1FAE5",
    hexBorder: "#A7F3D0",
    hover: "hover:border-[#22B06E] hover:shadow-emerald-100",
    accent: "#0E8C55",
    badge: "bg-[#0E8C55]/15 text-[#0E8C55] border border-[#0E8C55]/30",
  },
  {
    bg: "bg-[#CCFBF1]",
    border: "border-[#99F6E4]",
    hexBg: "#CCFBF1",
    hexBorder: "#99F6E4",
    hover: "hover:border-[#1F98A8] hover:shadow-teal-100",
    accent: "#0E6E7A",
    badge: "bg-[#0E6E7A]/15 text-[#0E6E7A] border border-[#0E6E7A]/30",
  },
  {
    bg: "bg-[#FFE4E6]",
    border: "border-[#FECDD3]",
    hexBg: "#FFE4E6",
    hexBorder: "#FECDD3",
    hover: "hover:border-[#DB4E80] hover:shadow-rose-100",
    accent: "#B23262",
    badge: "bg-[#B23262]/15 text-[#B23262] border border-[#B23262]/30",
  },
];

export function getPastelCardVariant(index: number) {
  return PASTEL_CARD_VARIANTS[Math.abs(index) % PASTEL_CARD_VARIANTS.length];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. KANBAN COLUMN PILL TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const KANBAN_COLUMN_PILL_STYLES: Record<
  string,
  { pillBg: string; hex: string; text: string; dot: string; countBg: string }
> = {
  Backlog: {
    pillBg: "bg-[#5142D6]",
    hex: "#5142D6",
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  },
  "To Do": {
    pillBg: "bg-[#9B9BB0]",
    hex: "#9B9BB0",
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  },
  "In Progress": {
    pillBg: "bg-[#B8720E]",
    hex: "#B8720E",
    text: "text-white",
    dot: "bg-white animate-pulse",
    countBg: "bg-white/20 text-white",
  },
  Review: {
    pillBg: "bg-[#0E6E7A]",
    hex: "#0E6E7A",
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  },
  Done: {
    pillBg: "bg-[#0E8C55]",
    hex: "#0E8C55",
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  },
  Blocked: {
    pillBg: "bg-[#B23262]",
    hex: "#B23262",
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  },
};

export function getColumnPillStyle(columnName: string, columnIndex: number = 0) {
  const normalized = columnName.trim();
  for (const [key, val] of Object.entries(KANBAN_COLUMN_PILL_STYLES)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return val;
    }
  }

  // Default based on index
  const keys = Object.keys(PHASE_TOKENS);
  const phase = PHASE_TOKENS[keys[columnIndex % keys.length]];
  return {
    pillBg: phase.solidBgHex,
    hex: phase.solidBgHex,
    text: "text-white",
    dot: "bg-white",
    countBg: "bg-white/20 text-white",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RBAC ROLE BADGES TOKENS (9 Roles)
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_BADGE_TOKENS: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  sponsor: {
    label: "Sponsor",
    bg: "bg-[#5142D6]/10",
    text: "text-[#5142D6]",
    border: "border-[#5142D6]/20",
    dot: "bg-[#5142D6]",
  },
  promotor: {
    label: "Promotor",
    bg: "bg-[#7B6EF0]/10",
    text: "text-[#7B6EF0]",
    border: "border-[#7B6EF0]/20",
    dot: "bg-[#7B6EF0]",
  },
  project_owner: {
    label: "Project Owner",
    bg: "bg-[#B8720E]/10",
    text: "text-[#B8720E]",
    border: "border-[#B8720E]/20",
    dot: "bg-[#B8720E]",
  },
  inisiator: {
    label: "Inovator",
    bg: "bg-[#0E8C55]/10",
    text: "text-[#0E8C55]",
    border: "border-[#0E8C55]/20",
    dot: "bg-[#0E8C55]",
  },
  co_creator: {
    label: "Co-creator",
    bg: "bg-[#0E6E7A]/10",
    text: "text-[#0E6E7A]",
    border: "border-[#0E6E7A]/20",
    dot: "bg-[#0E6E7A]",
  },
  coach: {
    label: "Coach",
    bg: "bg-[#B23262]/10",
    text: "text-[#B23262]",
    border: "border-[#B23262]/20",
    dot: "bg-[#B23262]",
  },
  sme: {
    label: "Subject Matter Expert (SME)",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  admin_ic: {
    label: "Admin Innovation Center",
    bg: "bg-[#0F5132]/10",
    text: "text-[#0F5132]",
    border: "border-[#0F5132]/25",
    dot: "bg-[#0F5132]",
  },
  pengelola_divisi: {
    label: "Pengelola Divisi IC",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
};

export function getRoleBadgeToken(roleCode: string) {
  return (
    ROLE_BADGE_TOKENS[roleCode] || {
      label: roleCode,
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      dot: "bg-gray-500",
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CATEGORY BADGES TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const CATEGORY_BADGE_TOKENS: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  BI: {
    label: "Breakthrough Innovation",
    bg: "bg-[#5142D6]/10",
    text: "text-[#5142D6]",
    border: "border-[#5142D6]/20",
  },
  BC: {
    label: "Business Challenge",
    bg: "bg-[#0E6E7A]/10",
    text: "text-[#0E6E7A]",
    border: "border-[#0E6E7A]/20",
  },
  WILAYAH: {
    label: "Inovasi Wilayah",
    bg: "bg-[#B8720E]/10",
    text: "text-[#B8720E]",
    border: "border-[#B8720E]/20",
  },
  PUSAT: {
    label: "Inovasi Kantor Pusat",
    bg: "bg-[#0E8C55]/10",
    text: "text-[#0E8C55]",
    border: "border-[#0E8C55]/20",
  },
};

export function getCategoryBadgeToken(category: string) {
  const upper = category?.toUpperCase() || "";
  return (
    CATEGORY_BADGE_TOKENS[upper] || {
      label: category,
      bg: "bg-emerald-50",
      text: "text-[#0E8C55]",
      border: "border-emerald-200",
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MEDAL PALETTE TOKENS (Bronze, Silver, Gold, Platinum, Diamond)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MedalToken {
  name: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  shadowColor: string;
  badgeBg: string;
  badgeText: string;
  iconType: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  // Row Full Tint Styling for Dossier Table
  rowBg: string;
  rowTitleColor: string;
  rowSecondaryColor: string;
}

export const MEDAL_TOKENS: Record<string, MedalToken> = {
  bronze: {
    name: "Bronze",
    color: "#8C5A2B",
    borderColor: "#8C5A2B",
    bgGradient: "#8C5A2B",
    shadowColor: "rgba(140, 90, 43, 0.16)",
    badgeBg: "bg-[#8C5A2B]",
    badgeText: "text-white",
    iconType: "bronze",
    rowBg: "#F1E4D8",
    rowTitleColor: "#4A2E10",
    rowSecondaryColor: "#7A4A1E",
  },
  silver: {
    name: "Silver",
    color: "#8A93A8",
    borderColor: "#8A93A8",
    bgGradient: "#8A93A8",
    shadowColor: "rgba(138, 147, 168, 0.18)",
    badgeBg: "bg-[#8A93A8]",
    badgeText: "text-white",
    iconType: "silver",
    rowBg: "#EFF0F3",
    rowTitleColor: "#3A3D47",
    rowSecondaryColor: "#6B6F7A",
  },
  gold: {
    name: "Gold",
    color: "#D4AF37",
    borderColor: "#D4AF37",
    bgGradient: "#D4AF37",
    shadowColor: "rgba(212, 175, 55, 0.22)",
    badgeBg: "bg-[#D4AF37]",
    badgeText: "text-white",
    iconType: "gold",
    rowBg: "#FBF3DD",
    rowTitleColor: "#4A3410",
    rowSecondaryColor: "#7A5A0E",
  },
  platinum: {
    name: "Platinum",
    color: "#6E5E8C",
    borderColor: "#6E5E8C",
    bgGradient: "#6E5E8C",
    shadowColor: "rgba(110, 94, 140, 0.22)",
    badgeBg: "bg-[#6E5E8C]",
    badgeText: "text-white",
    iconType: "platinum",
    rowBg: "#F1EEF7",
    rowTitleColor: "#2A2340",
    rowSecondaryColor: "#4B3D6B",
  },
  diamond: {
    name: "Diamond",
    color: "#5AC8D8",
    borderColor: "#5AC8D8",
    bgGradient: "linear-gradient(135deg, #5AC8D8 0%, #8E7CF0 100%)",
    shadowColor: "rgba(90, 200, 216, 0.24)",
    badgeBg: "bg-gradient-to-r from-[#5AC8D8] to-[#8E7CF0]",
    badgeText: "text-white",
    iconType: "diamond",
    rowBg: "linear-gradient(90deg, #E6F7F9 0%, #F1EEFA 100%)",
    rowTitleColor: "#17434A",
    rowSecondaryColor: "#3A4B5A",
  },
};

export function getMedalToken(classification?: string | null): MedalToken {
  if (!classification) return MEDAL_TOKENS.gold;
  const key = classification.trim().toLowerCase();
  if (key.includes("diamond") || key.includes("berlian")) return MEDAL_TOKENS.diamond;
  if (key.includes("platinum")) return MEDAL_TOKENS.platinum;
  if (key.includes("silver") || key.includes("perak")) return MEDAL_TOKENS.silver;
  if (key.includes("bronze") || key.includes("perunggu")) return MEDAL_TOKENS.bronze;
  return MEDAL_TOKENS.gold;
}
