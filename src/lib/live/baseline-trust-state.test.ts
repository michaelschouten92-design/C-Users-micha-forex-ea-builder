import { describe, it, expect } from "vitest";
import { resolveBaselineTrust, resolveInstanceBaselineTrust } from "./baseline-trust-state";

describe("resolveBaselineTrust", () => {
  it("LINKED → VERIFIED", () => {
    const result = resolveBaselineTrust("LINKED");
    expect(result.state).toBe("VERIFIED");
    expect(result.label).toBe("Verified");
    expect(result.color).toBe("#10B981");
    expect(result.actionLabel).toBeNull();
  });

  it("RELINK_REQUIRED → SUSPENDED", () => {
    const result = resolveBaselineTrust("RELINK_REQUIRED");
    expect(result.state).toBe("SUSPENDED");
    expect(result.label).toBe("Suspended");
    expect(result.color).toBe("#F59E0B");
    expect(result.actionLabel).toBe("Restore baseline trust");
  });

  it("UNLINKED → MISSING", () => {
    const result = resolveBaselineTrust("UNLINKED");
    expect(result.state).toBe("MISSING");
    expect(result.label).toBe("Missing");
    expect(result.color).toBe("#71717A");
    expect(result.actionLabel).toBe("Link baseline");
  });

  it("unknown status → MISSING", () => {
    const result = resolveBaselineTrust("SOMETHING_ELSE");
    expect(result.state).toBe("MISSING");
  });
});

describe("resolveInstanceBaselineTrust", () => {
  it("relinkRequired → SUSPENDED regardless of hasBaseline", () => {
    const result = resolveInstanceBaselineTrust({ hasBaseline: true, relinkRequired: true });
    expect(result.state).toBe("SUSPENDED");
    expect(result.actionLabel).toBe("Restore baseline trust");
  });

  it("no baseline, no relink → MISSING", () => {
    const result = resolveInstanceBaselineTrust({ hasBaseline: false, relinkRequired: false });
    expect(result.state).toBe("MISSING");
    expect(result.actionLabel).toBe("Link baseline");
  });

  it("has baseline, no relink → VERIFIED", () => {
    const result = resolveInstanceBaselineTrust({ hasBaseline: true, relinkRequired: false });
    expect(result.state).toBe("VERIFIED");
    expect(result.actionLabel).toBeNull();
  });
});
