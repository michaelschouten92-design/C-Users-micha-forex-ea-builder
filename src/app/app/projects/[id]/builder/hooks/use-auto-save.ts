import { useCallback, useEffect, useRef, useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";
import type { Node, Edge } from "@xyflow/react";
import type { BuilderNode, BuilderEdge, BuildJsonSchema } from "@/types/builder";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  projectId: string;
  nodes: Node[];
  edges: Edge[];
  initialData: BuildJsonSchema | null;
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  autoSaveStatus: AutoSaveStatus;
  hasUnsavedChanges: boolean;
  saveToServer: (isAutosave?: boolean) => Promise<boolean>;
  markAsSaved: () => void;
}

export function useAutoSave({
  projectId,
  nodes,
  edges,
  initialData,
  debounceMs = 5000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedStateRef = useRef<string>(
    JSON.stringify({ nodes: initialData?.nodes ?? [], edges: initialData?.edges ?? [] })
  );

  // Use refs to always have latest state in callbacks (prevents stale closures)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const initialDataRef = useRef(initialData);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  initialDataRef.current = initialData;

  // Check for unsaved changes
  const currentState = JSON.stringify({ nodes, edges });
  const hasUnsavedChanges = currentState !== savedStateRef.current;

  // Mark current state as saved
  const markAsSaved = useCallback(() => {
    savedStateRef.current = JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current });
  }, []);

  // Save to server - stable reference, reads latest state from refs
  const saveToServer = useCallback(
    async (isAutosave: boolean = false): Promise<boolean> => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const currentInitialData = initialDataRef.current;

      const buildJson: BuildJsonSchema = {
        version: "1.0",
        nodes: currentNodes as BuilderNode[],
        edges: currentEdges as BuilderEdge[],
        viewport: { x: 0, y: 0, zoom: 1 },
        metadata: {
          createdAt: currentInitialData?.metadata?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        settings: currentInitialData?.settings ?? {
          magicNumber: 123456,
          comment: "EA Builder Strategy",
          maxOpenTrades: 1,
          allowHedging: false,
        },
      };

      if (isAutosave) {
        setAutoSaveStatus("saving");
      }

      try {
        const res = await fetch(`/api/projects/${projectId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
          body: JSON.stringify({ buildJson }),
        });

        if (res.ok) {
          savedStateRef.current = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
          if (isAutosave) {
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus("idle"), 2000);
          }
          return true;
        } else {
          const error = await res.json();
          console.error("Save failed:", error);
          if (isAutosave) {
            setAutoSaveStatus("error");
            setTimeout(() => setAutoSaveStatus("idle"), 3000);
          } else {
            showError("Failed to save", "Please try again.");
          }
          return false;
        }
      } catch (error) {
        console.error("Save error:", error);
        if (isAutosave) {
          setAutoSaveStatus("error");
          setTimeout(() => setAutoSaveStatus("idle"), 3000);
        }
        return false;
      }
    },
    [projectId]
  );

  // Autosave effect
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (hasUnsavedChanges && nodes.length > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToServer(true);
      }, debounceMs);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, nodes.length, saveToServer, debounceMs]);

  return {
    autoSaveStatus,
    hasUnsavedChanges,
    saveToServer,
    markAsSaved,
  };
}
