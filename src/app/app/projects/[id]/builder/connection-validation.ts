import type { Node, Edge, Connection } from "@xyflow/react";
import type { BuilderNodeData, NodeCategory } from "@/types/builder";

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

  // Rule 4: Category-based semantic connection rules
  const sourceCategory = (sourceNode.data as BuilderNodeData).category;
  const targetCategory = (targetNode.data as BuilderNodeData).category;

  if (sourceCategory && targetCategory) {
    const allowedTargets = ALLOWED_TARGETS[sourceCategory];
    if (allowedTargets && !allowedTargets.has(targetCategory)) {
      const sourceCatLabel = CATEGORY_LABELS[sourceCategory] ?? sourceCategory;
      const targetCatLabel = CATEGORY_LABELS[targetCategory] ?? targetCategory;
      return {
        isValid: false,
        reason: `Cannot connect ${sourceCatLabel} → ${targetCatLabel}. This connection doesn't make sense for strategy logic.`,
      };
    }
  }

  // Rule 5: Prevent circular connections
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
 * Allowed target categories for each source category.
 * If a source category is not listed, it can connect to anything (no restriction).
 */
const ALLOWED_TARGETS: Partial<Record<NodeCategory, Set<NodeCategory>>> = {
  timing: new Set(["indicator", "priceaction", "trading", "entrystrategy"]),
  indicator: new Set(["trading", "indicator", "entry", "entrystrategy"]),
  priceaction: new Set(["trading", "entry", "entrystrategy"]),
  entrystrategy: new Set(["trademanagement"]),
  entry: new Set(["riskmanagement", "trademanagement"]),
  trading: new Set(["riskmanagement", "trademanagement"]),
  riskmanagement: new Set([]), // output-only
  trademanagement: new Set([]), // output-only
};

const CATEGORY_LABELS: Record<string, string> = {
  timing: "Filter/Timing",
  indicator: "Indicator",
  priceaction: "Price Action",
  entrystrategy: "Entry Strategy",
  entry: "Entry",
  trading: "Trade Execution",
  riskmanagement: "Risk Management",
  trademanagement: "Trade Management",
};

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
