import type { Node, Edge, Connection } from "@xyflow/react";
import type { BuilderNodeData } from "@/types/builder";

/**
 * Connection validation rules for the EA Builder
 *
 * We keep validation simple and only block clearly invalid connections:
 * - Self-connections
 * - Duplicate connections
 * - Circular connections
 */

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

  // Rule 2: Prevent duplicate connections
  const duplicateEdge = edges.find((e) => e.source === source && e.target === target);
  if (duplicateEdge) {
    return {
      isValid: false,
      reason: "Connection already exists",
    };
  }

  // Rule 3: Max 1 connection per target handle (input)
  const existingToTarget = edges.filter(
    (e) => e.target === target && e.targetHandle === (connection.targetHandle ?? null)
  );
  if (existingToTarget.length > 0) {
    return {
      isValid: false,
      reason: "This input already has a connection. Remove it first.",
    };
  }

  // Rule 4: Prevent circular connections
  if (wouldCreateCycle(source!, target!, edges)) {
    return {
      isValid: false,
      reason: "This connection would create a loop, which isn't allowed.",
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
