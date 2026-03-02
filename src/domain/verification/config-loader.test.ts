import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildConfigSnapshot, computeThresholdsHash } from "./config-snapshot";

const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationConfig: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

function makeActiveRow() {
  const snapshot = buildConfigSnapshot();
  return {
    id: "clx_1",
    configVersion: snapshot.configVersion,
    thresholdsHash: snapshot.thresholdsHash,
    snapshot,
    status: "ACTIVE",
  };
}

describe("config-loader", () => {
  const origEnv = process.env.ALLOW_CONFIG_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_CONFIG_FALLBACK;
  });

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.ALLOW_CONFIG_FALLBACK = origEnv;
    } else {
      delete process.env.ALLOW_CONFIG_FALLBACK;
    }
  });

  describe("loadActiveConfig", () => {
    it("returns snapshot with source 'db' from ACTIVE config row", async () => {
      mockFindFirst.mockResolvedValue(makeActiveRow());

      const { loadActiveConfig } = await import("./config-loader");
      const result = await loadActiveConfig();

      expect(result.source).toBe("db");
      expect(result.config).toEqual(buildConfigSnapshot());
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
      });
    });

    it("throws NoActiveConfigError when no ACTIVE config exists", async () => {
      mockFindFirst.mockResolvedValue(null);

      const { loadActiveConfig, NoActiveConfigError } = await import("./config-loader");
      await expect(loadActiveConfig()).rejects.toThrow(NoActiveConfigError);
    });

    it("throws ConfigIntegrityError when hash is tampered", async () => {
      const row = makeActiveRow();
      row.thresholdsHash = "0".repeat(64);
      mockFindFirst.mockResolvedValue(row);

      const { loadActiveConfig, ConfigIntegrityError } = await import("./config-loader");
      await expect(loadActiveConfig()).rejects.toThrow(ConfigIntegrityError);
    });

    it("throws ConfigIntegrityError when thresholds in snapshot are tampered", async () => {
      const snapshot = buildConfigSnapshot();
      const tamperedSnapshot = {
        ...snapshot,
        thresholds: { ...snapshot.thresholds, minTradeCount: 999 },
      };
      mockFindFirst.mockResolvedValue({
        id: "clx_1",
        configVersion: snapshot.configVersion,
        thresholdsHash: snapshot.thresholdsHash,
        snapshot: tamperedSnapshot,
        status: "ACTIVE",
      });

      const { loadActiveConfig, ConfigIntegrityError } = await import("./config-loader");
      await expect(loadActiveConfig()).rejects.toThrow(ConfigIntegrityError);
    });

    it("ConfigIntegrityError includes expected and actual hashes", async () => {
      const snapshot = buildConfigSnapshot();
      const tamperedSnapshot = {
        ...snapshot,
        thresholds: { ...snapshot.thresholds, minTradeCount: 999 },
      };
      mockFindFirst.mockResolvedValue({
        id: "clx_1",
        configVersion: snapshot.configVersion,
        thresholdsHash: snapshot.thresholdsHash,
        snapshot: tamperedSnapshot,
        status: "ACTIVE",
      });

      const { loadActiveConfig, ConfigIntegrityError } = await import("./config-loader");
      try {
        await loadActiveConfig();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigIntegrityError);
        const integrity = err as InstanceType<typeof ConfigIntegrityError>;
        expect(integrity.details.expected).toBe(snapshot.thresholdsHash);
        expect(integrity.details.actual).toBe(
          computeThresholdsHash(tamperedSnapshot.thresholds, tamperedSnapshot.monitoringThresholds)
        );
      }
    });

    it("throws ConfigIntegrityError when v2 snapshot is missing monitoringThresholds", async () => {
      const snapshot = buildConfigSnapshot();
      // Simulate a v2 snapshot stored without monitoringThresholds
      const strippedSnapshot = {
        configVersion: "2.0.0",
        thresholds: snapshot.thresholds,
        thresholdsHash: snapshot.thresholdsHash,
        // monitoringThresholds intentionally omitted
      };
      mockFindFirst.mockResolvedValue({
        id: "clx_1",
        configVersion: "2.0.0",
        thresholdsHash: snapshot.thresholdsHash,
        snapshot: strippedSnapshot,
        status: "ACTIVE",
      });

      const { loadActiveConfig, ConfigIntegrityError } = await import("./config-loader");
      await expect(loadActiveConfig()).rejects.toThrow(ConfigIntegrityError);
      await expect(loadActiveConfig()).rejects.toThrow(/missing monitoringThresholds/);
    });

    it("loads v1 snapshot without monitoringThresholds successfully", async () => {
      const v1Hash = computeThresholdsHash({
        minTradeCount: 30,
        readyConfidenceThreshold: 0.75,
        notDeployableThreshold: 0.45,
        maxSharpeDegradationPct: 40,
        extremeSharpeDegradationPct: 80,
        minOosTradeCount: 20,
        ruinProbabilityCeiling: 0.15,
        monteCarloIterations: 10_000,
      });
      const v1Snapshot = {
        configVersion: "1.0.0",
        thresholds: {
          minTradeCount: 30,
          readyConfidenceThreshold: 0.75,
          notDeployableThreshold: 0.45,
          maxSharpeDegradationPct: 40,
          extremeSharpeDegradationPct: 80,
          minOosTradeCount: 20,
          ruinProbabilityCeiling: 0.15,
          monteCarloIterations: 10_000,
        },
        thresholdsHash: v1Hash,
      };
      mockFindFirst.mockResolvedValue({
        id: "clx_v1",
        configVersion: "1.0.0",
        thresholdsHash: v1Hash,
        snapshot: v1Snapshot,
        status: "ACTIVE",
      });

      const { loadActiveConfig } = await import("./config-loader");
      const result = await loadActiveConfig();

      expect(result.source).toBe("db");
      expect(result.config.configVersion).toBe("1.0.0");
      expect(result.config.monitoringThresholds).toBeUndefined();
    });
  });

  describe("loadActiveConfigWithFallback", () => {
    it("returns DB config with source 'db' when available", async () => {
      mockFindFirst.mockResolvedValue(makeActiveRow());

      const { loadActiveConfigWithFallback } = await import("./config-loader");
      const result = await loadActiveConfigWithFallback();

      expect(result.source).toBe("db");
      expect(result.config).toEqual(buildConfigSnapshot());
    });

    it("throws NoActiveConfigError when fallback is NOT allowed (default)", async () => {
      mockFindFirst.mockResolvedValue(null);

      const { loadActiveConfigWithFallback, NoActiveConfigError } = await import("./config-loader");
      await expect(loadActiveConfigWithFallback()).rejects.toThrow(NoActiveConfigError);
    });

    it("throws NoActiveConfigError when ALLOW_CONFIG_FALLBACK is 'false'", async () => {
      process.env.ALLOW_CONFIG_FALLBACK = "false";
      mockFindFirst.mockResolvedValue(null);

      const { loadActiveConfigWithFallback, NoActiveConfigError } = await import("./config-loader");
      await expect(loadActiveConfigWithFallback()).rejects.toThrow(NoActiveConfigError);
    });

    it("falls back with source 'fallback' when ALLOW_CONFIG_FALLBACK=true", async () => {
      process.env.ALLOW_CONFIG_FALLBACK = "true";
      mockFindFirst.mockResolvedValue(null);

      const { loadActiveConfigWithFallback } = await import("./config-loader");
      const result = await loadActiveConfigWithFallback();

      expect(result.source).toBe("fallback");
      expect(result.config).toEqual(buildConfigSnapshot());
    });

    it("does NOT catch ConfigIntegrityError even when fallback is allowed", async () => {
      process.env.ALLOW_CONFIG_FALLBACK = "true";
      const row = makeActiveRow();
      row.thresholdsHash = "0".repeat(64);
      mockFindFirst.mockResolvedValue(row);

      const { loadActiveConfigWithFallback, ConfigIntegrityError } =
        await import("./config-loader");
      await expect(loadActiveConfigWithFallback()).rejects.toThrow(ConfigIntegrityError);
    });

    it("propagates DB connectivity errors regardless of fallback setting", async () => {
      process.env.ALLOW_CONFIG_FALLBACK = "true";
      mockFindFirst.mockRejectedValue(new Error("Connection refused"));

      const { loadActiveConfigWithFallback } = await import("./config-loader");
      await expect(loadActiveConfigWithFallback()).rejects.toThrow("Connection refused");
    });
  });
});
