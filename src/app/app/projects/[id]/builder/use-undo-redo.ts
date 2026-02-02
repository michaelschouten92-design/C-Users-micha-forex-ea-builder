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

  // History stack
  const historyRef = useRef<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const historyIndexRef = useRef(0);

  // Force re-render when history changes
  const [, setRenderTrigger] = useState(0);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Take a snapshot of the current state
  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    // Remove any future history if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Don't add duplicate states
    const lastState = historyRef.current[historyRef.current.length - 1];
    const newStateStr = JSON.stringify({ nodes, edges });
    const lastStateStr = JSON.stringify(lastState);

    if (newStateStr === lastStateStr) {
      return;
    }

    // Add new state
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });

    // Trim history if too long
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current = historyRef.current.slice(-maxHistorySize);
    }

    historyIndexRef.current = historyRef.current.length - 1;
    setRenderTrigger((n) => n + 1);
  }, [maxHistorySize]);

  // Undo to previous state
  const undo = useCallback((): HistoryState | null => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setRenderTrigger((n) => n + 1);
      const state = historyRef.current[historyIndexRef.current];
      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    }
    return null;
  }, []);

  // Redo to next state
  const redo = useCallback((): HistoryState | null => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setRenderTrigger((n) => n + 1);
      const state = historyRef.current[historyIndexRef.current];
      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    }
    return null;
  }, []);

  // Reset history (e.g., when loading a new version)
  const resetHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    historyRef.current = [{
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    }];
    historyIndexRef.current = 0;
    setRenderTrigger((n) => n + 1);
  }, []);

  return {
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    historyLength: historyRef.current.length,
    currentIndex: historyIndexRef.current,
  };
}
