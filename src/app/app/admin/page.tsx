"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { AdminPageHeader } from "./components/admin-page-header";
import { HealthRadar } from "./components/health-radar";
import { AttentionQueue } from "./components/attention-queue";
import { StrategyDistributionPanel } from "./components/strategy-distribution-panel";

interface UserData {
  id: string;
  email: string;
  subscription: { tier: string; status: string };
  createdAt: string;
}

interface AdminStats {
  mrr: number;
  liveStrategyCount: number;
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 max-w-sm w-full text-center">
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

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [extraStats, setExtraStats] = useState<AdminStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    setNeedsOtp(false);
    try {
      const res = await apiClient.get<{ data: UserData[]; adminEmail: string }>(
        "/api/admin/users?limit=50"
      );
      setUsers(res.data);
      setAdminEmail(res.adminEmail);
      const stats = await apiClient.get<AdminStats>("/api/admin/stats").catch(() => null);
      if (stats) setExtraStats(stats);
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("otp")) {
        setNeedsOtp(true);
      } else {
        setDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[#111114] rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4"
            >
              <div className="h-3 w-16 bg-[#18181B] rounded animate-pulse" />
              <div className="h-7 w-12 bg-[#18181B] rounded animate-pulse mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (needsOtp) return <OtpVerification onVerified={fetchData} />;

  if (denied) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 max-w-sm w-full text-center">
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

  const statCards = [
    { label: "Total Users", value: String(stats.total), color: "#FAFAFA" },
    { label: "New This Week", value: String(stats.newThisWeek), color: "#10B981" },
    { label: "Control", value: String(stats.control), color: "#6366F1" },
    { label: "Authority", value: String(stats.authority), color: "#818CF8" },
    { label: "Institutional", value: String(stats.institutional), color: "#F59E0B" },
    {
      label: "MRR",
      value: extraStats ? `€${extraStats.mrr.toLocaleString()}` : "—",
      color: "#10B981",
    },
    {
      label: "Strategies",
      value: extraStats ? String(extraStats.liveStrategyCount) : "—",
      color: "#FAFAFA",
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle={adminEmail ? `Signed in as ${adminEmail}` : undefined}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4"
          >
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
              {card.label}
            </div>
            <div className="text-xl font-bold mt-1 tabular-nums" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Health + Attention + Strategy */}
      <div className="space-y-6">
        <HealthRadar />
        <AttentionQueue />
        <StrategyDistributionPanel />
      </div>
    </>
  );
}
