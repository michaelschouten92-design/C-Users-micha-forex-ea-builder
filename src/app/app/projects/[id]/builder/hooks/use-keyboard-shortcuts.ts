import { useEffect, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";

interface UndoRedoState {
  nodes: Node[];
  edges: Edge[];
}

interface UseKeyboardShortcutsOptions {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  undo: () => UndoRedoState | null;
  redo: () => UndoRedoState | null;
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  duplicateSelectedNodes: () => void;
  onUndoRedo: () => void; // Called to skip snapshot after undo/redo
  onSave?: () => void; // Called on Ctrl+S
}

export function useKeyboardShortcuts({
  nodes,
  setNodes,
  setEdges,
  undo,
  redo,
  copySelectedNodes,
  pasteNodes,
  duplicateSelectedNodes,
  onUndoRedo,
  onSave,
}: UseKeyboardShortcutsOptions): void {
  // Handle deletion of selected nodes
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length > 0) {
      const selectedIds = selectedNodes.map((n) => n.id);
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) =>
        eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target))
      );
    }
  }, [nodes, setNodes, setEdges]);

  // Keyboard event handler for Delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace is pressed and no input is focused
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)
      ) {
        event.preventDefault();
        deleteSelectedNodes();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes]);

  // Keyboard shortcuts for undo/redo/copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        const state = undo();
        if (state) {
          onUndoRedo();
          setNodes(state.nodes);
          setEdges(state.edges);
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if (
        ((event.ctrlKey || event.metaKey) && event.key === "y") ||
        ((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        const state = redo();
        if (state) {
          onUndoRedo();
          setNodes(state.nodes);
          setEdges(state.edges);
        }
      }

      // Ctrl+C or Cmd+C for copy
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        event.preventDefault();
        copySelectedNodes();
      }

      // Ctrl+V or Cmd+V for paste
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        pasteNodes();
      }

      // Ctrl+D or Cmd+D for duplicate
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        duplicateSelectedNodes();
      }

      // Ctrl+S or Cmd+S for save
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        onSave?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setNodes, setEdges, copySelectedNodes, pasteNodes, duplicateSelectedNodes, onUndoRedo, onSave]);
}
