"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { AdminTabs, type AdminTab } from "./components/admin-tabs";
import { UsersTab } from "./components/users-tab";
import { AuditLogTab } from "./components/audit-log-tab";
import { RevenueTab } from "./components/revenue-tab";
import { ExportsTab } from "./components/exports-tab";
import { AnalyticsTab } from "./components/analytics-tab";
import { AnnouncementsTab } from "./components/announcements-tab";
import { LiveEAsTab } from "./components/live-eas-tab";
import { PlanLimitsTab } from "./components/plan-limits-tab";
import { SystemHealthTab } from "./components/system-health-tab";
import { UserDetailModal } from "./components/user-detail-modal";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  referredBy?: string;
  subscription: { tier: string; status: string };
  projectCount: number;
  exportCount: number;
  activityStatus?: "active" | "inactive";
  churnRisk?: boolean;
}

interface AdminStats {
  mrr: number;
  exportsToday: number;
}

function OtpVerification({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestOtp() {
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/api/admin/otp", { action: "request" });
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/api/admin/otp", { action: "verify", code });
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#4F46E5]/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#A78BFA]"
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
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin Verification</h2>

        {step === "request" ? (
          <>
            <p className="text-sm text-[#94A3B8] mb-6">
              A 6-digit code will be sent to your admin email address.
            </p>
            {error && <p className="text-sm text-[#EF4444] mb-4">{error}</p>}
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-all"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#94A3B8] mb-6">
              Enter the 6-digit code sent to your email.
            </p>
            {error && <p className="text-sm text-[#EF4444] mb-4">{error}</p>}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono bg-[#0A0118] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#7C8DB0]/30 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 transition-all"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="mt-3 text-xs text-[#7C8DB0] hover:text-[#A78BFA] transition-colors"
            >
              Resend code
            </button>
          </>
        )}

        <div className="mt-6">
          <Link
            href="/app"
            className="text-xs text-[#7C8DB0] hover:text-[#22D3EE] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [extraStats, setExtraStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchExtraStats();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setDenied(false);
    setNeedsOtp(false);
    try {
      const res = await apiClient.get<{ data: UserData[]; adminEmail: string }>("/api/admin/users");
      setUsers(res.data);
      setAdminEmail(res.adminEmail);
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("otp")) {
        setNeedsOtp(true);
      } else {
        setDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchExtraStats() {
    try {
      const res = await apiClient.get<AdminStats>("/api/admin/stats");
      setExtraStats(res);
    } catch {
      // non-critical
    }
  }

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: users.length,
      newThisWeek: users.filter((u) => new Date(u.createdAt) >= oneWeekAgo).length,
      pro: users.filter((u) => u.subscription.tier === "PRO").length,
      elite: users.filter((u) => u.subscription.tier === "ELITE").length,
    };
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#A78BFA] text-lg">Loading...</div>
      </div>
    );
  }

  if (needsOtp) {
    return (
      <OtpVerification
        onVerified={() => {
          fetchUsers();
          fetchExtraStats();
        }}
      />
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-[#94A3B8] mb-4">You do not have permission to view this page.</p>
          <Link href="/app" className="text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Admin Panel
              </span>
            </div>
            <Link
              href="/app"
              className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats cards — always visible */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">Total Users</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">New This Week</div>
            <div className="text-2xl font-bold text-[#22D3EE] mt-1">{stats.newThisWeek}</div>
          </div>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">PRO</div>
            <div className="text-2xl font-bold text-[#4F46E5] mt-1">{stats.pro}</div>
          </div>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">ELITE</div>
            <div className="text-2xl font-bold text-[#A78BFA] mt-1">{stats.elite}</div>
          </div>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">MRR</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {extraStats ? `\u20AC${extraStats.mrr.toLocaleString()}` : "..."}
            </div>
          </div>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">Exports Today</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {extraStats ? extraStats.exportsToday : "..."}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "users" && (
          <UsersTab
            users={users}
            adminEmail={adminEmail}
            onRefresh={fetchUsers}
            onUserClick={setDetailUserId}
          />
        )}
        {activeTab === "audit" && <AuditLogTab onUserClick={setDetailUserId} />}
        {activeTab === "revenue" && <RevenueTab sharedUsers={users} />}
        {activeTab === "exports" && <ExportsTab />}
        {activeTab === "analytics" && <AnalyticsTab sharedUsers={users} />}
        {activeTab === "announcements" && <AnnouncementsTab />}
        {activeTab === "live-eas" && <LiveEAsTab />}
        {activeTab === "plan-limits" && <PlanLimitsTab />}
        {activeTab === "system-health" && <SystemHealthTab />}
      </main>

      {/* User detail modal */}
      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
