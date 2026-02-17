import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";
import type { Node, Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { BuilderNode, BuilderEdge, BuildJsonSchema, BuildJsonSettings } from "@/types/builder";
import { CURRENT_VERSION } from "@/lib/migrations";

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
  const { getViewport } = useReactFlow();

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

  // Guard against concurrent saves — with pending retry when skipped
  const savingRef = useRef(false);
  const pendingAutoSaveRef = useRef(false);

  // Save to server - stable reference, reads latest state from refs
  const saveToServer = useCallback(
    async (isAutosave: boolean = false): Promise<boolean> => {
      if (savingRef.current) {
        // Mark that an autosave was requested while busy, so we retry after
        if (isAutosave) pendingAutoSaveRef.current = true;
        return false;
      }
      savingRef.current = true;
      try {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const currentInitialData = initialDataRef.current;
        const currentSettings = settingsRef.current;

        const buildJson: BuildJsonSchema = {
          version: CURRENT_VERSION,
          nodes: currentNodes as BuilderNode[],
          edges: currentEdges as BuilderEdge[],
          viewport: getViewport(),
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
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const res = await fetch(`/api/projects/${projectId}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            body: JSON.stringify({
              buildJson,
              expectedVersion: lastSavedVersionRef.current || undefined,
              isAutosave,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

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
            let error: Record<string, unknown> = {};
            try {
              error = await res.json();
            } catch {
              // Response may not be valid JSON (e.g., proxy error page)
            }
            Sentry.captureMessage(`Save failed: ${res.status}`, { level: "error", extra: error });

            // On version conflict, update version and retry once
            if (res.status === 409 && error.currentVersion) {
              lastSavedVersionRef.current = error.currentVersion as number;
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
              const retryRes = await fetch(`/api/projects/${projectId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                body: JSON.stringify({
                  buildJson,
                  expectedVersion: lastSavedVersionRef.current || undefined,
                  isAutosave,
                }),
                signal: retryController.signal,
              });
              clearTimeout(retryTimeoutId);
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                lastSavedVersionRef.current = retryData.versionNo;
                savedCounterRef.current = changeCounterRef.current;
                if (isAutosave) {
                  setAutoSaveStatus("saved");
                  setTimeout(() => setAutoSaveStatus("idle"), 2000);
                }
                return true;
              }
            }

            if (isAutosave) {
              setAutoSaveStatus("error");
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
          Sentry.captureException(error);
          if (isAutosave) {
            setAutoSaveStatus("error");
          }
          return false;
        }
      } finally {
        savingRef.current = false;
        // If an autosave was requested while we were busy, retry now
        if (pendingAutoSaveRef.current) {
          pendingAutoSaveRef.current = false;
          setTimeout(() => saveToServer(true), 500);
        }
      }
    },
    [projectId, getViewport]
  );

  // Autosave with retry on failure
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 3;
  const saveToServerRef = useRef(saveToServer);
  saveToServerRef.current = saveToServer;

  const attemptAutoSave = useCallback(async () => {
    const success = await saveToServerRef.current(true);
    if (!success && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const backoff = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
      retryTimerRef.current = setTimeout(() => attemptAutoSave(), backoff);
    } else if (success) {
      retryCountRef.current = 0;
    }
  }, []);

  // Autosave effect
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (hasUnsavedChanges && nodes.length > 0) {
      retryCountRef.current = 0;
      autoSaveTimeoutRef.current = setTimeout(() => {
        attemptAutoSave();
      }, debounceMs);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, nodes.length, attemptAutoSave, debounceMs]);

  // Warn user before leaving with unsaved changes (tab close / refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Warn user on browser back/forward button with unsaved changes
  const unsavedRef = useRef(hasUnsavedChanges);
  unsavedRef.current = hasUnsavedChanges;
  useEffect(() => {
    let navigatingAway = false;
    // Push a sentinel state so popstate fires when the user presses back
    history.pushState({ builder: true }, "");
    const handlePopState = () => {
      if (navigatingAway) return;
      if (unsavedRef.current) {
        const leave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
        if (!leave) {
          // Re-push so the guard stays active
          history.pushState({ builder: true }, "");
          return;
        }
      }
      // Actually go back — set flag to prevent recursive popstate
      navigatingAway = true;
      history.back();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    autoSaveStatus,
    hasUnsavedChanges,
    saveToServer,
    markAsSaved,
  };
}
