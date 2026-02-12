import type { BuildJsonSchema } from "@/types/builder";

type Migration = {
  version: string;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
};

const migrations: Migration[] = [
  {
    version: "1.1",
    up: (data) => {
      // Rename "Equity Filter" label to "Daily Drawdown Limit"
      const nodes = data.nodes as Array<Record<string, unknown>> | undefined;
      if (nodes) {
        for (const node of nodes) {
          const nodeData = node.data as Record<string, unknown> | undefined;
          if (
            nodeData &&
            nodeData.filterType === "equity-filter" &&
            nodeData.label === "Equity Filter"
          ) {
            nodeData.label = "Daily Drawdown Limit";
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
