/**
 * Canonical control explanations for heartbeat decisions.
 *
 * Each HeartbeatReasonCode maps to a structured explanation with:
 * - title:       What happened (short, scannable)
 * - explanation:  Why this decision was made (calm, authoritative)
 * - resolution:   What the operator can do about it
 *
 * Compile-time exhaustive: adding a new HeartbeatReasonCode without
 * updating this mapping produces a TypeScript error.
 *
 * Pure module — no I/O, no side effects.
 */

import type { HeartbeatReasonCode } from "./decide-heartbeat-action";

export interface ResolutionItem {
  text: string;
  href?: string;
}

export interface ControlExplanation {
  title: string;
  explanation: string;
  resolution: ResolutionItem[];
}

const CONTROL_EXPLANATIONS: Record<HeartbeatReasonCode, ControlExplanation> = {
  OK: {
    title: "Execution Authorized",
    explanation:
      "All governance checks passed. The strategy meets every structural, lifecycle, and authority requirement for live execution.",
    resolution: [{ text: "No action required. The control layer is actively monitoring." }],
  },
  STRATEGY_HALTED: {
    title: "Operator Halt Active",
    explanation:
      "An operator HALT override is in effect. This is an explicit, manual directive that supersedes all lifecycle and monitoring states.",
    resolution: [
      { text: "Release the operator hold to resume execution", href: "/app/live#operator-hold" },
    ],
  },
  MONITORING_AT_RISK: {
    title: "Edge at Risk",
    explanation:
      "Structural monitoring has detected statistical degradation in strategy performance. Execution is paused to prevent further capital exposure.",
    resolution: [
      { text: "Review the strategy's performance metrics." },
      {
        text: "If the edge has recovered, the system will automatically restore execution authority.",
      },
    ],
  },
  MONITORING_SUPPRESSED: {
    title: "Monitoring Suppressed",
    explanation:
      "A time-bounded monitoring suppression window is active. Execution is paused until the suppression window expires.",
    resolution: [
      { text: "Wait for the suppression window to expire, or remove the suppression manually." },
    ],
  },
  STRATEGY_INVALIDATED: {
    title: "Strategy Invalidated",
    explanation:
      "The strategy has reached a terminal lifecycle state. It can no longer receive execution authority.",
    resolution: [
      {
        text: "This is a permanent state. Create a new strategy version if you wish to resume trading.",
      },
    ],
  },
  NO_INSTANCE: {
    title: "No Live Instance",
    explanation:
      "No live EA instance was found for this strategy. The system defaults to PAUSE when there is no state to evaluate.",
    resolution: [
      { text: "Deploy a live EA instance and ensure it sends heartbeat signals." },
      { text: "Go to Command Center", href: "/app/live" },
    ],
  },
  CONFIG_UNAVAILABLE: {
    title: "Configuration Unavailable",
    explanation:
      "The governance configuration could not be loaded. The system defaults to PAUSE to prevent unmonitored execution.",
    resolution: [
      { text: "This is typically a transient system issue. If it persists, contact support." },
    ],
  },
  COMPUTATION_FAILED: {
    title: "System Uncertainty",
    explanation:
      "The heartbeat decision could not be computed due to an internal error. The system defaults to PAUSE as a fail-closed safeguard.",
    resolution: [
      {
        text: "This is typically a transient system issue. The next heartbeat cycle should resolve automatically.",
      },
    ],
  },
  NO_HEARTBEAT_PROOF: {
    title: "No Heartbeat Evidence",
    explanation:
      "No recorded heartbeat decisions exist for this strategy yet. The system defaults to PAUSE until proof evidence is established.",
    resolution: [
      {
        text: "Ensure your EA is running and sending heartbeat signals. The first decision will appear shortly.",
      },
    ],
  },
  CONTROL_INCONSISTENCY_DETECTED: {
    title: "Control Inconsistency",
    explanation:
      "The consistency guard detected a mismatch between the expected and actual heartbeat decision. Execution is forced to PAUSE as a protective measure.",
    resolution: [
      {
        text: "This indicates an internal logic divergence. The system should self-correct on the next heartbeat cycle.",
      },
      { text: "If it persists, contact support." },
    ],
  },
  AUTHORITY_UNINITIALIZED: {
    title: "Authority Not Initialized",
    explanation:
      "The authority system is not yet ready. This typically means no strategies have been created or no live EA instances are connected.",
    resolution: [
      { text: "Create a strategy baseline", href: "/app/onboarding?step=scope" },
      { text: "Attach a live EA instance", href: "/app/onboarding?step=scope" },
    ],
  },
};

/**
 * Returns the structured control explanation for a heartbeat reason code.
 * Compile-time exhaustive — every HeartbeatReasonCode is guaranteed to have an entry.
 */
export function getControlExplanation(reasonCode: HeartbeatReasonCode): ControlExplanation {
  return CONTROL_EXPLANATIONS[reasonCode];
}
