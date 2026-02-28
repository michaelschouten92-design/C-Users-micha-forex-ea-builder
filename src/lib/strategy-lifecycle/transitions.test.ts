import { describe, it, expect } from "vitest";
import {
  transitionLifecycle,
  VALID_LIFECYCLE_TRANSITIONS,
  type StrategyLifecycleState,
} from "./transitions";

describe("transitionLifecycle", () => {
  describe("valid transitions", () => {
    it("allows DRAFT → BACKTESTED", () => {
      expect(() => transitionLifecycle("DRAFT", "BACKTESTED")).not.toThrow();
    });

    it("allows BACKTESTED → VERIFIED", () => {
      expect(() => transitionLifecycle("BACKTESTED", "VERIFIED")).not.toThrow();
    });

    it("allows BACKTESTED → DRAFT (rework)", () => {
      expect(() => transitionLifecycle("BACKTESTED", "DRAFT")).not.toThrow();
    });

    it("allows VERIFIED → LIVE_MONITORING", () => {
      expect(() => transitionLifecycle("VERIFIED", "LIVE_MONITORING")).not.toThrow();
    });

    it("allows LIVE_MONITORING → EDGE_AT_RISK", () => {
      expect(() => transitionLifecycle("LIVE_MONITORING", "EDGE_AT_RISK")).not.toThrow();
    });

    it("allows LIVE_MONITORING → INVALIDATED", () => {
      expect(() => transitionLifecycle("LIVE_MONITORING", "INVALIDATED")).not.toThrow();
    });

    it("allows EDGE_AT_RISK → LIVE_MONITORING (recovery)", () => {
      expect(() => transitionLifecycle("EDGE_AT_RISK", "LIVE_MONITORING")).not.toThrow();
    });

    it("allows EDGE_AT_RISK → INVALIDATED", () => {
      expect(() => transitionLifecycle("EDGE_AT_RISK", "INVALIDATED")).not.toThrow();
    });
  });

  describe("invalid transitions", () => {
    it("rejects self-transition DRAFT → DRAFT", () => {
      expect(() => transitionLifecycle("DRAFT", "DRAFT")).toThrow(
        "Invalid lifecycle transition: DRAFT → DRAFT"
      );
    });

    it("rejects DRAFT → INVALIDATED (must go through full lifecycle)", () => {
      expect(() => transitionLifecycle("DRAFT", "INVALIDATED")).toThrow(
        "Invalid lifecycle transition: DRAFT → INVALIDATED"
      );
    });

    it("rejects VERIFIED → DRAFT (no rework from VERIFIED)", () => {
      expect(() => transitionLifecycle("VERIFIED", "DRAFT")).toThrow(
        "Invalid lifecycle transition: VERIFIED → DRAFT"
      );
    });

    it("rejects INVALIDATED → DRAFT (terminal state)", () => {
      expect(() => transitionLifecycle("INVALIDATED", "DRAFT")).toThrow(
        "Invalid lifecycle transition: INVALIDATED → DRAFT"
      );
    });

    it("rejects INVALIDATED → LIVE_MONITORING (terminal state)", () => {
      expect(() => transitionLifecycle("INVALIDATED", "LIVE_MONITORING")).toThrow(
        "Invalid lifecycle transition: INVALIDATED → LIVE_MONITORING"
      );
    });

    it("rejects LIVE_MONITORING → DRAFT (no backwards jump)", () => {
      expect(() => transitionLifecycle("LIVE_MONITORING", "DRAFT")).toThrow(
        "Invalid lifecycle transition: LIVE_MONITORING → DRAFT"
      );
    });
  });

  describe("transition table", () => {
    it("exports VALID_LIFECYCLE_TRANSITIONS for consumer inspection", () => {
      const states: StrategyLifecycleState[] = [
        "DRAFT",
        "BACKTESTED",
        "VERIFIED",
        "LIVE_MONITORING",
        "EDGE_AT_RISK",
        "INVALIDATED",
      ];
      for (const state of states) {
        expect(VALID_LIFECYCLE_TRANSITIONS).toHaveProperty(state);
        expect(Array.isArray(VALID_LIFECYCLE_TRANSITIONS[state])).toBe(true);
      }
    });

    it("marks INVALIDATED as terminal with no outgoing transitions", () => {
      expect(VALID_LIFECYCLE_TRANSITIONS.INVALIDATED).toEqual([]);
    });
  });
});
