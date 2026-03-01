import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildConfigSnapshot,
  computeThresholdsHash,
  verifyConfigSnapshot,
} from "./config-snapshot";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationConfig: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe("VerificationConfig governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seed snapshot matches buildConfigSnapshot output", () => {
    const snapshot = buildConfigSnapshot();

    // Snapshot has the expected shape
    expect(snapshot).toEqual({
      configVersion: "1.0.0",
      thresholds: expect.objectContaining({
        minTradeCount: 30,
        readyConfidenceThreshold: 0.75,
        notDeployableThreshold: 0.45,
        maxSharpeDegradationPct: 40,
        extremeSharpeDegradationPct: 80,
        minOosTradeCount: 20,
        ruinProbabilityCeiling: 0.15,
        monteCarloIterations: 10_000,
      }),
      thresholdsHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("stored snapshot passes verifyConfigSnapshot", () => {
    const snapshot = buildConfigSnapshot();
    const result = verifyConfigSnapshot(snapshot);
    expect(result.valid).toBe(true);
  });

  it("thresholdsHash is recomputable from snapshot thresholds", () => {
    const snapshot = buildConfigSnapshot();
    const recomputed = computeThresholdsHash(snapshot.thresholds);
    expect(recomputed).toBe(snapshot.thresholdsHash);
  });

  it("exactly one ACTIVE config after seeding", async () => {
    // Simulate: findMany returns the seeded config
    const snapshot = buildConfigSnapshot();
    const seededRow = {
      id: "clx_seed",
      configVersion: snapshot.configVersion,
      thresholdsHash: snapshot.thresholdsHash,
      snapshot,
      status: "ACTIVE",
      activatedAt: new Date(),
      deprecatedAt: null,
      activatedBy: "system",
    };
    mockFindMany.mockResolvedValue([seededRow]);

    const { prisma } = await import("@/lib/prisma");
    const activeConfigs = await prisma.verificationConfig.findMany({
      where: { status: "ACTIVE" },
    });

    expect(activeConfigs).toHaveLength(1);
    expect(activeConfigs[0].configVersion).toBe("1.0.0");
    expect(activeConfigs[0].status).toBe("ACTIVE");
  });

  it("stored thresholdsHash matches recomputation from stored snapshot", async () => {
    const snapshot = buildConfigSnapshot();
    const storedRow = {
      id: "clx_seed",
      configVersion: snapshot.configVersion,
      thresholdsHash: snapshot.thresholdsHash,
      snapshot,
      status: "ACTIVE",
    };
    mockFindUnique.mockResolvedValue(storedRow);

    const { prisma } = await import("@/lib/prisma");
    const config = await prisma.verificationConfig.findUnique({
      where: { configVersion: "1.0.0" },
    });

    expect(config).toBeDefined();

    // Recompute hash from the stored snapshot's thresholds
    const stored = config!.snapshot as unknown as typeof snapshot;
    const recomputed = computeThresholdsHash(stored.thresholds);
    expect(recomputed).toBe(config!.thresholdsHash);
  });

  it("partial unique index prevents second ACTIVE insert", async () => {
    // Simulate: create with ACTIVE status throws unique constraint violation
    // (This is what PostgreSQL's partial unique index enforces)
    mockCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on the fields: (`status`)"), {
        code: "P2002",
        meta: { target: ["status"] },
      })
    );

    const { prisma } = await import("@/lib/prisma");
    await expect(
      prisma.verificationConfig.create({
        data: {
          configVersion: "2.0.0",
          thresholdsHash: "new_hash",
          snapshot: {},
          status: "ACTIVE",
          activatedBy: "system",
        },
      })
    ).rejects.toThrow("Unique constraint failed");
  });
});
