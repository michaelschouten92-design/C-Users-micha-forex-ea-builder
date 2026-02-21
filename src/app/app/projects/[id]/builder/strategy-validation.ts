import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData, BuildJsonSettings } from "@/types/builder";

export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  nodeType?: string;
  nodeId?: string;
  /** Human-readable label of the node with the issue */
  nodeLabel?: string;
  /** Which field on the node is invalid */
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canExport: boolean;
  issues: ValidationIssue[];
  issuesByNodeId: Record<string, ValidationIssue[]>;
  summary: {
    hasTiming: boolean;
    hasSignalNode: boolean;
  };
}

export function validateStrategy(
  nodes: Node<BuilderNodeData>[],
  edges: Edge[] = [],
  settings?: BuildJsonSettings
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Max nodes check
  if (nodes.length > 50) {
    issues.push({
      type: "error",
      message: `Too many blocks (${nodes.length}). Maximum is 50.`,
    });
  }

  // Check for timing block
  const hasTiming = nodes.some((n) => "timingType" in n.data);

  // Check for signal nodes (indicators, price action, or trading nodes)
  const hasSignalNode = nodes.some(
    (n) => "indicatorType" in n.data || "priceActionType" in n.data || "tradingType" in n.data
  );

  // Timing is optional — without it, the strategy trades whenever conditions are met

  // Validate timing nodes
  for (const n of nodes) {
    const d = n.data as Record<string, unknown>;
    if (!("timingType" in d)) continue;
    const label = (d.label as string) ?? n.type ?? "Timing";

    // Custom trading session: start != end
    if (
      d.timingType === "trading-session" &&
      d.session === "CUSTOM" &&
      typeof d.customStartHour === "number" &&
      typeof d.customStartMinute === "number" &&
      typeof d.customEndHour === "number" &&
      typeof d.customEndMinute === "number" &&
      d.customStartHour === d.customEndHour &&
      d.customStartMinute === d.customEndMinute
    ) {
      issues.push({
        type: "warning",
        message: `"${label}": Start and end time are identical -- session window is empty. Set different start/end hours.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "customStartHour",
      });
    }
  }

  // --- Fix 5b: Disconnected indicator/priceaction nodes (not connected to anything)
  if (edges.length > 0) {
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
    for (const n of nodes) {
      const d = n.data as Record<string, unknown>;
      const isIndicator = "indicatorType" in d;
      const isPriceAction = "priceActionType" in d;
      if ((isIndicator || isPriceAction) && !connectedNodeIds.has(n.id)) {
        const label = (d.label as string) ?? n.type ?? "Node";
        issues.push({
          type: "warning",
          message: `"${label}" is not connected to anything and will be ignored during code generation. Wire it to an entry or remove it.`,
          nodeType: n.type,
          nodeId: n.id,
          nodeLabel: label,
        });
      }
    }
  }

  // --- Fix 5c: Disconnected clusters (BFS islands)
  if (nodes.length > 1 && edges.length > 0) {
    // Build undirected adjacency
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) {
      adj.set(n.id, new Set());
    }
    for (const edge of edges) {
      adj.get(edge.source)?.add(edge.target);
      adj.get(edge.target)?.add(edge.source);
    }

    // BFS from the first node
    const visited = new Set<string>();
    const queue = [nodes[0].id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adj.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
    }

    // Check for nodes not in the main cluster (exclude isolated nodes, already warned above)
    const disconnectedCluster = nodes.filter(
      (n) => !visited.has(n.id) && edges.some((e) => e.source === n.id || e.target === n.id)
    );
    if (disconnectedCluster.length > 0) {
      issues.push({
        type: "warning",
        message: `Your strategy has ${disconnectedCluster.length} block(s) in a separate disconnected group. Connect them to the main strategy or remove them.`,
      });
    }
  }

  // Settings validation
  if (settings) {
    if (settings.maxOpenTrades > 10) {
      issues.push({
        type: "warning",
        message: `Max ${settings.maxOpenTrades} open trades is unusually high`,
      });
    }

    if (settings.maxTradesPerDay && settings.maxTradesPerDay > 50) {
      issues.push({
        type: "warning",
        message: `Max ${settings.maxTradesPerDay} trades per day is very high`,
      });
    }

    if (settings.maxDailyLossPercent && settings.maxDailyLossPercent > 20) {
      issues.push({
        type: "warning",
        message: `Daily loss limit of ${settings.maxDailyLossPercent}% is very high`,
      });
    }
  }

  // Build issuesByNodeId map
  const issuesByNodeId: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    if (issue.nodeId) {
      (issuesByNodeId[issue.nodeId] ??= []).push(issue);
    }
  }

  // Calculate if strategy can be exported (no errors)
  const hasErrors = issues.some((i) => i.type === "error");
  const canExport = !hasErrors && nodes.length > 0;

  return {
    isValid: issues.length === 0,
    canExport,
    issues,
    issuesByNodeId,
    summary: {
      hasTiming,
      hasSignalNode,
    },
  };
}
