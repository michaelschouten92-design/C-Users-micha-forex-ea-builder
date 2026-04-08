"use client";

import { useState, useEffect, useCallback } from "react";
import { showSuccess, showError } from "@/lib/toast";
import { getCsrfHeaders } from "@/lib/api-client";

interface PartnerStats {
  status: string;
  commissionBps: number;
  clicks: { total: number; last30Days: number };
  signups: number;
  confirmedCustomers: number;
  totalEarnedCents: number;
  totalReversedCents: number;
  netEarnedCents: number;
  totalPaidCents: number;
  unpaidBalanceCents: number;
}

interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

const TYPE_LABELS: Record<string, string> = {
  COMMISSION_EARNED: "Commission",
  COMMISSION_REVERSED: "Reversal",
  PAYOUT_SENT: "Payout",
  ADMIN_ADJUSTMENT: "Adjustment",
};

export function ReferralsClient({ referralCode }: { referralCode: string | null }) {
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const partnerRes = await fetch("/api/referral/partner");
      const partnerData = await partnerRes.json();

      if (partnerData.partner) {
        setPartnerStatus(partnerData.partner.status);

        const [statsRes, ledgerRes] = await Promise.all([
          fetch("/api/referral/stats"),
          fetch("/api/referral/ledger?limit=20"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (ledgerRes.ok) {
          const ledgerData = await ledgerRes.json();
          setLedger(ledgerData.data ?? []);
        }
      } else {
        setPartnerStatus(null);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleApply() {
    setApplying(true);
    try {
      const res = await fetch("/api/referral/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message ?? "Application submitted!");
        setPartnerStatus("PENDING");
      } else {
        showError(data.error ?? "Failed to apply");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setApplying(false);
    }
  }

  function handleCopy() {
    if (!referralCode) return;
    navigator.clipboard.writeText(`https://algo-studio.com/?ref=${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="mt-8 text-center text-[#64748B] text-sm">Loading...</div>;
  }

  // Not a partner yet
  if (!partnerStatus) {
    return (
      <div className="mt-8 max-w-lg">
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Join the Referral Program</h2>
          <p className="text-sm text-[#A1A1AA] mb-4">
            Earn 20% recurring commission on every paying customer you refer to Algo Studio. Share
            your link, and earn commission every month they stay subscribed.
          </p>
          <ul className="text-sm text-[#A1A1AA] space-y-1 mb-6">
            <li>- 20% recurring commission on all paid plans</li>
            <li>- Monthly payouts</li>
            <li>- Real-time tracking dashboard</li>
          </ul>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#5558E6] disabled:opacity-50 transition-all"
          >
            {applying ? "Submitting..." : "Apply to Join"}
          </button>
        </div>
      </div>
    );
  }

  // Pending approval
  if (partnerStatus === "PENDING") {
    return (
      <div className="mt-8 max-w-lg">
        <div className="bg-[#111114] border border-[rgba(245,158,11,0.2)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-lg font-semibold text-white">Application Pending</h2>
          </div>
          <p className="text-sm text-[#A1A1AA]">
            Your application is being reviewed. You&apos;ll be notified once approved.
          </p>
        </div>
      </div>
    );
  }

  // Suspended
  if (partnerStatus === "SUSPENDED" || partnerStatus === "TERMINATED") {
    return (
      <div className="mt-8 max-w-lg">
        <div className="bg-[#111114] border border-[rgba(239,68,68,0.2)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">
            Partner Account {partnerStatus === "SUSPENDED" ? "Suspended" : "Terminated"}
          </h2>
          <p className="text-sm text-[#A1A1AA]">Contact support for more information.</p>
        </div>
      </div>
    );
  }

  // Active partner dashboard
  const referralLink = `https://algo-studio.com/?ref=${referralCode}`;

  return (
    <div className="mt-6 space-y-6">
      {/* Referral Link */}
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
        <h2 className="text-sm font-medium text-[#A1A1AA] mb-2">Your Referral Link</h2>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 px-3 py-2 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-sm text-white font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#5558E6] transition-all"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Clicks (30d)" value={stats.clicks.last30Days.toString()} />
          <StatCard label="Signups" value={stats.signups.toString()} />
          <StatCard label="Paying Customers" value={stats.confirmedCustomers.toString()} />
          <StatCard label="Commission Rate" value={`${(stats.commissionBps / 100).toFixed(0)}%`} />
          <StatCard label="Total Earned" value={formatCents(stats.netEarnedCents)} accent />
          <StatCard label="Total Paid" value={formatCents(stats.totalPaidCents)} />
          <StatCard
            label="Pending Payout"
            value={formatCents(stats.unpaidBalanceCents)}
            accent={stats.unpaidBalanceCents > 0}
          />
          <StatCard label="Total Clicks" value={stats.clicks.total.toString()} />
        </div>
      )}

      {/* Ledger */}
      {ledger.length > 0 && (
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[#A1A1AA] mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0"
              >
                <div>
                  <span className="text-sm text-white">
                    {TYPE_LABELS[entry.type] ?? entry.type}
                  </span>
                  {entry.description && (
                    <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[300px]">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      entry.amountCents >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {entry.amountCents >= 0 ? "+" : ""}
                    {formatCents(entry.amountCents)}
                  </span>
                  <span className="text-xs text-[#52525B]">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#52525B] mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${accent ? "text-[#10B981]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
