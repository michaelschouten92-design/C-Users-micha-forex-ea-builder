"use client";

import { useState } from "react";
import type { ValidationResult, ValidationIssue } from "./strategy-validation";

interface ValidationStatusProps {
  validation: ValidationResult;
  onFocusNode?: (nodeId: string) => void;
}

export function ValidationStatus({ validation, onFocusNode }: ValidationStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  const errorCount = validation.issues.filter((i) => i.type === "error").length;
  const warningCount = validation.issues.filter((i) => i.type === "warning").length;

  function handleIssueClick(issue: ValidationIssue): void {
    if (issue.nodeId && onFocusNode) {
      onFocusNode(issue.nodeId);
    }
  }

  // Determine status color and icon
  function getStatusDisplay(): {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    label: string;
  } {
    if (validation.isValid) {
      return {
        color: "text-[#10B981]",
        bgColor: "bg-[rgba(16,185,129,0.1)]",
        borderColor: "border-[rgba(16,185,129,0.3)]",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: "Strategy Complete",
      };
    }
    if (errorCount > 0) {
      return {
        color: "text-[#EF4444]",
        bgColor: "bg-[rgba(239,68,68,0.1)]",
        borderColor: "border-[rgba(239,68,68,0.3)]",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        label: `${errorCount} error${errorCount > 1 ? "s" : ""}`,
      };
    }
    return {
      color: "text-[#F59E0B]",
      bgColor: "bg-[rgba(245,158,11,0.1)]",
      borderColor: "border-[rgba(245,158,11,0.3)]",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      label: `${warningCount} warning${warningCount > 1 ? "s" : ""}`,
    };
  }

  const status = getStatusDisplay();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${status.color} ${status.bgColor} ${status.borderColor} hover:opacity-80`}
      >
        {status.icon}
        <span>{status.label}</span>
        {validation.issues.length > 0 && (
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>
      {/* Inline first issue hint (without requiring click) */}
      {!showDetails && validation.issues.length > 0 && (
        <p
          className={`text-[10px] mt-1 max-w-[200px] truncate ${
            errorCount > 0 ? "text-[#FCA5A5]" : "text-[#FCD34D]"
          }`}
        >
          {validation.issues[0].message}
        </p>
      )}

      {/* Dropdown with details */}
      {showDetails && validation.issues.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#1E293B] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[rgba(79,70,229,0.3)] overflow-hidden">
          <div className="p-3 border-b border-[rgba(79,70,229,0.2)]">
            <h4 className="text-sm font-semibold text-white">Strategy Validation</h4>
            <p className="text-xs text-[#7C8DB0] mt-0.5">
              {errorCount > 0
                ? "Fix errors before exporting. Click an issue to select the node."
                : "Warnings are optional. Click to focus the node."}
            </p>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto">
            {validation.issues.map((issue, idx) => {
              const isError = issue.type === "error";
              const isClickable = !!issue.nodeId && !!onFocusNode;

              return (
                <button
                  key={idx}
                  onClick={() => handleIssueClick(issue)}
                  disabled={!isClickable}
                  className={`w-full text-left flex items-start gap-2 p-2 rounded-lg mb-1 last:mb-0 transition-colors ${
                    isError
                      ? "bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.18)]"
                      : "bg-[rgba(245,158,11,0.1)] hover:bg-[rgba(245,158,11,0.18)]"
                  } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  {isError ? (
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
                  ) : (
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
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs leading-relaxed ${isError ? "text-[#FCA5A5]" : "text-[#FCD34D]"}`}
                    >
                      {issue.message}
                    </span>
                    {isClickable && (
                      <span className="block text-[9px] text-[#7C8DB0] mt-0.5">
                        Click to select node
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary checklist */}
          <div className="p-3 border-t border-[rgba(79,70,229,0.2)] bg-[rgba(0,0,0,0.2)]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <CheckItem label="Timing (optional)" checked={validation.summary.hasTiming} />
              <CheckItem
                label="Signal / Trading"
                checked={validation.summary.hasSignalNode}
                required
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  required,
}: {
  label: string;
  checked: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {checked ? (
        <svg
          className="w-3.5 h-3.5 text-[#10B981]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className={`w-3.5 h-3.5 ${required ? "text-[#EF4444]" : "text-[#7C8DB0]"}`}
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
      )}
      <span className={checked ? "text-[#CBD5E1]" : required ? "text-[#FCA5A5]" : "text-[#7C8DB0]"}>
        {label}
        {required && <span className="text-[#EF4444]">*</span>}
      </span>
    </div>
  );
}
