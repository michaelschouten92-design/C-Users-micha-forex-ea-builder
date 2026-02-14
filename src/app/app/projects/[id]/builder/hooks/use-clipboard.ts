import { useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface ClipboardState {
  nodes: Node[];
  edges: Edge[];
}

interface UseClipboardOptions {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  getNextNodeId: (type: string) => string;
}

interface UseClipboardReturn {
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  duplicateSelectedNodes: () => void;
}

export function useClipboard({
  nodes,
  edges,
  setNodes,
  setEdges,
  getNextNodeId,
}: UseClipboardOptions): UseClipboardReturn {
  const clipboardRef = useRef<ClipboardState | null>(null);

  // Copy selected nodes
  const copySelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    // Only copy edges that connect selected nodes to each other
    const connectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );

    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(connectedEdges)),
    };
  }, [nodes, edges]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

    // Create ID mapping for new nodes
    const idMapping: Record<string, string> = {};
    const offset = { x: 50, y: 50 }; // Offset pasted nodes

    // Create new nodes with new IDs
    const newNodes: Node[] = copiedNodes.map((node) => {
      const newId = getNextNodeId(node.type || "node");
      idMapping[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        selected: true, // Select pasted nodes
        data: { ...node.data },
      };
    });

    // Create new edges with updated IDs
    const newEdges: Edge[] = copiedEdges.map((edge) => ({
      ...edge,
      id: `e-${idMapping[edge.source]}-${idMapping[edge.target]}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target],
    }));

    // Deselect all existing nodes and add new ones
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [setNodes, setEdges, getNextNodeId]);

  // Duplicate selected nodes (Ctrl+D shortcut)
  const duplicateSelectedNodes = useCallback(() => {
    copySelectedNodes();
    // Need to wait for clipboard to be set before pasting
    setTimeout(() => {
      if (clipboardRef.current && clipboardRef.current.nodes.length > 0) {
        const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

        const idMapping: Record<string, string> = {};
        const offset = { x: 50, y: 50 };

        const newNodes: Node[] = copiedNodes.map((node) => {
          const newId = getNextNodeId(node.type || "node");
          idMapping[node.id] = newId;
          return {
            ...node,
            id: newId,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
            selected: true,
            data: { ...node.data },
          };
        });

        const newEdges: Edge[] = copiedEdges.map((edge) => ({
          ...edge,
          id: `e-${idMapping[edge.source]}-${idMapping[edge.target]}`,
          source: idMapping[edge.source],
          target: idMapping[edge.target],
        }));

        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
      }
    }, 0);
  }, [copySelectedNodes, setNodes, setEdges, getNextNodeId]);

  return {
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
  };
}
