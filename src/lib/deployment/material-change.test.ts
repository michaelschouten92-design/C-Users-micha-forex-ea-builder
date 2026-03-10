import { describe, it, expect } from "vitest";
import { detectMaterialChange } from "./material-change";

describe("detectMaterialChange", () => {
  it("returns no change when both fingerprints are null", () => {
    const result = detectMaterialChange({
      reportedFingerprint: null,
      existingFingerprint: null,
      existingBaselineStatus: "LINKED",
    });
    expect(result.isMaterialChange).toBe(false);
    expect(result.newBaselineStatus).toBeUndefined();
  });

  it("returns no change when existing fingerprint is null (first report)", () => {
    const result = detectMaterialChange({
      reportedFingerprint: "a".repeat(64),
      existingFingerprint: null,
      existingBaselineStatus: "LINKED",
    });
    expect(result.isMaterialChange).toBe(false);
    expect(result.newBaselineStatus).toBeUndefined();
  });

  it("returns no change when fingerprints match", () => {
    const fp = "b".repeat(64);
    const result = detectMaterialChange({
      reportedFingerprint: fp,
      existingFingerprint: fp,
      existingBaselineStatus: "LINKED",
    });
    expect(result.isMaterialChange).toBe(false);
    expect(result.newBaselineStatus).toBeUndefined();
  });

  it("returns RELINK_REQUIRED when fingerprints differ and baseline is LINKED", () => {
    const result = detectMaterialChange({
      reportedFingerprint: "a".repeat(64),
      existingFingerprint: "b".repeat(64),
      existingBaselineStatus: "LINKED",
    });
    expect(result.isMaterialChange).toBe(true);
    expect(result.newBaselineStatus).toBe("RELINK_REQUIRED");
  });

  it("detects change but does NOT transition non-LINKED baseline", () => {
    const result = detectMaterialChange({
      reportedFingerprint: "a".repeat(64),
      existingFingerprint: "b".repeat(64),
      existingBaselineStatus: "UNLINKED",
    });
    expect(result.isMaterialChange).toBe(true);
    expect(result.newBaselineStatus).toBeUndefined();
  });

  it("returns no change when reported fingerprint is null", () => {
    const result = detectMaterialChange({
      reportedFingerprint: null,
      existingFingerprint: "b".repeat(64),
      existingBaselineStatus: "LINKED",
    });
    expect(result.isMaterialChange).toBe(false);
    expect(result.newBaselineStatus).toBeUndefined();
  });
});
