"use client";

import { useState, useEffect } from "react";

interface WebhookSetupGuideProps {
  webhookUrl?: string | null;
}

type TestStatus = "idle" | "testing" | "success" | "error";

export function WebhookSetupGuide({
  webhookUrl: initialUrl,
}: WebhookSetupGuideProps): React.ReactNode {
  const [expanded, setExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Fetch current webhook URL on mount
  useEffect(() => {
    if (initialUrl !== undefined) return;
    async function fetchUrl(): Promise<void> {
      try {
        const res = await fetch("/api/account/webhook");
        if (res.ok) {
          const data = await res.json();
          setWebhookUrl(data.webhookUrl ?? "");
        }
      } catch {
        // Silently fail
      }
    }
    fetchUrl();
  }, [initialUrl]);

  async function handleCopyUrl(): Promise<void> {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard errors
    }
  }

  async function handleSaveUrl(): Promise<void> {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/account/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMessage("Webhook URL saved.");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage(data.error ?? "Failed to save.");
      }
    } catch {
      setSaveMessage("Failed to save webhook URL.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(): Promise<void> {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus("success");
        setTestMessage(data.message ?? "Connection successful! Your webhook is working.");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Connection test failed. Check your URL and try again.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Failed to reach the test endpoint. Please try again.");
    }
  }

  const steps = [
    {
      title: "Set Your Webhook URL",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#94A3B8]">
            Enter the URL where your EA will send trade notifications. This should be an HTTPS
            endpoint that accepts POST requests with JSON payloads.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="flex-1 px-3 py-2 text-sm bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#475569] focus:outline-none focus:border-[#4F46E5] transition-colors"
            />
            <button
              onClick={handleCopyUrl}
              disabled={!webhookUrl}
              className="px-3 py-2 text-sm bg-[#1E293B] text-[#CBD5E1] rounded-lg hover:bg-[rgba(79,70,229,0.2)] border border-[rgba(79,70,229,0.3)] disabled:opacity-40 transition-all duration-200"
              title="Copy URL"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveUrl}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-all duration-200"
            >
              {saving ? "Saving..." : "Save URL"}
            </button>
            {saveMessage && <span className="text-xs text-[#22D3EE]">{saveMessage}</span>}
          </div>
        </div>
      ),
    },
    {
      title: "Configure in MT5",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#94A3B8]">
            After exporting your EA, the webhook URL is embedded in the generated code. To change it
            later:
          </p>
          <ol className="space-y-2 text-xs text-[#CBD5E1]">
            <li className="flex gap-2">
              <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                1
              </span>
              <span>Open your EA in MetaEditor (double-click the .mq5 file)</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                2
              </span>
              <span>
                Find the{" "}
                <code className="text-[#22D3EE] bg-[rgba(34,211,238,0.1)] px-1 rounded">
                  WebhookURL
                </code>{" "}
                input parameter near the top of the file
              </span>
            </li>
            <li className="flex gap-2">
              <span className="bg-[#4F46E5] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                3
              </span>
              <span>
                Or change it in the EA Inputs tab when attaching to a chart (no recompile needed)
              </span>
            </li>
          </ol>
          <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)] rounded-lg p-3">
            <p className="text-[10px] text-[#7C8DB0]">
              The EA sends a POST request with JSON payload on every trade event: open, close,
              modification, and errors. The payload includes trade details, account info, and
              timestamps.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Test the Connection",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-[#94A3B8]">
            Send a test payload to verify your webhook endpoint is reachable and responds correctly.
          </p>
          <button
            onClick={handleTestConnection}
            disabled={!webhookUrl || testStatus === "testing"}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#22D3EE] rounded-lg hover:bg-[#06B6D4] disabled:opacity-50 transition-all duration-200"
          >
            {testStatus === "testing" ? (
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
            {testStatus === "testing" ? "Testing..." : "Send Test Payload"}
          </button>

          {testStatus === "success" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
              <svg
                className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5"
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
              <span className="text-xs text-[#6EE7B7]">{testMessage}</span>
            </div>
          )}

          {testStatus === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
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
              <span className="text-xs text-[#FCA5A5]">{testMessage}</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[rgba(79,70,229,0.05)] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#4F46E5] flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Webhook Setup</h3>
            <p className="text-xs text-[#7C8DB0]">Receive trade notifications in real-time</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-[#7C8DB0] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Step tabs */}
          <div className="flex gap-1 mb-4">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-200 ${
                  i === currentStep
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[#0F172A] text-[#7C8DB0] hover:text-white hover:bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.2)]"
                }`}
              >
                <span className="mr-1.5">{i + 1}.</span>
                {step.title}
              </button>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[140px]">{steps[currentStep].content}</div>

          {/* Step navigation */}
          <div className="flex justify-between mt-4 pt-3 border-t border-[rgba(79,70,229,0.15)]">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentStep ? "w-5 bg-[#22D3EE]" : "w-1.5 bg-[#334155]"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              className="px-3 py-1.5 text-xs text-[#22D3EE] hover:text-white disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
