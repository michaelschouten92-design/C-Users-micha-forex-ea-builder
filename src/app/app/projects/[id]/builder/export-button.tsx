"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";
import { ExportPreviewModal } from "@/components/builder/export-preview-modal";
import { WebhookSetupGuide } from "@/components/builder/webhook-setup-guide";

interface ExportButtonProps {
  projectId: string;
  hasNodes: boolean;
  canExport: boolean;
  canExportMQL5?: boolean;
  canExportMQL4?: boolean;
  userTier?: string;
  magicNumber?: number;
  strategySummaryLines?: string[];
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

interface ExportHistoryItem {
  id: string;
  outputName: string;
  versionNo: number;
  createdAt: string;
}

export function ExportButton({
  projectId,
  hasNodes,
  canExport,
  canExportMQL5 = false,
  canExportMQL4 = false,
  userTier,
  magicNumber,
  strategySummaryLines,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configMagicNumber, setConfigMagicNumber] = useState(magicNumber ?? 123456);
  const [selectedFormat, setSelectedFormat] = useState<"MQ5" | "MQ4">("MQ5");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<ExportError | null>(null);
  const stepTimersRef = useRef<NodeJS.Timeout[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ExportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setShowUpgradePrompt(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [showModal]);

  // Clean up timers on unmount
  const exportAbortRef = useRef<{ controller: AbortController; timeout: NodeJS.Timeout } | null>(
    null
  );
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
      if (exportAbortRef.current) {
        exportAbortRef.current.controller.abort();
        clearTimeout(exportAbortRef.current.timeout);
      }
    };
  }, []);

  const formatLabel = selectedFormat === "MQ4" ? "MQL4" : "MQL5";
  const exportSteps = [
    "Validating strategy...",
    `Generating ${formatLabel} code...`,
    "Finalizing export...",
  ];

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
      exportAbortRef.current = { controller, timeout };

      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ exportType: selectedFormat, magicNumber: configMagicNumber }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      exportAbortRef.current = null;
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json().catch(() => ({ error: "Export failed" }));

      if (!res.ok) {
        setError(data);
        return;
      }

      setResult(data);
      setShowHistory(true);
      fetchHistory();
      // Track export for builder progress stepper
      try {
        localStorage.setItem("algostudio-has-exported", "1");
      } catch {}
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
      // Fallback: select the code in the pre element so user can copy manually
      const pre = document.querySelector("[data-export-code]");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  const [redownloading, setRedownloading] = useState<string | null>(null);
  const [redownloadError, setRedownloadError] = useState<string | null>(null);

  function showError(message: string) {
    setRedownloadError(message);
    setTimeout(() => setRedownloadError(null), 5000);
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export?limit=5`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(Array.isArray(data) ? data : (data.items ?? []));
      }
    } catch {
      // Silently fail for history fetch
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRedownload(exportId: string) {
    setRedownloading(exportId);
    try {
      const res = await fetch(`/api/projects/${projectId}/export?redownload=${exportId}`);
      if (!res.ok) {
        showError("Failed to re-download. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.code && data.fileName) {
        const blob = new Blob([data.code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      showError("Failed to re-download. Please try again.");
    } finally {
      setRedownloading(null);
    }
  }

  const isDisabled = exporting || !hasNodes || !canExport;

  const exportDisabledReason = !hasNodes
    ? "Add nodes to export"
    : !canExport
      ? "Fix errors before exporting"
      : null;

  return (
    <>
      <button
        onClick={() => {
          if (!canExportMQL5) {
            setShowUpgradePrompt(true);
            setShowModal(true);
            return;
          }
          setConfigMagicNumber(magicNumber ?? 123456);
          setShowConfig(true);
          setResult(null);
          setError(null);
          setShowModal(true);
        }}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
          !canExportMQL5 && !isDisabled
            ? "bg-[#4F46E5] text-white hover:bg-[#6366F1] hover:shadow-[0_0_16px_rgba(79,70,229,0.3)]"
            : "bg-[#10B981] text-white hover:bg-[#059669] hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]"
        }`}
        title={
          exportDisabledReason ??
          (!canExportMQL5
            ? "Upgrade for unlimited exports"
            : canExportMQL4
              ? "Export Code — MQL5 or MQL4"
              : "Export Code — MQL5")
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
        ) : !canExportMQL5 ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
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
        <span className="hidden sm:inline">Export Code</span>
        <span className="sm:hidden">Export</span>
      </button>
      {exportDisabledReason && (
        <p className="text-[10px] text-[#64748B] mt-1 text-center md:hidden">
          {exportDisabledReason}
        </p>
      )}

      {/* Export Preview Modal */}
      {result && (
        <ExportPreviewModal
          code={result.code}
          fileName={result.fileName}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

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
                {showUpgradePrompt
                  ? "Upgrade Required"
                  : showConfig
                    ? "Export Configuration"
                    : exporting
                      ? "Exporting..."
                      : error
                        ? "Export Failed"
                        : "Export Successful"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#7C8DB0] hover:text-white p-1 transition-colors duration-200"
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
              {showUpgradePrompt ? (
                <div className="py-8 space-y-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#4F46E5]/30 to-[#22D3EE]/30 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-[#A78BFA]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Export limit reached</h4>
                    <p className="text-[#94A3B8] text-sm max-w-sm mx-auto">
                      You&apos;ve used all free exports. Upgrade to Pro for unlimited MQL5 + MQL4
                      exports, unlimited projects, and priority support.
                    </p>
                    <p className="text-[#64748B] text-xs mt-2">
                      Your free export resets on the 1st of next month.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                    >
                      View Plans
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
                    <button
                      onClick={() => {
                        setShowUpgradePrompt(false);
                        setShowModal(false);
                      }}
                      className="text-sm text-[#7C8DB0] hover:text-white transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              ) : showConfig ? (
                <div className="space-y-6 py-4 overflow-y-auto">
                  {/* Strategy Overview */}
                  {strategySummaryLines && strategySummaryLines.length > 0 && (
                    <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-[#A78BFA]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        Strategy Overview
                      </h4>
                      <ul className="space-y-1">
                        {strategySummaryLines.map((line, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-[#CBD5E1] leading-relaxed"
                          >
                            <svg
                              className="w-3 h-3 text-[#22D3EE] flex-shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Format Selector */}
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                      Export Format
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedFormat("MQ5")}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 ${
                          selectedFormat === "MQ5"
                            ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                            : "bg-[#0F172A] text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:text-white hover:border-[rgba(79,70,229,0.5)]"
                        }`}
                      >
                        <div className="font-semibold">MQL5</div>
                        <div className="text-xs mt-0.5 opacity-75">MetaTrader 5</div>
                      </button>
                      <button
                        onClick={() => {
                          if (!canExportMQL4) return;
                          setSelectedFormat("MQ4");
                        }}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 relative ${
                          !canExportMQL4
                            ? "bg-[#0F172A] text-[#475569] border-[rgba(79,70,229,0.15)] cursor-not-allowed"
                            : selectedFormat === "MQ4"
                              ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                              : "bg-[#0F172A] text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:text-white hover:border-[rgba(79,70,229,0.5)]"
                        }`}
                        title={
                          !canExportMQL4
                            ? "Upgrade to Pro or Elite to unlock MQL4 export"
                            : undefined
                        }
                      >
                        <div className="font-semibold flex items-center justify-center gap-1.5">
                          MQL4
                          {!canExportMQL4 && (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="text-xs mt-0.5 opacity-75">
                          {!canExportMQL4 ? "Pro / Elite" : "MetaTrader 4"}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="magic-number"
                      className="block text-sm font-medium text-[#CBD5E1] mb-2"
                    >
                      EA Identifier (Magic Number)
                    </label>
                    <p className="text-xs text-[#7C8DB0] mb-3">
                      Each EA on a chart needs a unique identifier so it only manages its own
                      trades. If you run the same EA on EURUSD and GBPUSD, give each a different
                      number.
                    </p>
                    <div className="flex gap-2">
                      <input
                        id="magic-number"
                        type="number"
                        min={1}
                        max={2147483647}
                        value={configMagicNumber}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 2147483647) {
                            setConfigMagicNumber(val);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() =>
                          setConfigMagicNumber(Math.floor(Math.random() * 2147383647) + 100000)
                        }
                        className="px-3 py-2 bg-[#1E293B] text-[#CBD5E1] text-sm rounded-lg hover:bg-[rgba(79,70,229,0.2)] hover:text-white border border-[rgba(79,70,229,0.3)] transition-all duration-200 whitespace-nowrap"
                      >
                        Randomize
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowConfig(false);
                      handleExport();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export {formatLabel}
                  </button>
                </div>
              ) : exporting ? (
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
                        className={`text-sm ${i <= exportStep ? "text-white" : "text-[#7C8DB0]"}`}
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
                        <span className="text-[#7C8DB0] ml-2">v{result.versionNo}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(true)}
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
                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                          />
                        </svg>
                        Preview Code
                      </button>
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
                    <pre
                      data-export-code
                      className="h-full overflow-auto p-4 bg-[#0F172A] text-xs text-[#CBD5E1] font-mono"
                    >
                      {highlightMQL(result.code)}
                    </pre>
                  </div>

                  {/* Next Steps Guide */}
                  <NextStepsGuide />

                  {/* Backtest Checklist */}
                  <BacktestChecklist />

                  {/* Webhook Setup */}
                  <WebhookSetupGuide />

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
                        Ready to build and test multiple systems? Unlock unlimited exports, MQL4
                        support, and unlimited projects.
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

                  {/* Redownload error toast */}
                  {redownloadError && (
                    <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-sm">
                      {redownloadError}
                    </div>
                  )}

                  {/* Export History */}
                  <div className="border-t border-[rgba(79,70,229,0.2)] pt-3">
                    <button
                      onClick={() => {
                        if (!showHistory && historyItems.length === 0) fetchHistory();
                        setShowHistory(!showHistory);
                      }}
                      className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-white transition-colors duration-200"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${showHistory ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      Export History{historyItems.length > 0 ? ` (${historyItems.length})` : ""}
                    </button>
                    {showHistory && (
                      <div className="mt-2 space-y-1">
                        {historyLoading ? (
                          <p className="text-xs text-[#7C8DB0] py-2">Loading...</p>
                        ) : historyItems.length === 0 ? (
                          <p className="text-xs text-[#7C8DB0] py-2">No previous exports</p>
                        ) : (
                          historyItems.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.1)]"
                            >
                              <span className="text-[#CBD5E1] truncate mr-2">
                                {item.outputName}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[#7C8DB0]">v{item.versionNo}</span>
                                <span className="text-[#7C8DB0]">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() => handleRedownload(item.id)}
                                  disabled={redownloading === item.id}
                                  className="text-[#A78BFA] hover:text-white disabled:opacity-50 transition-colors"
                                  title="Re-download"
                                >
                                  {redownloading === item.id ? (
                                    <svg
                                      className="animate-spin h-3 w-3"
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
                                    <svg
                                      className="w-3 h-3"
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
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
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

function highlightMQL(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Process line for syntax highlighting
    while (remaining.length > 0) {
      // Line comments
      const commentIdx = remaining.indexOf("//");
      if (commentIdx === 0) {
        parts.push(
          <span key={key++} className="text-[#6A9955]">
            {remaining}
          </span>
        );
        remaining = "";
        break;
      }

      // Find the earliest match
      let earliest = remaining.length;
      let matchType = "";

      if (commentIdx > 0 && commentIdx < earliest) {
        earliest = commentIdx;
        matchType = "comment";
      }

      // String literals
      const strIdx = remaining.indexOf('"');
      if (strIdx >= 0 && strIdx < earliest) {
        earliest = strIdx;
        matchType = "string";
      }

      // Push text before match
      if (earliest > 0) {
        const text = remaining.slice(0, earliest);
        parts.push(<span key={key++}>{highlightKeywords(text)}</span>);
        remaining = remaining.slice(earliest);
        continue;
      }

      if (matchType === "comment") {
        parts.push(
          <span key={key++} className="text-[#6A9955]">
            {remaining}
          </span>
        );
        remaining = "";
      } else if (matchType === "string") {
        const endQuote = remaining.indexOf('"', 1);
        if (endQuote >= 0) {
          parts.push(
            <span key={key++} className="text-[#CE9178]">
              {remaining.slice(0, endQuote + 1)}
            </span>
          );
          remaining = remaining.slice(endQuote + 1);
        } else {
          parts.push(
            <span key={key++} className="text-[#CE9178]">
              {remaining}
            </span>
          );
          remaining = "";
        }
      } else {
        parts.push(<span key={key++}>{highlightKeywords(remaining)}</span>);
        remaining = "";
      }
    }

    return (
      <span key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

function highlightKeywords(text: string): React.ReactNode {
  // MQL4/MQL5 keywords and types
  const pattern =
    /\b(int|double|string|bool|void|input|extern|datetime|long|ulong|float|color|enum|struct|class|return|if|else|for|while|switch|case|break|continue|true|false|NULL|ENUM_\w+|ORDER_\w+|POSITION_\w+|SYMBOL_\w+|PERIOD_\w+|MODE_\w+|TRADE_\w+|DEAL_\w+|ACCOUNT_\w+|PRICE_\w+|OP_\w+|SELECT_\w+|#property|#include|#define)\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const word = match[0];
    const isDirective = word.startsWith("#");
    const isType =
      /^(int|double|string|bool|void|input|extern|datetime|long|ulong|float|color|enum|struct|class)$/.test(
        word
      );
    const isConst =
      /^(true|false|NULL)$/.test(word) ||
      /^(ENUM_|ORDER_|POSITION_|SYMBOL_|PERIOD_|MODE_|TRADE_|DEAL_|ACCOUNT_|PRICE_|OP_|SELECT_)/.test(
        word
      );
    const className = isDirective
      ? "text-[#C586C0]"
      : isType
        ? "text-[#4EC9B0]"
        : isConst
          ? "text-[#4FC1FF]"
          : "text-[#C586C0]";
    parts.push(
      <span key={`${match.index}`} className={className}>
        {word}
      </span>
    );
    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

function NextStepsGuide() {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    <>
      If you haven&apos;t already, <strong className="text-white">download MetaTrader 5</strong>{" "}
      from your broker&apos;s website and install it
    </>,
    <>
      Place the <strong className="text-white">.mq5</strong> file in{" "}
      <strong className="text-white">MQL5/Experts</strong> folder (File &gt; Open Data Folder in
      MT5)
    </>,
    <>
      Open in MetaEditor and press <strong className="text-white">F7</strong> to compile
    </>,
    <>
      Open <strong className="text-white">Strategy Tester</strong> (Ctrl+R) and select your EA
    </>,
    <>
      Use <strong className="text-white">&quot;Every tick based on real ticks&quot;</strong>{" "}
      modeling for the most accurate backtest results
    </>,
    <>
      Backtest <strong className="text-white">minimum 2 years</strong> of data to validate the
      strategy
    </>,
  ];

  return (
    <div className="border border-[rgba(79,70,229,0.2)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.05)] transition-colors duration-200"
      >
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          How to install in MetaTrader 5
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <ol className="space-y-2 text-xs text-[#94A3B8]">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function BacktestChecklist() {
  const [expanded, setExpanded] = useState(false);

  const items = [
    'Use "Every tick based on real ticks" for the most accurate simulation',
    "Backtest at least 2 years of historical data",
    "Look for: profit factor > 1.5 (total wins / total losses), max drawdown < 20%, and a steadily rising equity curve",
    "Make sure you have at least 50 trades in the backtest — fewer trades means unreliable results",
    "Test on multiple currency pairs if the strategy is not pair-specific",
    "Forward test on a demo account for 1\u20133 months before going live",
  ];

  return (
    <div className="border border-[rgba(79,70,229,0.2)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[rgba(79,70,229,0.05)] transition-colors duration-200"
      >
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Backtest checklist
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#CBD5E1]">
              <span className="text-[#7C8DB0] flex-shrink-0 mt-px">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
