import type { BuildJsonSchema } from "@/types/builder";

type Migration = {
  version: string;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
};

const migrations: Migration[] = [
  {
    version: "1.1",
    up: (data) => {
      // Remove equity-filter nodes (functionality moved to strategy settings)
      const nodes = data.nodes as Array<Record<string, unknown>> | undefined;
      if (nodes) {
        const removedIds = new Set<string>();
        for (const node of nodes) {
          const nodeData = node.data as Record<string, unknown> | undefined;
          if (nodeData && nodeData.filterType === "equity-filter") {
            removedIds.add(node.id as string);
          }
        }
        if (removedIds.size > 0) {
          data.nodes = nodes.filter(
            (n) =>
              !(n.data as Record<string, unknown> | undefined)?.filterType ||
              (n.data as Record<string, unknown>).filterType !== "equity-filter"
          );
          const edges = data.edges as Array<Record<string, unknown>> | undefined;
          if (edges) {
            data.edges = edges.filter(
              (e) => !removedIds.has(e.source as string) && !removedIds.has(e.target as string)
            );
          }
        }
      }
      return data;
    },
  },
  {
    version: "1.2",
    up: (data) => {
      // Migrate per-strategy HTF fields to unified mtfConfirmation
      const nodes = data.nodes as Array<Record<string, unknown>> | undefined;
      if (nodes) {
        for (const node of nodes) {
          const d = node.data as Record<string, unknown> | undefined;
          if (!d || d.category !== "entrystrategy" || !("entryType" in d)) continue;

          const entryType = d.entryType as string;

          // EMA Crossover, Range Breakout, MACD Crossover: htfTrendFilter/htfTimeframe/htfEma
          if (
            (entryType === "ema-crossover" ||
              entryType === "range-breakout" ||
              entryType === "macd-crossover") &&
            d.htfTrendFilter === true &&
            !d.mtfConfirmation
          ) {
            d.mtfConfirmation = {
              enabled: true,
              timeframe: d.htfTimeframe ?? "H4",
              method: "ema",
              emaPeriod: d.htfEma ?? 200,
            };
          }

          // RSI Reversal: trendFilter/trendEma (same-TF EMA, map to MTF with entry TF)
          if (entryType === "rsi-reversal" && d.trendFilter === true && !d.mtfConfirmation) {
            d.mtfConfirmation = {
              enabled: true,
              timeframe: (d.timeframe as string) ?? "H1",
              method: "ema",
              emaPeriod: d.trendEma ?? 200,
            };
          }

          // Trend Pullback: useAdxFilter → map to ADX MTF
          if (entryType === "trend-pullback" && d.useAdxFilter === true && !d.mtfConfirmation) {
            d.mtfConfirmation = {
              enabled: true,
              timeframe: (d.timeframe as string) ?? "H1",
              method: "adx",
              adxPeriod: d.adxPeriod ?? 14,
              adxThreshold: d.adxThreshold ?? 25,
            };
          }
        }
      }
      return data;
    },
  },
];

export const CURRENT_VERSION = "1.2";

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  if (aMajor !== bMajor) return aMajor - bMajor;
  return aMinor - bMinor;
}

export function migrateProjectData(data: unknown): BuildJsonSchema {
  let current = data as Record<string, unknown>;
  let version = (current.version as string) ?? "1.0";

  for (const migration of migrations) {
    if (compareVersions(version, migration.version) < 0) {
      current = migration.up(current);
      version = migration.version;
    }
  }

  current.version = CURRENT_VERSION;
  return current as unknown as BuildJsonSchema;
}
