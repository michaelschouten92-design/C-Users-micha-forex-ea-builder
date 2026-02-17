import { useCallback, useRef, useState } from "react";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import { validateConnection } from "../connection-validation";
import type { BuilderNodeData } from "@/types/builder";

const EDGE_LABEL_STYLE = { fill: "#1A0626", color: "#94A3B8", fontSize: 11, fontWeight: 500 };
const EDGE_LABEL_BG_STYLE = { fill: "#1A0626", stroke: "rgba(79,70,229,0.3)" };
const EDGE_LABEL_BG_PADDING: [number, number] = [4, 8];

const CATEGORY_LABELS: Record<string, string> = {
  entrystrategy: "signal",
  timing: "when",
  trademanagement: "manage",
  riskmanagement: "risk",
  indicator: "filter",
  priceaction: "filter",
  entry: "entry",
  trading: "trade",
};

function getLabelForCategory(category: string | undefined): string {
  return category ? (CATEGORY_LABELS[category] ?? "flow") : "flow";
}

/** Add descriptive labels to edges based on the source node's category. */
export function addEdgeLabels(edges: Edge[], nodes: Node<BuilderNodeData>[]): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const label = getLabelForCategory(sourceNode?.data?.category);
    return {
      ...edge,
      label,
      labelStyle: EDGE_LABEL_STYLE,
      labelBgStyle: EDGE_LABEL_BG_STYLE,
      labelBgPadding: EDGE_LABEL_BG_PADDING,
    };
  });
}

interface UseConnectionValidationOptions {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onConnected?: (nodes: Node<BuilderNodeData>[], edges: Edge[]) => void;
}

interface UseConnectionValidationReturn {
  connectionError: string | null;
  dismissConnectionError: () => void;
  isValidConnection: (connection: Connection | Edge) => boolean;
  onConnect: (params: Connection) => void;
}

export function useConnectionValidation({
  nodes,
  edges,
  setEdges,
  onConnected,
}: UseConnectionValidationOptions): UseConnectionValidationReturn {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show connection error temporarily
  const showConnectionError = useCallback((message: string) => {
    // Clear existing timeout
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
    }
    setConnectionError(message);
    connectionErrorTimeoutRef.current = setTimeout(() => {
      setConnectionError(null);
    }, 5000);
  }, []);

  // Validate connection before allowing it
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Ensure we have the required connection properties
      if (!connection.source || !connection.target) {
        return false;
      }
      const conn: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      };
      const validation = validateConnection(conn, nodes, edges);
      return validation.isValid;
    },
    [nodes, edges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const validation = validateConnection(params, nodes, edges);

      if (!validation.isValid) {
        showConnectionError(validation.reason || "Invalid connection");
        return;
      }

      setEdges((eds) => {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const label = getLabelForCategory(sourceNode?.data?.category);
        const newEdges = addEdge(
          {
            ...params,
            animated: true,
            label,
            labelStyle: EDGE_LABEL_STYLE,
            labelBgStyle: EDGE_LABEL_BG_STYLE,
            labelBgPadding: EDGE_LABEL_BG_PADDING,
          },
          eds
        );
        if (onConnected) {
          queueMicrotask(() => onConnected(nodes, newEdges));
        }
        return newEdges;
      });
    },
    [nodes, edges, setEdges, showConnectionError, onConnected]
  );

  const dismissConnectionError = useCallback(() => {
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
    }
    setConnectionError(null);
  }, []);

  return {
    connectionError,
    dismissConnectionError,
    isValidConnection,
    onConnect,
  };
}
