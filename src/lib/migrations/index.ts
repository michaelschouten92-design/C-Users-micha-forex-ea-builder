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
];

export const CURRENT_VERSION = "1.1";

export function migrateProjectData(data: unknown): BuildJsonSchema {
  let current = data as Record<string, unknown>;
  let version = (current.version as string) ?? "1.0";

  for (const migration of migrations) {
    if (version < migration.version) {
      current = migration.up(current);
      version = migration.version;
    }
  }

  current.version = CURRENT_VERSION;
  return current as unknown as BuildJsonSchema;
}
