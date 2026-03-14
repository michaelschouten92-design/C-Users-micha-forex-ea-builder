"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { StrategyDistributionPanel } from "./components/strategy-distribution-panel";
import { AttentionQueue } from "./components/attention-queue";
import { IncidentsTab } from "./components/incidents-tab";

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
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(99,102,241,0.10)] flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#818CF8]"
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
        <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">Admin Verification</h2>

        {step === "request" ? (
          <>
            <p className="text-sm text-[#A1A1AA] mb-6">
              A 6-digit code will be sent to your admin email address.
            </p>
            {error && <p className="text-sm text-[#EF4444] mb-4">{error}</p>}
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#818CF8] disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#A1A1AA] mb-6">
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
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded-lg text-[#FAFAFA] placeholder-[#71717A]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-colors"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#818CF8] disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="mt-3 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
            >
              Resend code
            </button>
          </>
        )}

        <div className="mt-6">
          <Link
            href="/app"
            className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
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
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [extraStats, setExtraStats] = useState<AdminStats | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    setNeedsOtp(false);
    try {
      const res = await apiClient.get<{ data: UserData[]; adminEmail: string }>("/api/admin/users");
      setUsers(res.data);
      setAdminEmail(res.adminEmail);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("otp")) {
        setNeedsOtp(true);
      } else {
        setDenied(true);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExtraStats = useCallback(async () => {
    try {
      const res = await apiClient.get<AdminStats>("/api/admin/stats");
      setExtraStats(res);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const ok = await fetchUsers();
      if (ok && !cancelled) {
        fetchExtraStats();
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchUsers, fetchExtraStats]);

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: users.length,
      newThisWeek: users.filter((u) => new Date(u.createdAt) >= oneWeekAgo).length,
      control: users.filter((u) => u.subscription.tier === "PRO").length,
      authority: users.filter((u) => u.subscription.tier === "ELITE").length,
      institutional: users.filter((u) => u.subscription.tier === "INSTITUTIONAL").length,
    };
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <div className="sticky top-0 z-20 bg-[#09090B] border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
          <div className="h-7 w-48 bg-[#111114] rounded animate-pulse" />
        </div>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-8 w-64 bg-[#111114] rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-[#111114] rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
              >
                <div className="h-3 w-16 bg-[#18181B] rounded animate-pulse" />
                <div className="h-7 w-12 bg-[#18181B] rounded animate-pulse mt-3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
              >
                <div className="h-3 w-16 bg-[#18181B] rounded animate-pulse" />
                <div className="h-7 w-20 bg-[#18181B] rounded animate-pulse mt-3" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-[#111114] rounded-full animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#111114] rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (needsOtp) {
    return (
      <OtpVerification
        onVerified={() => {
          fetchUsers().then((ok) => {
            if (ok) fetchExtraStats();
          });
        }}
      />
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.10)] flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[#EF4444]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#FAFAFA] mb-2">Access Denied</h1>
          <p className="text-sm text-[#A1A1AA] mb-6">
            You do not have permission to view this page.
          </p>
          <Link
            href="/app"
            className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <nav className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-[#FAFAFA]">AlgoStudio</h1>
              <span className="text-[10px] text-[#71717A] font-semibold tracking-widest uppercase hidden sm:inline">
                Admin
              </span>
            </div>
            <Link
              href="/app"
              className="text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Operations Overview</h2>
          <p className="text-sm text-[#71717A] mt-1">
            {adminEmail ? `Signed in as ${adminEmail}` : "Admin panel"}
            {" \u00B7 "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Stats — Users */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#71717A] mb-3">
            Users
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(
              [
                { label: "Total", value: stats.total, color: "#FAFAFA" },
                { label: "New This Week", value: stats.newThisWeek, color: "#10B981" },
                { label: "Control", value: stats.control, color: "#6366F1" },
                { label: "Authority", value: stats.authority, color: "#818CF8" },
                { label: "Institutional", value: stats.institutional, color: "#F59E0B" },
              ] as const
            ).map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
              >
                <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71717A]">
                  {card.label}
                </div>
                <div
                  className="text-2xl font-bold mt-1.5 tabular-nums"
                  style={{ color: card.color }}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats — Revenue */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#71717A] mb-3">
            Revenue
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71717A]">
                MRR
              </div>
              <div className="text-2xl font-bold text-[#10B981] mt-1.5 tabular-nums">
                {extraStats ? `\u20AC${extraStats.mrr.toLocaleString()}` : "\u2014"}
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71717A]">
                Exports Today
              </div>
              <div className="text-2xl font-bold text-[#FAFAFA] mt-1.5 tabular-nums">
                {extraStats ? extraStats.exportsToday : "\u2014"}
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <StrategyDistributionPanel />
            <AttentionQueue />
          </div>
        )}
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
        {activeTab === "incidents" && <IncidentsTab />}
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
