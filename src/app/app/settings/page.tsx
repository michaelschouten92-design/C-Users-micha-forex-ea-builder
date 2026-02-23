"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { PushNotificationToggle } from "@/components/app/push-notification-toggle";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { ReferralsSection } from "./referrals-section";

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

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      <nav
        role="navigation"
        aria-label="App navigation"
        className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-[#7C8DB0]">/</span>
              <span className="text-[#94A3B8]">Settings</span>
            </div>
            <Link href="/app" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Settings" }]} />
        <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

        <div className="space-y-6">
          {/* Email */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Email</h2>
            <div className="flex items-center flex-wrap">
              <p className="text-[#94A3B8] text-sm break-all">
                {session?.user?.email || "Loading..."}
              </p>
              {session?.user?.email && <CopyButton text={session.user.email} />}
              {session?.user && (
                <span
                  className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${
                    session.user.emailVerified
                      ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                      : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                  }`}
                >
                  {session.user.emailVerified ? "Verified" : "Not verified"}
                </span>
              )}
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Subscription</h2>
            <p className="text-sm text-[#94A3B8] mb-4">
              Manage your plan, billing, and payment method from the dashboard.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Manage Subscription
            </Link>
          </div>

          {/* Push Notifications */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Push Notifications</h2>
            <p className="text-sm text-[#94A3B8] mb-4">
              Receive browser push notifications for alerts (drawdown, offline, new trades, errors).
              Works even when AlgoStudio is not open.
            </p>
            <PushNotificationToggle />
          </div>

          {/* Referral Program */}
          <ReferralsSection />

          {/* Change Password */}
          <ChangePasswordSection />

          {/* Data & Privacy */}
          <DataExportSection />

          {/* Delete Account */}
          <DeleteAccountSection />
        </div>
      </main>
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

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
          className="px-6 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    if (confirmText.toUpperCase() !== "DELETE") return;

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ confirm: "DELETE" }),
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
          className="px-6 py-2.5 text-sm font-medium text-[#EF4444] border border-[rgba(239,68,68,0.3)] rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#EF4444]">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(239,68,68,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all duration-200"
            placeholder="Type DELETE"
          />
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText.toUpperCase() !== "DELETE" || loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
              className="px-6 py-2.5 text-sm font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.3)] rounded-lg hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
