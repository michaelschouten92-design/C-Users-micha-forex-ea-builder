"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodeToolbar } from "./node-toolbar";
import { PropertiesPanel } from "./properties-panel";
import { VersionControls } from "./version-controls";
import { validateStrategy } from "./strategy-validation";
import { useUndoRedo } from "./use-undo-redo";
import { validateConnection } from "./connection-validation";
import type {
  BuilderNode,
  BuilderEdge,
  BuilderNodeData,
  BuilderNodeType,
  BuildJsonSchema,
  NodeTemplate,
  DEFAULT_BUILD_JSON,
} from "@/types/builder";

interface StrategyCanvasProps {
  projectId: string;
  initialData: BuildJsonSchema | null;
}

let nodeIdCounter = 0;

export function StrategyCanvas({ projectId, initialData }: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  // Panel collapse state
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (initialData?.nodes as Node[]) ?? []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialData?.edges as Edge[]) ?? []
  );

  // Undo/Redo history
  const {
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  } = useUndoRedo(
    (initialData?.nodes as Node[]) ?? [],
    (initialData?.edges as Edge[]) ?? []
  );

  // Track previous state for snapshot detection
  const prevStateRef = useRef<string>(JSON.stringify({ nodes: initialData?.nodes ?? [], edges: initialData?.edges ?? [] }));

  // Flag to skip snapshot after undo/redo
  const skipSnapshotRef = useRef(false);

  // Take snapshot when nodes or edges change significantly
  useEffect(() => {
    // Skip snapshot if this change came from undo/redo
    if (skipSnapshotRef.current) {
      skipSnapshotRef.current = false;
      prevStateRef.current = JSON.stringify({ nodes, edges });
      return;
    }

    const currentState = JSON.stringify({ nodes, edges });
    if (currentState !== prevStateRef.current) {
      // Debounce snapshot to avoid too many history entries during dragging
      const timeout = setTimeout(() => {
        takeSnapshot(nodes, edges);
        prevStateRef.current = currentState;
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [nodes, edges, takeSnapshot]);

  // Track if there are unsaved changes
  const savedStateRef = useRef<string>(JSON.stringify({ nodes: initialData?.nodes ?? [], edges: initialData?.edges ?? [] }));
  const currentState = JSON.stringify({ nodes, edges });
  const hasUnsavedChanges = currentState !== savedStateRef.current;

  // Autosave state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Connection validation feedback
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selected node for properties panel
  const selectedNode = nodes.find((n) => n.selected) ?? null;

  // Validate strategy
  const validation = validateStrategy(nodes as Node<BuilderNodeData>[]);

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
      const validation = validateConnection(
        conn,
        nodes as Node<BuilderNodeData>[],
        edges
      );
      return validation.isValid;
    },
    [nodes, edges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const validation = validateConnection(
        params,
        nodes as Node<BuilderNodeData>[],
        edges
      );

      if (!validation.isValid) {
        showConnectionError(validation.reason || "Invalid connection");
        return;
      }

      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [nodes, edges, setEdges, showConnectionError]
  );

  // Handle drag start from toolbar
  const onDragStart = useCallback(
    (event: React.DragEvent, template: NodeTemplate) => {
      event.dataTransfer.setData("application/reactflow", JSON.stringify(template));
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  // Handle drop on canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      const template: NodeTemplate = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: BuilderNode = {
        id: `${template.type}-${++nodeIdCounter}`,
        type: template.type as BuilderNodeType,
        position,
        data: { ...template.defaultData } as BuilderNodeData,
      };

      setNodes((nds) => [...nds, newNode as Node]);
    },
    [screenToFlowPosition, setNodes]
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

  // Handle deletion of selected nodes
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length > 0) {
      const selectedIds = selectedNodes.map((n) => n.id);
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) => eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
    }
  }, [nodes, setNodes, setEdges]);

  // Keyboard event handler for Delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace is pressed and no input is focused
      if ((event.key === "Delete" || event.key === "Backspace") &&
          !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        deleteSelectedNodes();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedNodes]);

  // Save current state to server
  const saveToServer = useCallback(async (isAutosave: boolean = false) => {
    const buildJson: BuildJsonSchema = {
      version: "1.0",
      nodes: nodes as BuilderNode[],
      edges: edges as BuilderEdge[],
      viewport: { x: 0, y: 0, zoom: 1 }, // Could capture actual viewport
      metadata: {
        createdAt: initialData?.metadata?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      settings: initialData?.settings ?? {
        magicNumber: 123456,
        comment: "EA Builder Strategy",
        maxOpenTrades: 1,
        allowHedging: false,
      },
    };

    if (isAutosave) {
      setAutoSaveStatus("saving");
    }

    const res = await fetch(`/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildJson }),
    });

    if (res.ok) {
      savedStateRef.current = JSON.stringify({ nodes, edges });
      if (isAutosave) {
        setAutoSaveStatus("saved");
        // Reset to idle after 2 seconds
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
        alert("Failed to save. Please try again.");
      }
      return false;
    }
  }, [nodes, edges, projectId, initialData]);

  // Manual save handler
  const onSave = useCallback(async (): Promise<void> => {
    await saveToServer(false);
  }, [saveToServer]);

  // Autosave effect - save 5 seconds after last change
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only autosave if there are unsaved changes and there are nodes
    if (hasUnsavedChanges && nodes.length > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToServer(true);
      }, 5000); // 5 seconds debounce
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, nodes.length, saveToServer]);

  // Load a specific version
  const onLoad = useCallback(
    async (versionId: string) => {
      const res = await fetch(`/api/projects/${projectId}/versions/${versionId}`);
      if (res.ok) {
        const version = await res.json();
        const buildJson = version.buildJson as BuildJsonSchema;

        setNodes(buildJson.nodes as Node[]);
        setEdges(buildJson.edges as Edge[]);

        if (buildJson.viewport) {
          setViewport(buildJson.viewport);
        }

        // Reset history when loading a new version
        resetHistory(buildJson.nodes as Node[], buildJson.edges as Edge[]);

        savedStateRef.current = JSON.stringify({
          nodes: buildJson.nodes,
          edges: buildJson.edges,
        });
      } else {
        console.error("Load failed");
        alert("Failed to load version. Please try again.");
      }
    },
    [projectId, setNodes, setEdges, setViewport, resetHistory]
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
      const newId = `${node.type}-${++nodeIdCounter}`;
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
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [setNodes, setEdges]);

  // Duplicate selected nodes (Ctrl+D shortcut)
  const duplicateSelectedNodes = useCallback(() => {
    copySelectedNodes();
    pasteNodes();
  }, [copySelectedNodes, pasteNodes]);

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
          skipSnapshotRef.current = true;
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
          skipSnapshotRef.current = true;
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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setNodes, setEdges, copySelectedNodes, pasteNodes, duplicateSelectedNodes]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        {/* Left: Node Toolbar */}
        <NodeToolbar onDragStart={onDragStart} />

        {/* Center: React Flow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
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
          </ReactFlow>

          {/* Connection error toast */}
          {connectionError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#DC2626] text-white px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center gap-2 border border-red-400/30">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{connectionError}</span>
            </div>
          )}

          {/* Floating Undo/Redo buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 bg-[#1E293B] text-white rounded-lg border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 bg-[#1E293B] text-white rounded-lg border border-[rgba(79,70,229,0.3)] hover:bg-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Properties Panel */}
        <div
          className={`relative transition-all duration-300 ${rightPanelCollapsed ? 'w-0' : 'w-[300px]'}`}
        >
          {/* Right panel toggle button - bottom edge at 50% */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={`absolute top-1/2 -left-10 -translate-y-full z-10 bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] border border-[rgba(167,139,250,0.5)] border-b-0 rounded-tl-xl flex items-center gap-1 text-white hover:from-[#C4B5FD] hover:to-[#A78BFA] hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all duration-200 ${rightPanelCollapsed ? 'px-3 py-4' : 'px-2 py-3'}`}
            title={rightPanelCollapsed ? "Show properties panel" : "Hide properties panel"}
          >
            {rightPanelCollapsed && (
              <span
                className="text-xs font-semibold whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
              >
                Properties
              </span>
            )}
            <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${rightPanelCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!rightPanelCollapsed && (
            <PropertiesPanel
              selectedNode={selectedNode as Node<BuilderNodeData> | null}
              onNodeChange={onNodeChange}
              onNodeDelete={onNodeDelete}
            />
          )}
        </div>
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
      />
    </div>
  );
}
