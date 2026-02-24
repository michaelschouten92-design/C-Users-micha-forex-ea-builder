"use client";

import { useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";

interface RegisterEADialogProps {
  onSuccess: () => void;
}

export function RegisterEADialog({ onSuccess }: RegisterEADialogProps) {
  const [open, setOpen] = useState(false);
  const [eaName, setEaName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    instanceId: string;
    apiKey: string;
    eaName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eaName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/live/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        body: JSON.stringify({ eaName: eaName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setResult(data);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.apiKey) return;
    try {
      await navigator.clipboard.writeText(result.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in the input
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setEaName("");
      setError(null);
      setResult(null);
      setCopied(false);
    }, 200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#4F46E5]/40 text-[#A78BFA] hover:bg-[#4F46E5]/20 hover:border-[#4F46E5]/60 transition-all duration-200"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        Connect External EA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Dialog */}
          <div className="relative bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-lg font-semibold text-white">
                {result ? "EA Registered" : "Connect External EA"}
              </h3>
              <button
                onClick={handleClose}
                className="text-[#7C8DB0] hover:text-white transition-colors"
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

            {!result ? (
              /* Registration form */
              <form onSubmit={handleSubmit} className="px-6 pb-6">
                <p className="text-sm text-[#94A3B8] mb-4">
                  Monitor any EA — even those not built with AlgoStudio. Attach the Monitor EA to
                  your chart and it will send live telemetry to your dashboard.
                </p>

                <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">EA Name</label>
                <input
                  type="text"
                  value={eaName}
                  onChange={(e) => setEaName(e.target.value)}
                  placeholder="e.g. My Scalper v2"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white placeholder-[#4B5563] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] text-sm"
                  autoFocus
                />

                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !eaName.trim()}
                  className="mt-4 w-full px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? "Registering..." : "Register EA"}
                </button>
              </form>
            ) : (
              /* Success state */
              <div className="px-6 pb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-emerald-400 font-medium">
                    &quot;{result.eaName}&quot; registered successfully!
                  </p>
                </div>

                {/* API Key */}
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">API Key</label>
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    readOnly
                    value={result.apiKey}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-[#22D3EE] font-mono text-xs select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-lg border border-[rgba(79,70,229,0.3)] text-xs font-medium text-[#A78BFA] hover:bg-[#4F46E5]/20 transition-all duration-200 whitespace-nowrap"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-amber-400/80 mb-5">
                  This key is shown only once. Save it now.
                </p>

                {/* Setup instructions */}
                <h4 className="text-sm font-medium text-white mb-3">Quick Setup</h4>
                <ol className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] text-xs flex items-center justify-center font-medium">
                      1
                    </span>
                    <span>
                      Download{" "}
                      <a
                        href="/downloads/AlgoStudio_Monitor.ex5"
                        download
                        className="text-[#22D3EE] hover:underline"
                      >
                        AlgoStudio_Monitor.ex5
                      </a>{" "}
                      and place it in your MetaTrader{" "}
                      <code className="text-xs bg-[#0A0118] px-1 rounded">Experts</code> folder.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] text-xs flex items-center justify-center font-medium">
                      2
                    </span>
                    <span>
                      In MetaTrader, go to{" "}
                      <strong className="text-white">Tools → Options → Expert Advisors</strong> and
                      enable <strong className="text-white">Allow WebRequest for listed URL</strong>
                      . Add:{" "}
                      <code className="text-xs bg-[#0A0118] px-1 rounded text-[#22D3EE]">
                        https://algo-studio.com
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] text-xs flex items-center justify-center font-medium">
                      3
                    </span>
                    <span>
                      Attach <strong className="text-white">AlgoStudio_Monitor</strong> to any
                      chart. Paste the API key above into the{" "}
                      <code className="text-xs bg-[#0A0118] px-1 rounded">InpApiKey</code> input.
                    </span>
                  </li>
                </ol>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-5 w-full px-4 py-2.5 rounded-lg border border-[rgba(79,70,229,0.3)] text-sm font-medium text-[#A78BFA] hover:bg-[#4F46E5]/20 transition-all duration-200"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
