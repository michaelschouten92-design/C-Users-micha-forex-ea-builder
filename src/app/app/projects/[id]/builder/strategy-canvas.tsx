"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodeToolbar } from "./node-toolbar";
import { PropertiesPanel } from "./properties-panel";
import { VersionControls } from "./version-controls";
import { ValidationStatus } from "./validation-status";
import { validateStrategy } from "./strategy-validation";
import { StrategySummary } from "./strategy-summary";
import { useUndoRedo } from "./use-undo-redo";
import { PanelErrorBoundary } from "./error-boundary";
import { WelcomeModal } from "./welcome-modal";
import {
  useAutoSave,
  useClipboard,
  useKeyboardShortcuts,
  useConnectionValidation,
  useOnlineStatus,
} from "./hooks";
import type {
  BuilderNode,
  BuilderNodeData,
  BuilderNodeType,
  BuildJsonSchema,
  BuildJsonSettings,
  NodeTemplate,
} from "@/types/builder";
import { DEFAULT_SETTINGS } from "@/types/builder";
import { STRATEGY_PRESETS, type StrategyPreset } from "@/lib/strategy-presets";
import { apiClient } from "@/lib/api-client";

interface StrategyCanvasProps {
  projectId: string;
  initialData: BuildJsonSchema | null;
  canExportMQL5?: boolean;
  isPro?: boolean;
  userTier?: string;
}

let nodeIdCounter = 0;

