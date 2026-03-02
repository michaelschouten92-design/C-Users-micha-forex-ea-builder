import { describe, it, expect } from "vitest";
import { canAcknowledge, shouldEscalate, shouldAutoInvalidate } from "./incident-lifecycle";

describe("canAcknowledge", () => {
  it("returns true for OPEN", () => {
    expect(canAcknowledge("OPEN")).toBe(true);
  });

  it("returns true for ESCALATED", () => {
    expect(canAcknowledge("ESCALATED")).toBe(true);
  });

  it("returns false for ACKNOWLEDGED", () => {
    expect(canAcknowledge("ACKNOWLEDGED")).toBe(false);
  });

  it("returns false for CLOSED", () => {
    expect(canAcknowledge("CLOSED")).toBe(false);
  });
});

describe("shouldEscalate", () => {
  const now = new Date("2026-03-03T13:00:00.000Z");

  it("returns true when OPEN and ackDeadlineAt <= now", () => {
    expect(
      shouldEscalate({ status: "OPEN", ackDeadlineAt: new Date("2026-03-03T12:00:00.000Z") }, now)
    ).toBe(true);
  });

  it("returns true when OPEN and ackDeadlineAt equals now", () => {
    expect(shouldEscalate({ status: "OPEN", ackDeadlineAt: now }, now)).toBe(true);
  });

  it("returns false when OPEN and ackDeadlineAt > now", () => {
    expect(
      shouldEscalate({ status: "OPEN", ackDeadlineAt: new Date("2026-03-03T14:00:00.000Z") }, now)
    ).toBe(false);
  });

  it("returns false when ESCALATED (already escalated)", () => {
    expect(
      shouldEscalate(
        { status: "ESCALATED", ackDeadlineAt: new Date("2026-03-03T12:00:00.000Z") },
        now
      )
    ).toBe(false);
  });

  it("returns false when ACKNOWLEDGED", () => {
    expect(
      shouldEscalate(
        { status: "ACKNOWLEDGED", ackDeadlineAt: new Date("2026-03-03T12:00:00.000Z") },
        now
      )
    ).toBe(false);
  });

  it("returns false when CLOSED", () => {
    expect(
      shouldEscalate({ status: "CLOSED", ackDeadlineAt: new Date("2026-03-03T12:00:00.000Z") }, now)
    ).toBe(false);
  });
});

describe("shouldAutoInvalidate", () => {
  const now = new Date("2026-03-03T20:00:00.000Z");

  it("returns true when OPEN and invalidateDeadlineAt <= now", () => {
    expect(
      shouldAutoInvalidate(
        { status: "OPEN", invalidateDeadlineAt: new Date("2026-03-03T19:00:00.000Z") },
        now
      )
    ).toBe(true);
  });

  it("returns true when ESCALATED and invalidateDeadlineAt <= now", () => {
    expect(
      shouldAutoInvalidate(
        { status: "ESCALATED", invalidateDeadlineAt: new Date("2026-03-03T19:00:00.000Z") },
        now
      )
    ).toBe(true);
  });

  it("returns false when ACKNOWLEDGED (not auto-invalidated)", () => {
    expect(
      shouldAutoInvalidate(
        { status: "ACKNOWLEDGED", invalidateDeadlineAt: new Date("2026-03-03T19:00:00.000Z") },
        now
      )
    ).toBe(false);
  });

  it("returns false when CLOSED", () => {
    expect(
      shouldAutoInvalidate(
        { status: "CLOSED", invalidateDeadlineAt: new Date("2026-03-03T19:00:00.000Z") },
        now
      )
    ).toBe(false);
  });

  it("returns false when invalidateDeadlineAt is null", () => {
    expect(shouldAutoInvalidate({ status: "OPEN", invalidateDeadlineAt: null }, now)).toBe(false);
  });

  it("returns false when invalidateDeadlineAt > now", () => {
    expect(
      shouldAutoInvalidate(
        { status: "OPEN", invalidateDeadlineAt: new Date("2026-03-03T21:00:00.000Z") },
        now
      )
    ).toBe(false);
  });
});
