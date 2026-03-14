export type Tier = "FREE" | "PRO" | "ELITE" | "INSTITUTIONAL";

export const TIERS: Tier[] = ["FREE", "PRO", "ELITE", "INSTITUTIONAL"];

export const TIER_LABELS: Record<Tier, string> = {
  FREE: "Baseline",
  PRO: "Control",
  ELITE: "Authority",
  INSTITUTIONAL: "Institutional",
};

export const TIER_BADGE_COLORS: Record<Tier, string> = {
  INSTITUTIONAL: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50",
  ELITE: "bg-[#818CF8]/20 text-[#818CF8] border-[#818CF8]/50",
  PRO: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/50",
  FREE: "bg-[rgba(255,255,255,0.06)] text-[#818CF8] border-[rgba(255,255,255,0.10)]",
};

export const TIER_DOT_COLORS: Record<Tier, string> = {
  FREE: "bg-[#71717A]",
  PRO: "bg-[#6366F1]",
  ELITE: "bg-[#818CF8]",
  INSTITUTIONAL: "bg-[#F59E0B]",
};

export const TIER_BORDER_COLORS: Record<Tier, string> = {
  FREE: "border-[#71717A]/50",
  PRO: "border-[#6366F1]/50",
  ELITE: "border-[#818CF8]/50",
  INSTITUTIONAL: "border-[#F59E0B]/50",
};
