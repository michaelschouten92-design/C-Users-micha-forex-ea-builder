import { useCallback, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo(
  initialNodes: Node[],
  initialEdges: Edge[],
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50 } = options;

  // History stack (ref to avoid re-renders on every snapshot)
  const historyRef = useRef<HistoryState[]>([{ nodes: initialNodes, edges: initialEdges }]);
  // Index ref for use inside callbacks only
  const indexRef = useRef(0);

  // State mirrors of index/length so canUndo/canRedo are reactive without ref access during render
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  // Take a snapshot of the current state
  const takeSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      // Remove any future history if we're not at the end
      if (indexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      }

      // Don't add duplicate states — lightweight check instead of full JSON.stringify
      const lastState = historyRef.current[historyRef.current.length - 1];
      if (
        lastState &&
        lastState.nodes.length === nodes.length &&
        lastState.edges.length === edges.length &&
        lastState.nodes.every(
          (n, i) =>
            n.id === nodes[i].id &&
            n.position.x === nodes[i].position.x &&
            n.position.y === nodes[i].position.y
        )
      ) {
        return;
      }

      // Add new state using structuredClone (faster than JSON roundtrip)
      historyRef.current.push({
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      });

      // Trim history if too long
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current = historyRef.current.slice(-maxHistorySize);
      }

      indexRef.current = historyRef.current.length - 1;
      setHistoryIndex(indexRef.current);
      setHistoryLength(historyRef.current.length);
    },
    [maxHistorySize]
  );

  // Undo to previous state
  const undo = useCallback((): HistoryState | null => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      setHistoryIndex(indexRef.current);
      const state = historyRef.current[indexRef.current];
      return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
      };
    }
    return null;
  }, []);

  // Redo to next state
  const redo = useCallback((): HistoryState | null => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      setHistoryIndex(indexRef.current);
      const state = historyRef.current[indexRef.current];
      return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
      };
    }
    return null;
  }, []);

  // Reset history (e.g., when loading a new version)
  const resetHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    historyRef.current = [
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      },
    ];
    indexRef.current = 0;
    setHistoryIndex(0);
    setHistoryLength(1);
  }, []);

  return {
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    historyLength,
    currentIndex: historyIndex,
  };
}
