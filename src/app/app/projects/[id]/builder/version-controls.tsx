"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ExportButton } from "./export-button";
import { getCsrfHeaders } from "@/lib/api-client";
import type { ValidationResult } from "./strategy-validation";
import type { BuildJsonSchema, BuilderNode } from "@/types/builder";

interface Version {
  id: string;
  versionNo: number;
  createdAt: string;
  buildJson: BuildJsonSchema;
}

interface DiffResult {
  nodesAdded: BuilderNode[];
  nodesRemoved: BuilderNode[];
  nodesChanged: { node: BuilderNode; changes: string[] }[];
  edgesAdded: number;
  edgesRemoved: number;
}

function computeDiff(older: BuildJsonSchema, newer: BuildJsonSchema): DiffResult {
  const oldNodeMap = new Map(older.nodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newer.nodes.map((n) => [n.id, n]));

  const nodesAdded = newer.nodes.filter((n) => !oldNodeMap.has(n.id));
  const nodesRemoved = older.nodes.filter((n) => !newNodeMap.has(n.id));

  const nodesChanged: DiffResult["nodesChanged"] = [];
  for (const newNode of newer.nodes) {
    const oldNode = oldNodeMap.get(newNode.id);
    if (!oldNode) continue;

    const changes: string[] = [];
    if (oldNode.data.label !== newNode.data.label) {
      changes.push(`Label: "${oldNode.data.label}" → "${newNode.data.label}"`);
    }

    // Compare data properties (shallow)
    const oldData = oldNode.data as Record<string, unknown>;
    const newData = newNode.data as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of allKeys) {
      if (key === "label" || key === "category") continue;
      const oldVal = JSON.stringify(oldData[key]);
      const newVal = JSON.stringify(newData[key]);
      if (oldVal !== newVal) {
        changes.push(`${key} changed`);
      }
    }

    if (changes.length > 0) {
      nodesChanged.push({ node: newNode, changes });
    }
  }

  const oldEdgeIds = new Set(older.edges.map((e) => `${e.source}->${e.target}`));
  const newEdgeIds = new Set(newer.edges.map((e) => `${e.source}->${e.target}`));
  const edgesAdded = [...newEdgeIds].filter((id) => !oldEdgeIds.has(id)).length;
  const edgesRemoved = [...oldEdgeIds].filter((id) => !newEdgeIds.has(id)).length;

  return { nodesAdded, nodesRemoved, nodesChanged, edgesAdded, edgesRemoved };
}

interface VersionControlsProps {
  projectId: string;
  hasUnsavedChanges: boolean;
  hasNodes: boolean;
  validation: ValidationResult;
  onSave: () => Promise<void>;
  onLoad: (versionId: string, buildJson: BuildJsonSchema) => void; // Changed to sync with cached data
  autoSaveStatus: "idle" | "saving" | "saved" | "error";
  canExportMQL5?: boolean;
  onGetBuildJson?: () => BuildJsonSchema;
}

