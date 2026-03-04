/**
 * Edge Drift Detection v0
 *
 * Compares baseline winrate with live winrate to detect
 * strategy performance drift. Pure, deterministic, no I/O.
 */

export type EdgeDriftStatus = "OK" | "WARNING" | "HIGH";

export interface EdgeDriftResult {
  baselineWinrate: number;
  liveWinrate: number;
  driftPct: number;
  status: EdgeDriftStatus;
}

export function computeEdgeDrift(baselineWinrate: number, liveWinrate: number): EdgeDriftResult {
  validateWinrate(baselineWinrate, "baselineWinrate");
  validateWinrate(liveWinrate, "liveWinrate");

  const driftPct = Math.abs(baselineWinrate - liveWinrate);

  let status: EdgeDriftStatus;
  if (driftPct < 5) {
    status = "OK";
  } else if (driftPct < 10) {
    status = "WARNING";
  } else {
    status = "HIGH";
  }

  return { baselineWinrate, liveWinrate, driftPct, status };
}

function validateWinrate(value: number, name: string): void {
  if (value < 0 || value > 100 || !Number.isFinite(value)) {
    throw new Error(`${name} must be between 0 and 100, got ${value}`);
  }
}
