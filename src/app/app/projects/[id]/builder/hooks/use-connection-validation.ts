import { useCallback, useRef, useState } from "react";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import { validateConnection } from "../connection-validation";
import type { BuilderNodeData } from "@/types/builder";

interface UseConnectionValidationOptions {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

interface UseConnectionValidationReturn {
  connectionError: string | null;
  isValidConnection: (connection: Connection | Edge) => boolean;
  onConnect: (params: Connection) => void;
}

export function useConnectionValidation({
  nodes,
  edges,
  setEdges,
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
    }, 3000);
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

      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [nodes, edges, setEdges, showConnectionError]
  );

  return {
    connectionError,
    isValidConnection,
    onConnect,
  };
}
