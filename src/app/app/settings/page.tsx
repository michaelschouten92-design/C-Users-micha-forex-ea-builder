"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link href="/app" className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors">
                AlgoStudio
              </Link>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#94A3B8]">Settings</span>
            </div>
            <Link
              href="/app"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

        <div className="space-y-6">
          {/* Email */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Email</h2>
            <p className="text-[#94A3B8] text-sm">
              {session?.user?.email || "Loading..."}
            </p>
          </div>

          {/* Change Password */}
          <ChangePasswordSection />

          {/* Referral */}
          <ReferralSection />

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

      const data = await res.json();

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
          <label htmlFor="currentPassword" className="block text-sm font-medium text-[#CBD5E1] mb-1">
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
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
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
            placeholder="Minimum 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-[#CBD5E1] mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>
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

function ReferralSection() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadReferral() {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      if (res.ok) {
        const data = await res.json();
        setReferralCode(data.referralCode);
        setReferralCount(data.referralCount);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!referralCode) return;
    const url = `${window.location.origin}/login?mode=register&ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Referrals</h2>
      <p className="text-sm text-[#94A3B8] mb-4">
        Invite friends to AlgoStudio and help them get started with automated trading.
      </p>
      {referralCode ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/login?mode=register&ref=${referralCode}`}
              className="flex-1 px-4 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] text-sm"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-all duration-200"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-[#64748B]">
            {referralCount} {referralCount === 1 ? "person has" : "people have"} signed up with your link.
          </p>
        </div>
      ) : (
        <button
          onClick={loadReferral}
          disabled={loading}
          className="px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-all duration-200"
        >
          {loading ? "Loading..." : "Get Referral Link"}
        </button>
      )}
    </div>
  );
}

function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      if (!res.ok) {
        const data = await res.json();
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
              disabled={confirmText !== "DELETE" || loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
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
