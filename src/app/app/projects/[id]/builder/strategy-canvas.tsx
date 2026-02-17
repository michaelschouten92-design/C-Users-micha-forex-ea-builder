"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodeToolbar } from "./node-toolbar";
import { PropertiesPanel } from "./properties";
import { VersionControls } from "./version-controls";
import { ValidationStatus } from "./validation-status";
import { validateStrategy } from "./strategy-validation";
import { ValidationProvider } from "./validation-context";
import { StrategySummary, buildNaturalLanguageSummary } from "./strategy-summary";
import { useUndoRedo } from "./use-undo-redo";
import { PanelErrorBoundary } from "./error-boundary";
import { WelcomeModal } from "./welcome-modal";
import {
  useAutoSave,
  useClipboard,
  useKeyboardShortcuts,
  useConnectionValidation,
  useOnlineStatus,
  addEdgeLabels,
} from "./hooks";
import type {
  BuilderNode,
  BuilderEdge,
  BuilderNodeData,
  BuilderNodeType,
  BuildJsonSchema,
  BuildJsonSettings,
  NodeTemplate,
} from "@/types/builder";
import { DEFAULT_SETTINGS, generateMagicNumber } from "@/types/builder";

function HelpButton({ onClick }: { onClick: () => void }) {
  const [glowing, setGlowing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setGlowing(false), 30000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 text-sm font-medium ${glowing ? "help-btn-glow" : ""}`}
      style={!glowing ? { boxShadow: "0 4px 16px rgba(79,70,229,0.4)" } : undefined}
      title="Show getting started guide"
      aria-label="Show getting started guide"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01"
        />
      </svg>
      Help
    </button>
  );
}

interface StrategyCanvasProps {
  projectId: string;
  initialData: BuildJsonSchema | null;
  canExportMQL5?: boolean;
  canExportMQL4?: boolean;
  userTier?: string;
}

export function StrategyCanvas({
  projectId,
  initialData,
  canExportMQL5 = false,
  canExportMQL4 = false,
  userTier,
}: StrategyCanvasProps) {
  const nodeIdCounterRef = useRef(0);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  // Panel state (always visible on desktop)
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Strategy settings state — new projects get a unique magic number
  const [settings, setSettings] = useState<BuildJsonSettings>(() =>
    initialData?.settings
      ? initialData.settings
      : { ...DEFAULT_SETTINGS, magicNumber: generateMagicNumber() }
  );

  const initialNodes = useMemo(() => {
    const nodes = (initialData?.nodes as Node[]) ?? [];
    let max = 0;
    for (const n of nodes) {
      const match = n.id.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    nodeIdCounterRef.current = max;
    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const initialEdges = useMemo(() => {
    const rawEdges = (initialData?.edges as Edge[]) ?? [];
    return addEdgeLabels(rawEdges, initialNodes as Node<BuilderNodeData>[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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

  // Helper to generate unique node IDs
  const getNextNodeId = useCallback((type: string) => {
    return `${type}-${++nodeIdCounterRef.current}`;
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
      onConnected: takeSnapshot as (nodes: Node<BuilderNodeData>[], edges: Edge[]) => void,
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

  // Keyboard shortcut: Shift+? to open shortcuts modal + scroll lock
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

  useEffect(() => {
    if (!showShortcuts) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showShortcuts]);

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
      setNodes((nds) => {
        const newNds = [...nds, newNode];
        queueMicrotask(() => takeSnapshot(newNds, edges));
        return newNds;
      });
    };
    window.addEventListener("node-duplicate", handleDuplicate);
    return () => window.removeEventListener("node-duplicate", handleDuplicate);
  }, [setNodes, getNextNodeId, takeSnapshot, edges]);

  // Selected node for properties panel
  const selectedNode = nodes.find((n) => n.selected) ?? null;

  // Validate strategy (memoized to avoid recalculating on every render)
  const validation = useMemo(
    () => validateStrategy(nodes as Node<BuilderNodeData>[], edges, settings),
    [nodes, edges, settings]
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

  // Drop error (entry strategy duplicate or node limit)
  const [dropError, setDropError] = useState<string | null>(null);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      let template: NodeTemplate;
      try {
        template = JSON.parse(data);
      } catch {
        return;
      }

      // Enforce: max 50 nodes
      if (nodes.length >= 50) {
        setDropError("Maximum of 50 blocks reached. Remove some blocks first.");
        setTimeout(() => setDropError(null), 6000);
        return;
      }

      // Enforce: only one entry strategy block on canvas
      if (template.defaultData && "entryType" in template.defaultData) {
        const existingEntry = nodes.find((n) => n.data && "entryType" in n.data);
        if (existingEntry) {
          // Select the existing entry strategy so the user can find it
          setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === existingEntry.id })));
          setDropError(
            `Only one entry strategy allowed. "${(existingEntry.data as BuilderNodeData).label}" is selected — delete it first.`
          );
          setTimeout(() => setDropError(null), 6000);
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

      setNodes((nds) => {
        const newNds = [...nds, newNode as Node];
        queueMicrotask(() => takeSnapshot(newNds, edges));
        return newNds;
      });
    },
    [screenToFlowPosition, setNodes, getNextNodeId, nodes, edges, takeSnapshot]
  );

  // Handle node data changes from properties panel
  const dataSnapshotTimeout = useRef<NodeJS.Timeout | null>(null);
  const onNodeChange = useCallback(
    (nodeId: string, updates: Partial<BuilderNodeData>) => {
      setNodes((nds) => {
        const newNodes = nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...updates },
            };
          }
          return node;
        });
        // Debounce snapshot for parameter changes (avoids flooding history while typing)
        if (dataSnapshotTimeout.current) clearTimeout(dataSnapshotTimeout.current);
        dataSnapshotTimeout.current = setTimeout(() => {
          takeSnapshot(newNodes, edges);
        }, 800);
        return newNodes;
      });
    },
    [setNodes, takeSnapshot, edges]
  );

  // Handle node deletion
  const onNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const filteredNodes = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const filteredEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          queueMicrotask(() => takeSnapshot(filteredNodes, filteredEdges));
          return filteredEdges;
        });
        return filteredNodes;
      });
    },
    [setNodes, setEdges, takeSnapshot]
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
      const loadedNodes = buildJson.nodes as Node<BuilderNodeData>[];
      const loadedEdges = addEdgeLabels(buildJson.edges as Edge[], loadedNodes);
      setNodes(loadedNodes);
      setEdges(loadedEdges);

      if (buildJson.viewport) {
        setViewport(buildJson.viewport);
      }

      // Reset history when loading a new version
      resetHistory(loadedNodes, loadedEdges);
    },
    [setNodes, setEdges, setViewport, resetHistory]
  );

  // Import strategy from JSON
  const onImportStrategy = useCallback(
    (buildJson: BuildJsonSchema) => {
      const importedNodes = buildJson.nodes as Node<BuilderNodeData>[];
      const importedEdges = addEdgeLabels(buildJson.edges as Edge[], importedNodes);
      setNodes(importedNodes);
      setEdges(importedEdges);
      if (buildJson.settings) {
        setSettings(buildJson.settings);
      }
      if (buildJson.viewport) {
        setViewport(buildJson.viewport);
      }
      // Update node ID counter
      let max = 0;
      for (const n of importedNodes) {
        const match = n.id.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
      nodeIdCounterRef.current = max;
      resetHistory(importedNodes, importedEdges);
    },
    [setNodes, setEdges, setSettings, setViewport, resetHistory]
  );

  // Export current strategy as JSON string
  const onExportJson = useCallback(() => {
    const buildJson: BuildJsonSchema = {
      version: "1.1",
      nodes: nodes as BuilderNode[],
      edges: edges as BuilderEdge[],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      settings,
    };
    return JSON.stringify(buildJson, null, 2);
  }, [nodes, edges, settings]);

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
      <WelcomeModal forceOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Mobile: read-only strategy summary */}
      <div className="sm:hidden flex-1 overflow-y-auto p-4">
        <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[#A78BFA]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs text-[#A78BFA] font-medium">
              Editing requires a desktop or tablet
            </span>
          </div>
          <p className="text-[10px] text-[#64748B]">
            You can view your strategy summary below. To add, remove, or configure blocks, open this
            project on a larger screen.
          </p>
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#64748B] text-sm">No blocks added yet.</p>
            <p className="text-[#64748B] text-xs mt-1">Open on desktop to start building.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Strategy Blocks ({nodes.length})</h3>
            {nodes.map((node) => {
              const data = node.data as BuilderNodeData;
              const categoryColors: Record<string, string> = {
                entrystrategy: "#10B981",
                timing: "#F59E0B",
                trademanagement: "#A78BFA",
              };
              const color = categoryColors[data.category] || "#64748B";
              return (
                <div
                  key={node.id}
                  className="bg-[#1E293B] border border-[rgba(79,70,229,0.2)] rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-white">{data.label}</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] uppercase tracking-wider">
                    {data.category
                      .replace("entrystrategy", "Entry Strategy")
                      .replace("trademanagement", "Trade Management")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 hidden sm:flex min-h-0">
        {/* Left: Node Toolbar - hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <NodeToolbar
            onDragStart={onDragStart}
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
          <ValidationProvider value={validation.issuesByNodeId}>
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
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
                  <div className="text-center px-6 py-5 rounded-xl bg-[#1A0626]/60 border border-[rgba(79,70,229,0.15)]">
                    <p className="text-sm text-[#94A3B8] mb-1">
                      Drag an <span className="text-white font-medium">Entry Strategy</span> block
                      from the left toolbar onto the canvas to start
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Not sure? Start with <span className="text-[#A78BFA]">EMA Crossover</span>{" "}
                      &mdash; it&apos;s the simplest
                    </p>
                  </div>
                </div>
              )}
            </ReactFlow>
          </ValidationProvider>

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

          {/* Help button — re-trigger onboarding */}
          <style>{`
            @keyframes help-glow {
              0%, 100% { box-shadow: 0 4px 16px rgba(79,70,229,0.4); }
              50% { box-shadow: 0 4px 24px rgba(79,70,229,0.7); }
            }
            .help-btn-glow {
              animation: help-glow 3s ease-in-out infinite;
            }
          `}</style>
          <HelpButton onClick={() => setShowHelp(true)} />

          {/* Autosave error banner */}
          {autoSaveStatus === "error" && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#7F1D1D] text-white px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center gap-3 border border-red-500/30 max-w-[90vw]"
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
              className={`absolute ${autoSaveStatus === "error" ? "top-16" : "top-4"} left-1/2 -translate-x-1/2 z-20 bg-[#78350F] text-white px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center gap-3 border border-amber-500/30 max-w-[90vw] transition-all duration-200`}
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

          {/* Drop error toast (entry strategy duplicate / node limit) */}
          {dropError && (
            <div
              role="alert"
              onClick={() => setDropError(null)}
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
              <span className="text-sm font-medium">{dropError}</span>
            </div>
          )}

          {/* Validation Status - top right overlay */}
          {nodes.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <ValidationStatus validation={validation} />
            </div>
          )}

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
                  {(() => {
                    const mod =
                      typeof navigator !== "undefined" &&
                      /Mac|iPhone|iPad/.test(navigator.userAgent)
                        ? "Cmd"
                        : "Ctrl";
                    return [
                      [`${mod} + Z`, "Undo"],
                      [`${mod} + Y`, "Redo"],
                      [`${mod} + C`, "Copy selected nodes"],
                      [`${mod} + V`, "Paste nodes"],
                      [`${mod} + D`, "Duplicate selected"],
                      [`${mod} + S`, "Save"],
                      ["Delete", "Delete selected nodes"],
                      ["Shift + ?", "Show this dialog"],
                    ];
                  })().map(([key, desc]) => (
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
        <div id="properties-panel" className="hidden md:block relative w-[300px]">
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <PanelErrorBoundary>
                <PropertiesPanel
                  selectedNode={selectedNode as Node<BuilderNodeData> | null}
                  nodes={nodes as BuilderNode[]}
                  onNodeChange={onNodeChange}
                  onNodeDelete={onNodeDelete}
                  settings={settings}
                  onSettingsChange={setSettings}
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
        onImportStrategy={onImportStrategy}
        onExportJson={onExportJson}
        autoSaveStatus={autoSaveStatus}
        canExportMQL5={canExportMQL5}
        canExportMQL4={canExportMQL4}
        userTier={userTier}
        magicNumber={settings.magicNumber}
        strategySummaryLines={buildNaturalLanguageSummary(nodes as BuilderNode[])}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </div>
  );
}
