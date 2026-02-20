/**
 * Strategy fingerprinting — deterministic hashing of strategy logic and parameters.
 *
 * Produces a unique fingerprint for each distinct strategy configuration.
 * Two exports with identical logic and parameters produce the same fingerprint.
 */

import { sha256 } from "@/lib/track-record/canonical";
import type { FingerprintResult } from "./types";

// UI-only fields stripped from node data before hashing
const NODE_UI_FIELDS = new Set([
  "position",
  "selected",
  "dragging",
  "width",
  "height",
  "measured",
  "id",
  "positionAbsolute",
  "draggable",
  "selectable",
  "deletable",
  "connectable",
  "focusable",
  "parentId",
  "extent",
  "expandParent",
  "sourcePosition",
  "targetPosition",
  "hidden",
  "zIndex",
  "ariaLabel",
  "internalsSymbol",
  "origin",
  "style",
  "className",
  "resizing",
  "initialWidth",
  "initialHeight",
]);

// Settings fields excluded from parameter hash (varies per deployment)
const EXCLUDED_SETTINGS_FIELDS = new Set(["magicNumber"]);

/**
 * Deep-sort an object's keys recursively for canonical JSON.
 */
function sortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Strip UI-only fields from a node, keeping only logic-relevant data.
 */
function stripNodeUIFields(node: Record<string, unknown>): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!NODE_UI_FIELDS.has(key)) {
      stripped[key] = value;
    }
  }
  return stripped;
}

interface BuildJsonInput {
  version: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
}

/**
 * Compute the strategy fingerprint from build JSON.
 *
 * Logic Hash: captures what the strategy does (node types + edge topology)
 * Parameter Hash: captures how the strategy is tuned (settings + node params)
 * Fingerprint: SHA-256(logicHash + ":" + parameterHash + ":" + version)
 */
export function computeStrategyFingerprint(buildJson: BuildJsonInput): FingerprintResult {
  const logicHash = computeLogicHash(buildJson);
  const parameterHash = computeParameterHash(buildJson);
  const fingerprint = sha256(logicHash + ":" + parameterHash + ":" + buildJson.version);

  return { fingerprint, logicHash, parameterHash };
}

/**
 * Step 1 — Logic Hash: what the strategy does.
 *
 * Extracts node types + data (without UI fields) and edge topology
 * (using source/target node types instead of IDs for topology-based matching).
 */
function computeLogicHash(buildJson: BuildJsonInput): string {
  // Build node ID → type map for topology-based edge hashing
  const nodeTypeMap = new Map<string, string>();
  for (const node of buildJson.nodes) {
    nodeTypeMap.set(node.id as string, node.type as string);
  }

  // Extract canonical node representations (type + data, no UI fields)
  const canonicalNodes = buildJson.nodes
    .map((node) => {
      const stripped = stripNodeUIFields(node);
      // Also strip 'data' sub-fields that are UI-only
      if (stripped.data && typeof stripped.data === "object") {
        const data = { ...(stripped.data as Record<string, unknown>) };
        // Remove label as it's display-only
        delete data.label;
        stripped.data = data;
      }
      return stripped;
    })
    .sort((a, b) => {
      const typeA = (a.type as string) || "";
      const typeB = (b.type as string) || "";
      return typeA.localeCompare(typeB);
    });

  // Extract canonical edge representations (topology-based: source/target node types + handles)
  const canonicalEdges = buildJson.edges
    .map((edge) => ({
      sourceType: nodeTypeMap.get(edge.source as string) || "unknown",
      targetType: nodeTypeMap.get(edge.target as string) || "unknown",
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    }))
    .sort((a, b) => {
      const keyA = `${a.sourceType}-${a.targetType}-${a.sourceHandle}-${a.targetHandle}`;
      const keyB = `${b.sourceType}-${b.targetType}-${b.sourceHandle}-${b.targetHandle}`;
      return keyA.localeCompare(keyB);
    });

  const canonical = sortKeys({ nodes: canonicalNodes, edges: canonicalEdges });
  return sha256(JSON.stringify(canonical));
}

/**
 * Step 2 — Parameter Hash: how the strategy is tuned.
 *
 * Extracts settings (excluding magicNumber) and all node parameter values.
 */
function computeParameterHash(buildJson: BuildJsonInput): string {
  // Filter settings
  const filteredSettings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(buildJson.settings)) {
    if (!EXCLUDED_SETTINGS_FIELDS.has(key)) {
      filteredSettings[key] = value;
    }
  }

  // Extract node parameters (all data fields that are numbers, strings, booleans, arrays)
  const nodeParams = buildJson.nodes
    .map((node) => {
      const data = (node.data || {}) as Record<string, unknown>;
      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip display-only fields
        if (key === "label") continue;
        if (value !== null && value !== undefined) {
          params[key] = value;
        }
      }
      return {
        type: node.type,
        params,
      };
    })
    .sort((a, b) => ((a.type as string) || "").localeCompare((b.type as string) || ""));

  const canonical = sortKeys({ settings: filteredSettings, nodeParams });
  return sha256(JSON.stringify(canonical));
}
