import type { Node, Edge, Connection } from "@xyflow/react";
import type { BuilderNodeData, StopLossNodeData } from "@/types/builder";

/**
 * Connection validation rules for the EA Builder
 *
 * We keep validation simple and only block clearly invalid connections:
 * - Self-connections
 * - Connections to nodes without input handles
 * - Duplicate connections
 * - Circular connections
 */

// Nodes that cannot receive any connections (no input handles)
const NO_INPUT_NODES = ["position-sizing", "take-profit"];

export interface ConnectionValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates if a connection between two nodes is allowed
 */
export function validateConnection(
  connection: Connection,
  nodes: Node<BuilderNodeData>[],
  edges: Edge[]
): ConnectionValidationResult {
  const { source, target } = connection;

  // Rule 1: No self-connections
  if (source === target) {
    return {
      isValid: false,
      reason: "Cannot connect a node to itself",
    };
  }

  // Find source and target nodes
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return {
      isValid: false,
      reason: "Source or target node not found",
    };
  }

  const targetData = targetNode.data;

  // Rule 2: Check if target node accepts inputs
  if (NO_INPUT_NODES.includes(targetNode.type as string)) {
    const label = targetData?.label || targetNode.type;
    return {
      isValid: false,
      reason: `${label} does not accept incoming connections`,
    };
  }

  // Rule 3: Special case for stop-loss - only accepts input when method is "INDICATOR"
  if (targetNode.type === "stop-loss") {
    const slData = targetData as StopLossNodeData;
    if (slData.method !== "INDICATOR") {
      return {
        isValid: false,
        reason: "Stop Loss only accepts connections when method is set to 'Indicator'",
      };
    }
  }

  // Rule 4: Prevent duplicate connections
  const duplicateEdge = edges.find(
    (e) => e.source === source && e.target === target
  );
  if (duplicateEdge) {
    return {
      isValid: false,
      reason: "Connection already exists",
    };
  }

  // Rule 5: Prevent circular connections
  if (wouldCreateCycle(source!, target!, edges)) {
    return {
      isValid: false,
      reason: "Connection would create a circular reference",
    };
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Check if adding an edge from source to target would create a cycle
 */
function wouldCreateCycle(source: string, target: string, edges: Edge[]): boolean {
  // If target can reach source through existing edges, adding source->target creates cycle
  const visited = new Set<string>();
  const queue = [target];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) {
      return true; // Found a path from target back to source
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Find all nodes that current connects to
    for (const edge of edges) {
      if (edge.source === current) {
        queue.push(edge.target);
      }
    }
  }

  return false;
}
