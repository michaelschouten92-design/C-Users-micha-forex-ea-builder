"use client";

import { useState, useEffect, useCallback } from "react";
import { ExportButton } from "./export-button";
import { ValidationStatus } from "./validation-status";
import type { ValidationResult } from "./strategy-validation";
import type { BuildJsonSchema } from "@/types/builder";

interface Version {
  id: string;
  versionNo: number;
  createdAt: string;
  buildJson: BuildJsonSchema; // Now included in the response
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
}: VersionControlsProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch versions list
  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
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

  const latestVersion = versions[0]?.versionNo ?? 0;
  const nextVersion = latestVersion + 1;

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
            <div className="absolute bottom-full left-0 mb-1 w-64 bg-[#1E293B] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[rgba(79,70,229,0.3)] max-h-48 overflow-y-auto">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => handleLoad(version.id)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(79,70,229,0.15)] flex justify-between items-center text-white transition-colors duration-200"
                >
                  <span className="font-medium">Version {version.versionNo}</span>
                  <span className="text-[#64748B] text-xs">
                    {new Date(version.createdAt).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
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
      </div>

      {/* Right side - Validation Status */}
      <div className="flex items-center gap-2 md:gap-4 text-sm">
        {/* Validation Status - hide on very small screens */}
        {hasNodes && <div className="hidden sm:block"><ValidationStatus validation={validation} /></div>}

        {/* Separator */}
        {hasNodes && <div className="w-px h-6 bg-[rgba(79,70,229,0.3)] hidden sm:block" />}

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
    </div>
  );
}
