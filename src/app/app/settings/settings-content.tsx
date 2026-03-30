"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PushNotificationToggle } from "@/components/app/push-notification-toggle";
import { HandleSetting } from "@/components/app/handle-setting";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-2 text-[#7C8DB0] hover:text-[#22D3EE] transition-colors p-1"
      title="Copy email"
      aria-label="Copy email to clipboard"
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-[#10B981]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

type SettingsContentProps = {
  email: string;
  emailVerified: boolean;
};

export function SettingsContent({ email, emailVerified }: SettingsContentProps) {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Email</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 flex-wrap">
          <div className="flex items-center min-w-0">
            <p className="text-[#94A3B8] text-sm break-all">{email}</p>
            <CopyButton text={email} />
          </div>
          <span
            className={`sm:ml-3 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
              emailVerified
                ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
            }`}
          >
            {emailVerified ? "Verified" : "Not verified"}
          </span>
        </div>
      </div>

      {/* Public Handle */}
      <HandleSetting />

      {/* Push Notifications */}
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Push Notifications</h2>
        <p className="text-sm text-[#94A3B8] mb-4">
          Receive browser push notifications for alerts (drawdown, offline, new trades, errors).
          Works even when AlgoStudio is not open.
        </p>
        <PushNotificationToggle />
      </div>

      {/* Webhook */}
      <WebhookSection />

      {/* Change Password */}
      <ChangePasswordSection />

      {/* Data & Privacy */}
      <DataExportSection />

      {/* Delete Account */}
      <DeleteAccountSection />
    </div>
  );
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (password.length === 0) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "#EF4444" };
  if (score <= 4) return { score: 2, label: "Fair", color: "#F59E0B" };
  if (score <= 5) return { score: 3, label: "Good", color: "#FBBF24" };
  return { score: 4, label: "Strong", color: "#10B981" };
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      showError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.error || "Failed to change password");
      } else {
        showSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-[#CBD5E1] mb-1"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type={showPasswords ? "text" : "password"}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-[#CBD5E1] mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type={showPasswords ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
            placeholder="Minimum 8 characters"
          />
          {newPassword.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1.5 flex-1 rounded-full transition-colors duration-200"
                    style={{
                      backgroundColor:
                        level <= passwordStrength.score ? passwordStrength.color : "#1E293B",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="confirmNewPassword"
            className="block text-sm font-medium text-[#CBD5E1] mb-1"
          >
            Confirm New Password
          </label>
          <input
            id="confirmNewPassword"
            type={showPasswords ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#4F46E5] focus:ring-[#22D3EE]"
          />
          Show passwords
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

function DataExportSection() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export", {
        headers: getCsrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to export data");
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `algostudio-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
      showSuccess("Data exported successfully");
    } catch {
      showError("Something went wrong");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Data & Privacy</h2>
      <p className="text-sm text-[#94A3B8] mb-4">
        Download all your projects and account data as a JSON file. Useful for backup or data
        migration.
      </p>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {exporting ? (
          <>
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
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export My Data
          </>
        )}
      </button>
    </div>
  );
}

function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    if (confirmText.toUpperCase() !== "DELETE") return;
    if (deletePassword.length === 0) {
      showError("Please enter your current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ confirm: "DELETE", password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to delete account");
      } else {
        window.location.href = "/login";
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(239,68,68,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#EF4444] mb-2">Delete Account</h2>

      <p className="text-sm text-[#94A3B8] mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-[#EF4444] border border-[rgba(239,68,68,0.3)] rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-4">
          {/* Consequences warning */}
          <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg p-4">
            <p className="text-sm font-medium text-[#EF4444] mb-2">This will permanently delete:</p>
            <ul className="space-y-1.5 text-sm text-[#FCA5A5]">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] flex-shrink-0" />
                All your projects and strategy builds
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] flex-shrink-0" />
                All exported Expert Advisors (EAs)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] flex-shrink-0" />
                Journal entries and track record data
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] flex-shrink-0" />
                Account settings and subscription
              </li>
            </ul>
          </div>

          {/* Step 1: Password confirmation */}
          <div>
            <label
              htmlFor="deleteAccountPassword"
              className="block text-sm font-medium text-[#CBD5E1] mb-1"
            >
              Enter your current password
            </label>
            <input
              id="deleteAccountPassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(239,68,68,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all duration-200"
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>

          {/* Step 2: Type DELETE */}
          <div>
            <p className="text-sm text-[#EF4444] mb-1">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(239,68,68,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all duration-200"
              placeholder="Type DELETE"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDelete}
              disabled={
                confirmText.toUpperCase() !== "DELETE" || deletePassword.length === 0 || loading
              }
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Deleting..." : "Permanently Delete Account"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setDeletePassword("");
              }}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.3)] rounded-lg hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_PAYLOAD = `{
  "event": "control_layer_alert",
  "alertId": "clx9abc123def",
  "alertType": "DEPLOYMENT_INVALIDATED",
  "summary": "Deployment has been invalidated. Trading authority revoked.",
  "reasons": ["MONITORING_DRAWDOWN_BREACH"],
  "deploymentId": "clx7xyz456ghi",
  "deploymentName": "Trend-Following EURUSD",
  "createdAt": "2026-03-08T14:30:00.000Z"
}`;

function WebhookSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const fetchUrl = useCallback(async () => {
    try {
      const res = await fetch("/api/account/webhook");
      if (res.ok) {
        const data = await res.json();
        setUrl(data.webhookUrl ?? "");
      }
    } catch {
      // Silently fail
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ webhookUrl: url || null }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(url ? "Webhook URL saved" : "Webhook disabled");
      } else {
        showError(data.error ?? "Failed to save webhook URL");
      }
    } catch {
      showError("Failed to save webhook URL");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    if (!url) return;
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus("success");
        setTestMessage(data.message ?? "Webhook endpoint is reachable.");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Test failed. Check your URL.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Could not reach the test endpoint.");
    }
  }

  if (!loaded) return null;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Webhook Alerts</h2>
      <p className="text-sm text-[#94A3B8] mb-4">
        AlgoStudio sends an HTTP POST to your endpoint when a new control-layer alert is created —
        deployment invalidated, restricted, review required, offline, baseline missing, or version
        outdated.
      </p>

      {/* URL input + Save */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="flex-1 px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 text-sm"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Test button + result */}
      {url && (
        <div className="mb-4">
          <button
            onClick={handleTest}
            disabled={testStatus === "testing"}
            className="text-xs text-[#818CF8] hover:text-white transition-colors disabled:opacity-50"
          >
            {testStatus === "testing" ? "Testing..." : "Send test payload"}
          </button>
          {testStatus === "success" && (
            <p className="text-[11px] text-[#10B981] mt-1">{testMessage}</p>
          )}
          {testStatus === "error" && (
            <p className="text-[11px] text-[#EF4444] mt-1">{testMessage}</p>
          )}
        </div>
      )}

      {/* Sample payload toggle */}
      <button
        onClick={() => setShowPayload((p) => !p)}
        className="text-xs text-[#7C8DB0] hover:text-white transition-colors mb-2"
      >
        {showPayload ? "Hide" : "Show"} sample payload
      </button>
      {showPayload && (
        <pre className="text-[11px] text-[#CBD5E1] bg-[#0A0118] border border-[rgba(79,70,229,0.1)] rounded-lg p-3 overflow-x-auto mb-4 leading-relaxed">
          {SAMPLE_PAYLOAD}
        </pre>
      )}

      {/* Delivery semantics */}
      <div className="space-y-1.5 text-[11px] text-[#7C8DB0]">
        <p>Webhooks are sent once per new alert. Duplicate alerts are not resent.</p>
        <p>Delivery is best-effort with a 5-second timeout. There are no retries.</p>
        <p>One webhook URL per account. Delivery status is shown on each alert in the bell menu.</p>
        {url && (
          <p>
            Payloads are signed via the{" "}
            <code className="text-[#818CF8]">X-AlgoStudio-Signature</code> header (HMAC-SHA256) when
            server signing is enabled.
          </p>
        )}
      </div>
    </div>
  );
}