export function VersionControls({
  projectId,
  hasUnsavedChanges,
  hasNodes,
  validation,
  onSave,
  onLoad,
  autoSaveStatus,
  canExportMQL5 = false,
  onGetBuildJson,
}: VersionControlsProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [diffVersions, setDiffVersions] = useState<[number, number] | null>(null);

  // Fetch versions list
  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions?limit=20`);
      if (res.ok) {
        const json = await res.json();
        // Support both paginated { data: [] } and legacy flat array responses
        setVersions(Array.isArray(json) ? json : json.data);
      }
    } catch {
      // Silently fail — versions panel will show empty state
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  // Refresh versions when autosave completes
  useEffect(() => {
    if (autoSaveStatus === "saved") {
      fetchVersions();
    }
  }, [autoSaveStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      await fetchVersions();
    } finally {
      setSaving(false);
    }
  };

  // Load version from cache (no additional network request needed)
  const handleLoad = useCallback((versionId: string) => {
    setShowDropdown(false);
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      onLoad(versionId, version.buildJson);
    }
  }, [versions, onLoad]);

  const handleSaveTemplate = async () => {
    if (!onGetBuildJson || !templateName.trim()) return;
    setTemplateSaving(true);
    setTemplateStatus(null);
    try {
      const buildJson = onGetBuildJson();
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: templateName.trim(), buildJson }),
      });
      if (res.ok) {
        setTemplateStatus("Saved!");
        setTemplateName("");
        setTimeout(() => {
          setShowTemplateModal(false);
          setTemplateStatus(null);
        }, 1200);
      } else {
        const data = await res.json();
        setTemplateStatus(data.error || "Failed to save");
      }
    } catch {
      setTemplateStatus("Failed to save");
    } finally {
      setTemplateSaving(false);
    }
  };

  const latestVersion = versions[0]?.versionNo ?? 0;
  const nextVersion = latestVersion + 1;

  // Compute diff between selected versions
  const diff = useMemo(() => {
    if (!diffVersions) return null;
    const [olderNo, newerNo] = diffVersions;
    const older = versions.find((v) => v.versionNo === olderNo);
    const newer = versions.find((v) => v.versionNo === newerNo);
    if (!older || !newer) return null;
    return computeDiff(older.buildJson, newer.buildJson);
  }, [diffVersions, versions]);

  return (
    <div className="h-12 bg-[#1A0626] border-t border-[rgba(79,70,229,0.2)] px-2 md:px-4 flex items-center justify-between gap-1 md:gap-0">
      {/* Left side - Save and Load */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] hover:shadow-[0_0_16px_rgba(34,211,238,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {saving ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
          <span className="hidden sm:inline">Save</span> v{nextVersion}
        </button>

        {/* Version dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={versions.length === 0}
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 bg-[#1E293B] text-[#CBD5E1] text-sm font-medium rounded-lg hover:bg-[rgba(79,70,229,0.2)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(79,70,229,0.3)] transition-all duration-200"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Load Version</span>
            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && versions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-[#1E293B] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[rgba(79,70,229,0.3)] max-h-48 overflow-y-auto">
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className="flex items-center hover:bg-[rgba(79,70,229,0.15)] transition-colors duration-200"
                >
                  <button
                    onClick={() => handleLoad(version.id)}
                    className="flex-1 px-4 py-2.5 text-left text-sm flex justify-between items-center text-white"
                  >
                    <span className="font-medium">Version {version.versionNo}</span>
                    <span className="text-[#64748B] text-xs">
                      {new Date(version.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  {idx < versions.length - 1 && (
                    <button
                      onClick={() => {
                        setDiffVersions([versions[idx + 1].versionNo, version.versionNo]);
                        setShowDropdown(false);
                      }}
                      className="px-2 py-1 mr-2 text-[10px] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.15)] rounded transition-colors flex-shrink-0"
                      title={`Compare v${versions[idx + 1].versionNo} → v${version.versionNo}`}
                    >
                      Diff
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-[rgba(79,70,229,0.3)] hidden sm:block" />

        {/* Export Button */}
        <ExportButton
          projectId={projectId}
          hasNodes={hasNodes}
          canExport={validation.canExport}
          canExportMQL5={canExportMQL5}
        />

        {/* Save as Template */}
        {onGetBuildJson && hasNodes && (
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-[#94A3B8] text-sm hover:text-white hover:bg-[rgba(79,70,229,0.15)] rounded-lg transition-all duration-200"
            title="Save as template"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="hidden lg:inline">Save as Template</span>
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4 text-sm">
        {/* Save status */}
        {autoSaveStatus === "saving" ? (
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="hidden md:inline">Autosaving...</span>
          </span>
        ) : autoSaveStatus === "saved" ? (
          <span className="flex items-center gap-1.5 text-[#22D3EE]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden md:inline">Autosaved</span>
          </span>
        ) : autoSaveStatus === "error" ? (
          <span className="flex items-center gap-1.5 text-[#F87171]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden md:inline">Autosave failed</span>
          </span>
        ) : hasUnsavedChanges ? (
          <span className="flex items-center gap-1.5 text-[#A78BFA]">
            <span className="w-2 h-2 rounded-full bg-[#A78BFA] animate-pulse flex-shrink-0"></span>
            <span className="hidden md:inline">Unsaved changes</span>
          </span>
        ) : versions.length > 0 ? (
          <span className="flex items-center gap-1.5 text-[#22D3EE]">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Saved</span> <span className="hidden md:inline">(v{latestVersion})</span>
          </span>
        ) : (
          <span className="text-[#64748B] hidden md:inline">No versions saved yet</span>
        )}
      </div>

      {/* Version Diff Modal */}
      {diff && diffVersions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-[rgba(79,70,229,0.2)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Changes: v{diffVersions[0]} → v{diffVersions[1]}
              </h3>
              <button
                onClick={() => setDiffVersions(null)}
                className="text-[#64748B] hover:text-white p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-sm">
              {diff.nodesAdded.length === 0 && diff.nodesRemoved.length === 0 && diff.nodesChanged.length === 0 && diff.edgesAdded === 0 && diff.edgesRemoved === 0 ? (
                <p className="text-[#64748B] text-center py-4">No differences found</p>
              ) : (
                <>
                  {diff.nodesAdded.length > 0 && (
                    <div>
                      <h4 className="text-[#22D3EE] font-medium mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                        Blocks added ({diff.nodesAdded.length})
                      </h4>
                      <ul className="space-y-1 pl-4">
                        {diff.nodesAdded.map((n) => (
                          <li key={n.id} className="text-[#CBD5E1]">{n.data.label} <span className="text-[#64748B]">({n.type})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diff.nodesRemoved.length > 0 && (
                    <div>
                      <h4 className="text-[#EF4444] font-medium mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                        Blocks removed ({diff.nodesRemoved.length})
                      </h4>
                      <ul className="space-y-1 pl-4">
                        {diff.nodesRemoved.map((n) => (
                          <li key={n.id} className="text-[#CBD5E1]">{n.data.label} <span className="text-[#64748B]">({n.type})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diff.nodesChanged.length > 0 && (
                    <div>
                      <h4 className="text-[#FBBF24] font-medium mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
                        Blocks modified ({diff.nodesChanged.length})
                      </h4>
                      <ul className="space-y-2 pl-4">
                        {diff.nodesChanged.map(({ node, changes }) => (
                          <li key={node.id}>
                            <span className="text-[#CBD5E1] font-medium">{node.data.label}</span>
                            <ul className="mt-1 space-y-0.5">
                              {changes.map((c, i) => (
                                <li key={i} className="text-xs text-[#94A3B8] pl-3">{c}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(diff.edgesAdded > 0 || diff.edgesRemoved > 0) && (
                    <div>
                      <h4 className="text-[#A78BFA] font-medium mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                        Connections
                      </h4>
                      <div className="pl-4 text-[#CBD5E1] space-y-1">
                        {diff.edgesAdded > 0 && <p>+{diff.edgesAdded} added</p>}
                        {diff.edgesRemoved > 0 && <p>-{diff.edgesRemoved} removed</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-3 border-t border-[rgba(79,70,229,0.2)] flex justify-end">
              <button
                onClick={() => setDiffVersions(null)}
                className="px-4 py-1.5 text-sm text-[#CBD5E1] hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Save as Template</h3>
              <p className="text-[#94A3B8] text-sm mb-4">
                Save your current strategy as a reusable template.
              </p>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                maxLength={100}
                className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && templateName.trim()) handleSaveTemplate();
                }}
              />
              {templateStatus && (
                <p className={`mt-2 text-sm ${templateStatus === "Saved!" ? "text-[#22D3EE]" : "text-[#F87171]"}`}>
                  {templateStatus}
                </p>
              )}
            </div>
            <div className="bg-[#0F172A]/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-[rgba(79,70,229,0.2)]">
              <button
                type="button"
                onClick={() => { setShowTemplateModal(false); setTemplateStatus(null); }}
                className="px-4 py-2 text-[#94A3B8] hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={templateSaving || !templateName.trim()}
                className="bg-[#4F46E5] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {templateSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
