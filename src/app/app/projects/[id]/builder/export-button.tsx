"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";

interface ExportButtonProps {
  projectId: string;
  hasNodes: boolean;
  canExport: boolean;
  canExportMQL5?: boolean;
  userTier?: string;
}

interface ExportResult {
  success: boolean;
  fileName: string;
  code: string;
  versionNo: number;
}

interface ExportError {
  error: string;
  details?: string[] | string;
}

export function ExportButton({
  projectId,
  hasNodes,
  canExport,
  canExportMQL5 = false,
  userTier,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<ExportError | null>(null);
  const stepTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal]);

  // Clean up step timers on unmount
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const exportSteps = ["Validating strategy...", "Generating MQL5 code...", "Finalizing export..."];

  async function handleExport() {
    setExporting(true);
    setExportStep(0);
    setError(null);
    setResult(null);
    setShowModal(true);

    // Simulate progress steps while waiting for API
    const stepTimer1 = setTimeout(() => setExportStep(1), 800);
    const stepTimer2 = setTimeout(() => setExportStep(2), 2500);
    stepTimersRef.current = [stepTimer1, stepTimer2];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ exportType: "MQ5" }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok) {
        setError(data);
        return;
      }

      setResult(data);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "Export timed out. Please try again."
          : "Failed to export. Please try again.";
      setError({ error: message });
    } finally {
      setExporting(false);
    }
  }

  function downloadFile() {
    if (!result) return;

    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail for clipboard errors
    }
  }

  const isDisabled = exporting || !hasNodes || !canExport || !canExportMQL5;

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isDisabled}
        className="flex items-center gap-2 px-4 py-1.5 bg-[#10B981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        title={
          !hasNodes
            ? "Add nodes to export"
            : !canExport
              ? "Fix errors before exporting"
              : !canExportMQL5
                ? "Upgrade to Pro to export"
                : "Export to MQL5"
        }
      >
        {exporting ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
        Export MQL5
      </button>

      {/* Export Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            aria-label="Export modal"
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
            role="dialog"
          >
            {/* Header */}
            <div className="p-4 border-b border-[rgba(79,70,229,0.2)] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {exporting ? "Exporting..." : error ? "Export Failed" : "Export Successful"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-white p-1 transition-colors duration-200"
                aria-label="Close export modal"
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

            {/* Content */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {exporting ? (
                <div aria-live="polite" className="py-8 space-y-6">
                  {exportSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {i < exportStep ? (
                        <svg
                          className="w-5 h-5 text-[#22D3EE] flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : i === exportStep ? (
                        <svg
                          className="w-5 h-5 text-[#A78BFA] animate-spin flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-[rgba(79,70,229,0.3)] flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${i <= exportStep ? "text-white" : "text-[#64748B]"}`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                  {/* Progress bar */}
                  <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#22D3EE] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${((exportStep + 1) / exportSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-4 rounded-lg">
                    <p className="font-medium">{error.error}</p>
                    {error.details &&
                      (typeof error.details === "string" ? (
                        <p className="mt-2 text-sm">{error.details}</p>
                      ) : (
                        error.details.length > 0 && (
                          <ul className="mt-2 text-sm space-y-1">
                            {error.details.map((detail, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[#EF4444]">•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        )
                      ))}
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#CBD5E1]">
                        <span className="text-[#22D3EE] font-medium">{result.fileName}</span>
                        <span className="text-[#64748B] ml-2">v{result.versionNo}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] text-[#CBD5E1] text-sm rounded-lg hover:bg-[rgba(79,70,229,0.2)] hover:text-white border border-[rgba(79,70,229,0.3)] transition-all duration-200"
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={downloadFile}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white text-sm rounded-lg hover:bg-[#059669] transition-all duration-200"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Code Preview */}
                  <div className="flex-1 overflow-hidden rounded-lg border border-[rgba(79,70,229,0.2)]">
                    <pre className="h-full overflow-auto p-4 bg-[#0F172A] text-xs text-[#CBD5E1] font-mono">
                      {result.code}
                    </pre>
                  </div>

                  {/* Next Steps Guide */}
                  <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-white">Next steps</h4>
                    <ol className="space-y-2 text-xs text-[#94A3B8]">
                      <li className="flex gap-2">
                        <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          1
                        </span>
                        <span>
                          Open MetaTrader 5 and go to{" "}
                          <strong className="text-white">File &gt; Open Data Folder</strong>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          2
                        </span>
                        <span>
                          Place the <strong className="text-white">.mq5</strong> file in{" "}
                          <strong className="text-white">MQL5/Experts</strong>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          3
                        </span>
                        <span>
                          Open in MetaEditor and press <strong className="text-white">F7</strong> to
                          compile
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          4
                        </span>
                        <span>
                          Drag the EA onto a chart to start{" "}
                          <strong className="text-white">backtesting</strong> or trading
                        </span>
                      </li>
                    </ol>
                  </div>

                  {/* Upsell for FREE users */}
                  {userTier === "FREE" && (
                    <div className="bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 border border-[rgba(79,70,229,0.3)] rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#22D3EE]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm font-medium text-white">
                          Your strategy has been exported.
                        </span>
                      </div>
                      <p className="text-sm text-[#CBD5E1]">
                        Ready to build and test multiple systems? Unlock unlimited exports and
                        projects.
                      </p>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                      >
                        Upgrade to Pro
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
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[rgba(79,70,229,0.2)] flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[#CBD5E1] hover:text-white transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