export function StrategyCanvas({
  projectId,
  initialData,
  canExportMQL5 = false,
  isPro = false,
  userTier,
}: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  // Panel collapse state
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Strategy settings state
  const [settings, setSettings] = useState<BuildJsonSettings>(
    initialData?.settings ?? { ...DEFAULT_SETTINGS }
  );

  const [nodes, setNodes, onNodesChange] = useNodesState((initialData?.nodes as Node[]) ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState((initialData?.edges as Edge[]) ?? []);

  // Undo/Redo history
  const { takeSnapshot, undo, redo, resetHistory, canUndo, canRedo } = useUndoRedo(
    (initialData?.nodes as Node[]) ?? [],
    (initialData?.edges as Edge[]) ?? []
  );

  // Track previous state for snapshot detection (lightweight signature instead of JSON.stringify)
  const prevStateRef = useRef<string>(
    `${(initialData?.nodes ?? []).length}-${(initialData?.edges ?? []).length}-${(initialData?.nodes ?? [])[0]?.id ?? ""}`
  );

  // Flag to skip snapshot after undo/redo
  const skipSnapshotRef = useRef(false);

  // Take snapshot when nodes or edges change significantly
  useEffect(() => {
    // Skip snapshot if this change came from undo/redo
    if (skipSnapshotRef.current) {
      skipSnapshotRef.current = false;
      // Use lightweight signature: count + first node id + positions of first few nodes
      const posKey = nodes
        .slice(0, 3)
        .map((n) => `${n.position.x.toFixed(0)},${n.position.y.toFixed(0)}`)
        .join("|");
      prevStateRef.current = `${nodes.length}-${edges.length}-${nodes[0]?.id ?? ""}-${posKey}`;
      return;
    }

    const posKey = nodes
      .slice(0, 3)
      .map((n) => `${n.position.x.toFixed(0)},${n.position.y.toFixed(0)}`)
      .join("|");
    const currentState = `${nodes.length}-${edges.length}-${nodes[0]?.id ?? ""}-${posKey}`;
    if (currentState !== prevStateRef.current) {
      // Debounce snapshot to avoid too many history entries during dragging
      const timeout = setTimeout(() => {
        takeSnapshot(nodes, edges);
        prevStateRef.current = currentState;
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [nodes, edges, takeSnapshot]);

  // Auto-save hook
  const { autoSaveStatus, hasUnsavedChanges, saveToServer, markAsSaved } = useAutoSave({
    projectId,
    nodes,
    edges,
    initialData,
    settings,
    debounceMs: 5000,
  });

  // Get current buildJson for save-as-template
  const getBuildJson = useCallback(
    (): BuildJsonSchema => ({
      version: "1.0",
      nodes: nodes as BuilderNode[],
      edges: edges as unknown as BuildJsonSchema["edges"],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: {
        createdAt: initialData?.metadata?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      settings,
    }),
    [nodes, edges, settings, initialData]
  );

  // Helper to generate unique node IDs
  const getNextNodeId = useCallback((type: string) => {
    return `${type}-${++nodeIdCounter}`;
  }, []);

  // Clipboard hook
  const { copySelectedNodes, pasteNodes, duplicateSelectedNodes } = useClipboard({
    nodes,
    edges,
    setNodes,
    setEdges,
    getNextNodeId,
  });

  // Connection validation hook
  const { connectionError, dismissConnectionError, isValidConnection, onConnect } =
    useConnectionValidation({
      nodes: nodes as Node<BuilderNodeData>[],
      edges,
      setEdges,
    });

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    nodes,
    setNodes,
    setEdges,
    undo,
    redo,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    onUndoRedo: () => {
      skipSnapshotRef.current = true;
    },
    onSave: () => {
      saveToServer(false);
    },
  });

  // Online/offline detection
  const isOnline = useOnlineStatus();

  // Keyboard shortcut: Shift+? to open shortcuts modal
  useEffect(() => {
    const handleShortcutHelp = (e: KeyboardEvent) => {
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", handleShortcutHelp);
    return () => window.removeEventListener("keydown", handleShortcutHelp);
  }, []);

  // Handle node duplication from base-node button (use ref to avoid re-registering on every node change)
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  useEffect(() => {
    const handleDuplicate = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      const sourceNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!sourceNode) return;

      const newNode: Node = {
        ...sourceNode,
        id: getNextNodeId(sourceNode.type as string),
        position: { x: sourceNode.position.x + 50, y: sourceNode.position.y + 50 },
        data: { ...sourceNode.data },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
    };
    window.addEventListener("node-duplicate", handleDuplicate);
    return () => window.removeEventListener("node-duplicate", handleDuplicate);
  }, [setNodes, getNextNodeId]);

  // Selected node for properties panel
  const selectedNode = nodes.find((n) => n.selected) ?? null;

  // Validate strategy (memoized to avoid recalculating on every render)
  const validation = useMemo(
    () => validateStrategy(nodes as Node<BuilderNodeData>[], edges),
    [nodes, edges]
  );

  // Handle drag start from toolbar
  const onDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(template));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  // Handle drop on canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Entry strategy drop error
  const [entryStrategyError, setEntryStrategyError] = useState<string | null>(null);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      const template: NodeTemplate = JSON.parse(data);

      // Enforce: only one entry strategy block on canvas
      if (template.defaultData && "entryType" in template.defaultData) {
        const hasExisting = nodes.some((n) => n.data && "entryType" in n.data);
        if (hasExisting) {
          setEntryStrategyError("Only one entry strategy allowed. Remove the current one first.");
          setTimeout(() => setEntryStrategyError(null), 4000);
          return;
        }
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: BuilderNode = {
        id: getNextNodeId(template.type),
        type: template.type as BuilderNodeType,
        position,
        data: { ...template.defaultData } as BuilderNodeData,
      };

      setNodes((nds) => [...nds, newNode as Node]);
    },
    [screenToFlowPosition, setNodes, getNextNodeId, nodes]
  );

  // Handle node data changes from properties panel
  const onNodeChange = useCallback(
    (nodeId: string, updates: Partial<BuilderNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...updates },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Handle node deletion
  const onNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Manual save handler
  const onSave = useCallback(async (): Promise<void> => {
    const success = await saveToServer(false);
    if (success) {
      markAsSaved();
    }
  }, [saveToServer, markAsSaved]);

  // Load a specific version (now receives cached buildJson, no extra fetch needed)
  const onLoad = useCallback(
    (versionId: string, buildJson: BuildJsonSchema) => {
      setNodes(buildJson.nodes as Node[]);
      setEdges(buildJson.edges as Edge[]);

      if (buildJson.viewport) {
        setViewport(buildJson.viewport);
      }

      // Reset history when loading a new version
      resetHistory(buildJson.nodes as Node[], buildJson.edges as Edge[]);
    },
    [setNodes, setEdges, setViewport, resetHistory]
  );

  // User saved templates
  interface UserTemplate {
    id: string;
    name: string;
    buildJson: BuildJsonSchema;
  }
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);

  useEffect(() => {
    if (nodes.length > 0) return;
    apiClient
      .get<UserTemplate[]>("/api/templates")
      .then((data) => setUserTemplates(data))
      .catch((err) => console.warn("Failed to load templates:", err));
  }, [nodes.length]);

  // Load buildJson onto canvas (shared by presets and user templates)
  const loadBuildJson = useCallback(
    (buildJson: BuildJsonSchema) => {
      setNodes(buildJson.nodes as Node[]);
      setEdges(buildJson.edges as Edge[]);
      setSettings(buildJson.settings ?? { ...DEFAULT_SETTINGS });

      if (buildJson.viewport) {
        setViewport(buildJson.viewport);
      }

      resetHistory(buildJson.nodes as Node[], buildJson.edges as Edge[]);
    },
    [setNodes, setEdges, setSettings, setViewport, resetHistory]
  );

  // Load a template preset
  const onLoadTemplate = useCallback(
    (preset: StrategyPreset) => {
      loadBuildJson(preset.buildJson);
    },
    [loadBuildJson]
  );

  // Undo handler for button
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      skipSnapshotRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [undo, setNodes, setEdges]);

  // Redo handler for button
  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      skipSnapshotRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [redo, setNodes, setEdges]);

  return (
    <div className="h-full flex flex-col">
      {/* Skip navigation links for keyboard users */}
      <a
        href="#builder-canvas"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#4F46E5] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to canvas
      </a>
      <a
        href="#properties-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#4F46E5] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to properties
      </a>
      <WelcomeModal />
      <div className="flex-1 flex min-h-0">
        {/* Left: Node Toolbar - hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <NodeToolbar
            onDragStart={onDragStart}
            isPro={isPro}
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>

        {/* Mobile toolbar overlay */}
        {mobileToolbarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-[240px] h-full shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
              <NodeToolbar
                onDragStart={onDragStart}
                isPro={isPro}
                onClose={() => setMobileToolbarOpen(false)}
                settings={settings}
                onSettingsChange={setSettings}
              />
            </div>
            <div className="flex-1" onClick={() => setMobileToolbarOpen(false)} />
          </div>
        )}

        {/* Center: React Flow Canvas */}
        <div id="builder-canvas" ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#4F46E5", strokeWidth: 2 },
            }}
            selectNodesOnDrag={false}
          >
            <Background gap={15} size={1} color="rgba(79, 70, 229, 0.15)" />
            <Controls />
            {showMiniMap && (
              <MiniMap
                nodeStrokeColor="rgba(79, 70, 229, 0.5)"
                nodeColor="rgba(79, 70, 229, 0.3)"
                maskColor="rgba(15, 23, 42, 0.8)"
                className="hidden sm:block"
                style={{
                  backgroundColor: "#1A0626",
                  border: "1px solid rgba(79,70,229,0.2)",
                  borderRadius: "8px",
                }}
              />
            )}
          </ReactFlow>

          {/* Empty canvas: Template cards on the right */}
          {nodes.length === 0 && (
            <div
              className="absolute top-4 right-4 z-10 w-[260px] space-y-3"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-1">
                <h3 className="text-sm font-semibold text-white">Start from a template</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Or drag blocks from the left panel</p>
              </div>
              {STRATEGY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onLoadTemplate(preset)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#1A0626]/90 backdrop-blur-sm border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] hover:bg-[#1A0626] hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#C4B5FD] group-hover:text-white transition-colors">
                      {preset.name}
                    </span>
                    <svg
                      className="w-4 h-4 text-[#64748B] group-hover:text-[#4F46E5] transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{preset.description}</p>
                </button>
              ))}

              {/* User saved templates */}
              {userTemplates.length > 0 && (
                <>
                  <div className="px-1 pt-2">
                    <h3 className="text-sm font-semibold text-white">Your templates</h3>
                  </div>
                  {userTemplates.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <button
                        onClick={() => loadBuildJson(t.buildJson)}
                        className="flex-1 text-left px-4 py-3 rounded-xl bg-[#1A0626]/90 backdrop-blur-sm border border-[rgba(34,211,238,0.15)] hover:border-[rgba(34,211,238,0.4)] hover:bg-[#1A0626] hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#22D3EE] group-hover:text-white transition-colors">
                            {t.name}
                          </span>
                          <svg
                            className="w-4 h-4 text-[#64748B] group-hover:text-[#22D3EE] transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          apiClient
                            .delete(`/api/templates?id=${t.id}`)
                            .then(() =>
                              setUserTemplates((prev) => prev.filter((ut) => ut.id !== t.id))
                            )
                            .catch(() => {});
                        }}
                        className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200 flex-shrink-0"
                        title="Delete template"
                        aria-label="Delete template"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Mobile: Floating button to open blocks toolbar */}
          <button
            onClick={() => setMobileToolbarOpen(true)}
            className="md:hidden absolute top-4 left-4 z-10 p-3 bg-[#4F46E5] text-white rounded-xl shadow-[0_4px_16px_rgba(79,70,229,0.4)] hover:bg-[#6366F1] transition-all duration-200"
            title="Open blocks"
            aria-label="Open blocks toolbar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>

          {/* Autosave error banner */}
          {autoSaveStatus === "error" && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#7F1D1D] text-white px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center gap-3 border border-red-500/30 max-w-[90vw]"
            >
              <svg
                className="w-5 h-5 flex-shrink-0 text-[#FCA5A5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium">
                Autosave failed — your changes are not saved
              </span>
              <button
                onClick={() => saveToServer(false)}
                className="px-3 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-md transition-colors flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Offline warning banner */}
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#78350F] text-white px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center gap-3 border border-amber-500/30 max-w-[90vw]"
            >
              <svg
                className="w-5 h-5 flex-shrink-0 text-[#FCD34D]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414"
                />
              </svg>
              <span className="text-sm font-medium">
                You are offline — changes won&apos;t be saved until you reconnect
              </span>
            </div>
          )}

          {/* Connection error toast */}
          {connectionError && (
            <div
              role="alert"
              onClick={dismissConnectionError}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#DC2626] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center gap-2 border border-red-400/30 max-w-[90vw] cursor-pointer hover:bg-[#B91C1C] transition-colors"
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">{connectionError}</span>
              <svg
                className="w-4 h-4 flex-shrink-0 opacity-60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}

          {/* Entry strategy duplicate error toast */}
          {entryStrategyError && (
            <div
              role="alert"
              onClick={() => setEntryStrategyError(null)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#DC2626] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center gap-2 border border-red-400/30 max-w-[90vw] cursor-pointer hover:bg-[#B91C1C] transition-colors"
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">{entryStrategyError}</span>
            </div>
          )}

          {/* Validation Status - top right overlay */}
          {nodes.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <ValidationStatus validation={validation} />
            </div>
          )}

          {/* Floating Undo/Redo + Help buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 bg-[#1E293B] text-white rounded-lg border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              title="Undo (Ctrl+Z)"
              aria-label="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 bg-[#1E293B] text-white rounded-lg border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              title="Redo (Ctrl+Y)"
              aria-label="Redo (Ctrl+Y)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`hidden sm:block p-2 rounded-lg border transition-all duration-200 shadow-lg ${showMiniMap ? "bg-[rgba(79,70,229,0.3)] text-white border-[rgba(79,70,229,0.5)]" : "bg-[#1E293B] text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] hover:text-white"}`}
              title={showMiniMap ? "Hide minimap" : "Show minimap"}
              aria-label={showMiniMap ? "Hide minimap" : "Show minimap"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 bg-[#1E293B] text-[#94A3B8] rounded-lg border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] hover:text-white transition-all duration-200 shadow-lg"
              title="Keyboard shortcuts (Shift+?)"
              aria-label="Keyboard shortcuts (Shift+?)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>

          {/* Keyboard Shortcuts Modal */}
          {showShortcuts && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowShortcuts(false)}
            >
              <div
                className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
                  <button
                    onClick={() => setShowShortcuts(false)}
                    className="text-[#64748B] hover:text-white p-1 transition-colors"
                    aria-label="Close shortcuts"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    ["Ctrl + Z", "Undo"],
                    ["Ctrl + Y", "Redo"],
                    ["Ctrl + C", "Copy selected nodes"],
                    ["Ctrl + V", "Paste nodes"],
                    ["Ctrl + D", "Duplicate selected"],
                    ["Ctrl + S", "Save"],
                    ["Delete", "Delete selected nodes"],
                    ["Shift + ?", "Show this dialog"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-[#94A3B8]">{desc}</span>
                      <kbd className="px-2.5 py-1 text-xs font-mono bg-[#1E293B] text-[#CBD5E1] rounded border border-[rgba(79,70,229,0.3)]">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Properties Panel - overlay on mobile, side panel on md+ */}
        {/* Desktop side panel */}
        <div
          id="properties-panel"
          className={`hidden md:block relative transition-all duration-300 ${rightPanelCollapsed ? "w-0" : "w-[300px]"}`}
        >
          {/* Right panel toggle button */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={`absolute top-1/2 -left-10 -translate-y-full z-10 bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] border border-[rgba(167,139,250,0.5)] border-b-0 rounded-tl-xl flex items-center gap-1 text-white hover:from-[#C4B5FD] hover:to-[#A78BFA] hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all duration-200 ${rightPanelCollapsed ? "px-3 py-4" : "px-2 py-3"}`}
            title={rightPanelCollapsed ? "Show properties panel" : "Hide properties panel"}
          >
            {rightPanelCollapsed && (
              <span
                className="text-xs font-semibold whitespace-nowrap"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                }}
              >
                Properties
              </span>
            )}
            <svg
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${rightPanelCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!rightPanelCollapsed && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <PanelErrorBoundary>
                  <PropertiesPanel
                    selectedNode={selectedNode as Node<BuilderNodeData> | null}
                    onNodeChange={onNodeChange}
                    onNodeDelete={onNodeDelete}
                  />
                </PanelErrorBoundary>
              </div>
              {nodes.length > 0 && (
                <div className="border-t border-[rgba(79,70,229,0.2)] overflow-y-auto max-h-[40%]">
                  <StrategySummary
                    nodes={nodes as BuilderNode[]}
                    edges={edges as unknown as import("@/types/builder").BuilderEdge[]}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile properties panel - slide up from bottom */}
        {selectedNode && (
          <div className="md:hidden fixed inset-x-0 bottom-12 z-30 max-h-[60vh] bg-[#1A0626] border-t border-[rgba(79,70,229,0.3)] rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.5)] overflow-y-auto">
            <PanelErrorBoundary>
              <PropertiesPanel
                selectedNode={selectedNode as Node<BuilderNodeData> | null}
                onNodeChange={onNodeChange}
                onNodeDelete={onNodeDelete}
              />
            </PanelErrorBoundary>
            {nodes.length > 0 && (
              <div className="border-t border-[rgba(79,70,229,0.2)]">
                <StrategySummary
                  nodes={nodes as BuilderNode[]}
                  edges={edges as unknown as import("@/types/builder").BuilderEdge[]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: Version Controls */}
      <VersionControls
        projectId={projectId}
        hasUnsavedChanges={hasUnsavedChanges}
        hasNodes={nodes.length > 0}
        validation={validation}
        onSave={onSave}
        onLoad={onLoad}
        autoSaveStatus={autoSaveStatus}
        canExportMQL5={canExportMQL5}
        onGetBuildJson={getBuildJson}
        userTier={userTier}
      />
    </div>
  );
}
