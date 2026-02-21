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
      // Previously migrated entry strategy HTF fields to mtfConfirmation.
      // Entry strategy nodes have been removed; this migration is now a no-op
      // but kept for version sequencing.
      return data;
    },
  },
  {
    version: "1.3",
    up: (data) => {
      const nodes = data.nodes as Array<Record<string, unknown>> | undefined;
      const edges = data.edges as Array<Record<string, unknown>> | undefined;
      if (!nodes) return data;

      // Build edge maps for lookup
      const edgesByTarget = new Map<string, Array<Record<string, unknown>>>();
      if (edges) {
        for (const edge of edges) {
          const target = edge.target as string;
          const arr = edgesByTarget.get(target);
          if (arr) arr.push(edge);
          else edgesByTarget.set(target, [edge]);
        }
      }

      // 1. Merge SL/TP nodes into connected buy/sell nodes
      const slNodes = new Map<string, Record<string, unknown>>();
      const tpNodes = new Map<string, Record<string, unknown>>();
      const alwaysNodeIds = new Set<string>();
      const removedIds = new Set<string>();

      for (const node of nodes) {
        const nd = node.data as Record<string, unknown> | undefined;
        if (!nd) continue;
        if (nd.tradingType === "stop-loss") slNodes.set(node.id as string, nd);
        else if (nd.tradingType === "take-profit") tpNodes.set(node.id as string, nd);
        else if (nd.timingType === "always") alwaysNodeIds.add(node.id as string);
      }

      // Find which buy/sell nodes connect to which SL/TP nodes via edges
      const slDefaults = {
        slMethod: "FIXED_PIPS",
        slFixedPips: 50,
        slPercent: 1,
        slAtrMultiplier: 1.5,
        slAtrPeriod: 14,
      };
      const tpDefaults = {
        tpMethod: "FIXED_PIPS",
        tpFixedPips: 100,
        tpRiskRewardRatio: 2,
        tpAtrMultiplier: 2,
        tpAtrPeriod: 14,
      };

      // For each buy/sell node, find connected SL and TP
      for (const node of nodes) {
        const nd = node.data as Record<string, unknown> | undefined;
        if (!nd) continue;
        if (nd.tradingType !== "place-buy" && nd.tradingType !== "place-sell") continue;

        // Find SL node connected from this buy/sell
        let slData: Record<string, unknown> | null = null;
        let tpData: Record<string, unknown> | null = null;

        if (edges) {
          for (const edge of edges) {
            if (edge.source === node.id) {
              const targetId = edge.target as string;
              if (slNodes.has(targetId)) slData = slNodes.get(targetId)!;
              if (tpNodes.has(targetId)) tpData = tpNodes.get(targetId)!;
            }
          }
          // Also check SL→TP chain: if SL connects to TP
          if (slData && !tpData) {
            for (const [slId] of slNodes) {
              for (const edge of edges) {
                if (edge.source === slId) {
                  const targetId = edge.target as string;
                  if (tpNodes.has(targetId)) tpData = tpNodes.get(targetId)!;
                }
              }
            }
          }
        }

        // Merge SL fields
        if (slData) {
          nd.slMethod = slData.method ?? "FIXED_PIPS";
          nd.slFixedPips = slData.fixedPips ?? 50;
          nd.slPercent = slData.slPercent ?? 1;
          nd.slAtrMultiplier = slData.atrMultiplier ?? 1.5;
          nd.slAtrPeriod = slData.atrPeriod ?? 14;
          if (slData.atrTimeframe) nd.slAtrTimeframe = slData.atrTimeframe;
          if (slData.indicatorNodeId) nd.slIndicatorNodeId = slData.indicatorNodeId;
        } else {
          Object.assign(nd, slDefaults);
        }

        // Merge TP fields
        if (tpData) {
          nd.tpMethod = tpData.method ?? "FIXED_PIPS";
          nd.tpFixedPips = tpData.fixedPips ?? 100;
          nd.tpRiskRewardRatio = tpData.riskRewardRatio ?? 2;
          nd.tpAtrMultiplier = tpData.atrMultiplier ?? 2;
          nd.tpAtrPeriod = tpData.atrPeriod ?? 14;
          if (tpData.multipleTPEnabled) nd.tpMultipleTPEnabled = tpData.multipleTPEnabled;
          if (tpData.tpLevels) nd.tpLevels = tpData.tpLevels;
        } else {
          Object.assign(nd, tpDefaults);
        }
      }

      // Mark SL, TP, and always nodes for removal
      for (const [id] of slNodes) removedIds.add(id);
      for (const [id] of tpNodes) removedIds.add(id);
      for (const id of alwaysNodeIds) removedIds.add(id);

      // Remove nodes
      if (removedIds.size > 0) {
        data.nodes = nodes.filter((n) => !removedIds.has(n.id as string));
        if (edges) {
          data.edges = edges.filter(
            (e) => !removedIds.has(e.source as string) && !removedIds.has(e.target as string)
          );
        }
      }

      return data;
    },
  },
];

export const CURRENT_VERSION = "1.3";

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
