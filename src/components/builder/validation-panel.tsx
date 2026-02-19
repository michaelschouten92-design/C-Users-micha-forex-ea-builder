"use client";

import { useState, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData, BuildJsonSettings } from "@/types/builder";
import {
  validateStrategyForExport,
  type ValidationIssue,
  type StrategyValidationResult,
} from "@/lib/validations/strategy-validation";

interface ValidationPanelProps {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
  settings?: BuildJsonSettings;
  onSelectNode?: (nodeId: string) => void;
}

export function ValidationPanel({
  nodes,
  edges,
  settings,
  onSelectNode,
}: ValidationPanelProps): React.ReactNode {
  const [expanded, setExpanded] = useState(false);

  const result: StrategyValidationResult = useMemo(
    () => validateStrategyForExport(nodes, edges, settings),
    [nodes, edges, settings]
  );

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const totalIssues = errorCount + warningCount;
  const isClean = totalIssues === 0;

  function handleIssueClick(issue: ValidationIssue): void {
    if (issue.nodeId && onSelectNode) {
      onSelectNode(issue.nodeId);
    }
  }

  return (
    <div className="relative">
      {/* Badge button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 hover:opacity-80 ${getBadgeClasses(errorCount, warningCount, isClean)}`}
      >
        {isClean ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : errorCount > 0 ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        <span>{getStatusLabel(errorCount, warningCount, isClean)}</span>
        {totalIssues > 0 && (
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      {/* Expanded issue list */}
      {expanded && totalIssues > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#1E293B] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[rgba(79,70,229,0.3)] overflow-hidden z-50">
          <div className="p-3 border-b border-[rgba(79,70,229,0.2)]">
            <h4 className="text-sm font-semibold text-white">Strategy Validation</h4>
            <p className="text-xs text-[#7C8DB0] mt-0.5">
              {errorCount > 0
                ? "Fix errors before exporting"
                : "Warnings are optional but recommended"}
            </p>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto">
            {/* Errors first */}
            {result.errors.map((issue, idx) => (
              <button
                key={`error-${idx}`}
                onClick={() => handleIssueClick(issue)}
                className={`w-full text-left flex items-start gap-2 p-2 rounded-lg mb-1 last:mb-0 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.15)] transition-colors ${issue.nodeId ? "cursor-pointer" : "cursor-default"}`}
              >
                <svg
                  className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5"
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
                <span className="text-xs text-[#FCA5A5]">{issue.message}</span>
              </button>
            ))}
            {/* Warnings */}
            {result.warnings.map((issue, idx) => (
              <button
                key={`warning-${idx}`}
                onClick={() => handleIssueClick(issue)}
                className={`w-full text-left flex items-start gap-2 p-2 rounded-lg mb-1 last:mb-0 bg-[rgba(245,158,11,0.1)] hover:bg-[rgba(245,158,11,0.15)] transition-colors ${issue.nodeId ? "cursor-pointer" : "cursor-default"}`}
              >
                <svg
                  className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01"
                  />
                </svg>
                <span className="text-xs text-[#FCD34D]">{issue.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getBadgeClasses(errorCount: number, warningCount: number, isClean: boolean): string {
  if (isClean) {
    return "text-[#10B981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]";
  }
  if (errorCount > 0) {
    return "text-[#EF4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]";
  }
  return "text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]";
}

function getStatusLabel(errorCount: number, warningCount: number, isClean: boolean): string {
  if (isClean) return "Ready to Export";
  if (errorCount > 0) {
    return `${errorCount} error${errorCount > 1 ? "s" : ""}`;
  }
  return `${warningCount} warning${warningCount > 1 ? "s" : ""}`;
}
