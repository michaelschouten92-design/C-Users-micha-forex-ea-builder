import type { StrategyLifecycleState } from "./transitions";

const LEGACY_PHASE_MAP: Record<string, StrategyLifecycleState> = {
  NEW: "DRAFT",
  PROVING: "LIVE_MONITORING",
  PROVEN: "LIVE_MONITORING",
  RETIRED: "INVALIDATED",
};

export function mapLegacyPhase(phase: string): StrategyLifecycleState {
  const mapped = LEGACY_PHASE_MAP[phase];
  if (!mapped) {
    throw new Error(`Unknown legacy lifecyclePhase: ${phase}`);
  }
  return mapped;
}
