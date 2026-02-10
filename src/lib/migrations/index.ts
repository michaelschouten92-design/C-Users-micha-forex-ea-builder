import type { BuildJsonSchema } from "@/types/builder";

type Migration = {
  version: string;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
};

const migrations: Migration[] = [
  // Example for future use:
  // {
  //   version: "1.1",
  //   up: (data) => {
  //     // Add new field defaults, rename fields, etc.
  //     return data;
  //   },
  // },
];

export const CURRENT_VERSION = "1.0";

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
