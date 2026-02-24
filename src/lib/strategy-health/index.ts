export { computeHealth } from "./scorer";
export { collectLiveMetrics } from "./collector";
export { evaluateHealth, evaluateHealthIfDue, getHealthWithFreshness } from "./evaluator";
export { extractBaselineMetrics, estimateBacktestDuration } from "./baseline-extractor";
export { computeCusum, computeTradeReturns } from "./drift-detector";
export {
  THRESHOLDS,
  MIN_TRADES_FOR_ASSESSMENT,
  MIN_DAYS_FOR_ASSESSMENT,
  PROVEN_CONSECUTIVE_HEALTHY,
  PROVEN_MIN_TRADES,
  RETIRED_CONSECUTIVE_DEGRADED,
} from "./thresholds";
export type {
  LiveMetrics,
  BaselineMetrics,
  HealthResult,
  HealthStatusType,
  MetricScore,
  ConfidenceInterval,
  DriftInfo,
} from "./types";
