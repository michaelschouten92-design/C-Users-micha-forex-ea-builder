/* eslint-disable react-hooks/refs */
import { useCallback, useEffect, useRef, useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";
import type { Node, Edge } from "@xyflow/react";
import type { BuilderNode, BuilderEdge, BuildJsonSchema, BuildJsonSettings } from "@/types/builder";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  projectId: string;
  nodes: Node[];
  edges: Edge[];
  initialData: BuildJsonSchema | null;
  settings?: BuildJsonSettings;
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
  settings,
  debounceMs = 5000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedVersionRef = useRef<number>(0);

  // Use refs to always have latest state in callbacks (prevents stale closures)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const initialDataRef = useRef(initialData);
  const settingsRef = useRef(settings);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  initialDataRef.current = initialData;
  settingsRef.current = settings;

  // Track unsaved changes via a counter instead of JSON.stringify every render.
  // changeCounter increments when nodes/edges array references change (React Flow
  // creates new arrays on any mutation). savedCounterRef tracks the last saved value.
  const changeCounterRef = useRef(0);
  const savedCounterRef = useRef(0);
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  const prevSettingsRef = useRef(settings);

  if (
    nodes !== prevNodesRef.current ||
    edges !== prevEdgesRef.current ||
    settings !== prevSettingsRef.current
  ) {
    changeCounterRef.current += 1;
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;
    prevSettingsRef.current = settings;
  }

  const hasUnsavedChanges = changeCounterRef.current !== savedCounterRef.current;

  // Mark current state as saved
  const markAsSaved = useCallback(() => {
    savedCounterRef.current = changeCounterRef.current;
  }, []);

  // Save to server - stable reference, reads latest state from refs
  const saveToServer = useCallback(
    async (isAutosave: boolean = false): Promise<boolean> => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const currentInitialData = initialDataRef.current;
      const currentSettings = settingsRef.current;

      const buildJson: BuildJsonSchema = {
        version: "1.0",
        nodes: currentNodes as BuilderNode[],
        edges: currentEdges as BuilderEdge[],
        viewport: { x: 0, y: 0, zoom: 1 },
        metadata: {
          createdAt: currentInitialData?.metadata?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        settings: currentSettings ??
          currentInitialData?.settings ?? {
            magicNumber: 123456,
            comment: "EA Builder Strategy",
            maxOpenTrades: 1,
            allowHedging: false,
            maxTradesPerDay: 0,
          },
      };

      if (isAutosave) {
        setAutoSaveStatus("saving");
      }

      try {
        const res = await fetch(`/api/projects/${projectId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
          body: JSON.stringify({
            buildJson,
            expectedVersion: lastSavedVersionRef.current || undefined,
            isAutosave,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          lastSavedVersionRef.current = data.versionNo;
          savedCounterRef.current = changeCounterRef.current;
          if (isAutosave) {
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus("idle"), 2000);
          }
          return true;
        } else {
          const error = await res.json();
          console.error("Save failed:", error);

          // On version conflict, update our tracked version and retry
          if (res.status === 409 && error.currentVersion) {
            lastSavedVersionRef.current = error.currentVersion;
          }

          if (isAutosave) {
            setAutoSaveStatus("error");
            setTimeout(() => setAutoSaveStatus("idle"), 3000);
          } else {
            showError(
              res.status === 409 ? "Version conflict" : "Failed to save",
              res.status === 409
                ? "Another save was detected. Try saving again."
                : "Please try again."
            );
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

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    autoSaveStatus,
    hasUnsavedChanges,
    saveToServer,
    markAsSaved,
  };
}
