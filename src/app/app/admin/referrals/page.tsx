"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";
import { AdminPageHeader } from "../components/admin-page-header";
import { ConfirmDialog } from "../components/confirm-dialog";

interface PartnerData {
  id: string;
  email: string;
  referralCode: string;
  status: string;
  commissionBps: number;
  payoutEmail: string | null;
  clicks: number;
  attributions: number;
  totalEarnedCents: number;
  totalReversedCents: number;
  totalPaidCents: number;
  unpaidBalanceCents: number;
  createdAt: string;
}

interface PayoutData {
  id: string;
  partnerId: string;
  partnerEmail: string;
  amountCents: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  approvedBy: string | null;
  paidAt: string | null;
  paidReference: string | null;
  createdAt: string;
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

type SubTab = "partners" | "payouts";

export default function AdminReferralsPage() {
  const [subTab, setSubTab] = useState<SubTab>("partners");
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPct, setEditPct] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "default";
  } | null>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: PartnerData[] }>("/api/admin/referrals");
      setPartners(res.data);
    } catch {
      showError("Failed to load partners");
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: PayoutData[] }>("/api/admin/referrals/payouts");
      setPayouts(res.data);
    } catch {
      showError("Failed to load payouts");
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      await Promise.all([fetchPartners(), fetchPayouts()]);
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStatusChange(partnerId: string, status: string) {
    try {
      await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ partnerId, status }),
      });
      showSuccess(`Partner ${status.toLowerCase()}`);
      fetchPartners();
    } catch {
      showError("Failed to update status");
    }
  }

  async function handleSaveCommission(partnerId: string) {
    const pct = parseFloat(editPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showError("Must be 0–100");
      return;
    }
    try {
      await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ partnerId, commissionPct: pct }),
      });
      showSuccess(`Commission set to ${pct}%`);
      setEditingId(null);
      fetchPartners();
    } catch {
      showError("Failed to update commission");
    }
  }

  async function handleCreatePayout(partnerId: string) {
    try {
      const res = await fetch("/api/admin/referrals/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ partnerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error ?? "Failed");
        return;
      }
      showSuccess("Payout batch created");
      fetchPartners();
      fetchPayouts();
    } catch {
      showError("Failed to create payout");
    }
  }

  async function handlePayoutAction(payoutId: string, action: string, paidReference?: string) {
    try {
      await fetch("/api/admin/referrals/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ payoutId, action, paidReference }),
      });
      showSuccess(`Payout ${action === "pay" ? "marked as paid" : action + "d"}`);
      fetchPayouts();
      fetchPartners();
    } catch {
      showError("Failed to update payout");
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-[#10B981]/15 text-[#10B981]",
    PENDING: "bg-[#F59E0B]/15 text-[#F59E0B]",
    SUSPENDED: "bg-[#EF4444]/15 text-[#EF4444]",
    TERMINATED: "bg-[#71717A]/15 text-[#71717A]",
    APPROVED: "bg-[#818CF8]/15 text-[#818CF8]",
    PAID: "bg-[#10B981]/15 text-[#10B981]",
    CANCELLED: "bg-[#71717A]/15 text-[#71717A]",
  };

  const tabs: { id: SubTab; label: string }[] = [
    { id: "partners", label: "Partners" },
    { id: "payouts", label: "Payouts" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#111114] rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#111114] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Referrals"
        subtitle={`${partners.length} partners · ${partners.filter((p) => p.status === "PENDING").length} pending approval`}
      />

      <div className="flex gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subTab === tab.id
                ? "bg-[rgba(99,102,241,0.12)] text-[#818CF8]"
                : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "partners" && (
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Partner
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Rate
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Clicks
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Referrals
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Earned
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Unpaid
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-4 py-3">
                      <div className="text-[#FAFAFA] font-medium">{p.email}</div>
                      <div className="text-[10px] text-[#52525B] font-mono">{p.referralCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "text-[#71717A]"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === p.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editPct}
                            onChange={(e) => setEditPct(e.target.value)}
                            className="w-16 px-2 py-1 text-right text-sm bg-[#09090B] border border-[rgba(99,102,241,0.3)] rounded text-white"
                            min={0}
                            max={100}
                            autoFocus
                          />
                          <span className="text-[#71717A] text-xs">%</span>
                          <button
                            onClick={() => handleSaveCommission(p.id)}
                            className="text-[#10B981] text-xs ml-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[#71717A] text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPct(String(p.commissionBps / 100));
                          }}
                          className="text-[#FAFAFA] hover:text-[#818CF8] transition-colors tabular-nums"
                        >
                          {(p.commissionBps / 100).toFixed(0)}%
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#A1A1AA] tabular-nums">{p.clicks}</td>
                    <td className="px-4 py-3 text-right text-[#A1A1AA] tabular-nums">
                      {p.attributions}
                    </td>
                    <td className="px-4 py-3 text-right text-[#10B981] tabular-nums">
                      {formatCents(p.totalEarnedCents - p.totalReversedCents)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-[#FAFAFA]">
                      {formatCents(p.unpaidBalanceCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => handleStatusChange(p.id, "ACTIVE")}
                            className="text-[10px] font-medium px-2 py-1 rounded bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === "ACTIVE" && p.unpaidBalanceCents > 0 && (
                          <button
                            onClick={() =>
                              setConfirmAction({
                                title: "Create Payout",
                                message: `Create payout of ${formatCents(p.unpaidBalanceCents)} for ${p.email}?`,
                                onConfirm: () => handleCreatePayout(p.id),
                              })
                            }
                            className="text-[10px] font-medium px-2 py-1 rounded bg-[#818CF8]/15 text-[#818CF8] hover:bg-[#818CF8]/25 transition-colors"
                          >
                            Payout
                          </button>
                        )}
                        {p.status === "ACTIVE" && (
                          <button
                            onClick={() =>
                              setConfirmAction({
                                title: "Suspend Partner",
                                message: `Suspend ${p.email}? They won't earn commissions while suspended.`,
                                onConfirm: () => handleStatusChange(p.id, "SUSPENDED"),
                                variant: "danger",
                              })
                            }
                            className="text-[10px] font-medium px-2 py-1 rounded text-[#71717A] hover:text-[#EF4444] transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {p.status === "SUSPENDED" && (
                          <button
                            onClick={() => handleStatusChange(p.id, "ACTIVE")}
                            className="text-[10px] font-medium px-2 py-1 rounded text-[#818CF8] hover:text-white transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#71717A] text-sm">
                      No partners yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "payouts" && (
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Partner
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Period
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-4 py-3 text-[#FAFAFA]">{p.partnerEmail}</td>
                    <td className="px-4 py-3 text-right text-[#FAFAFA] font-medium tabular-nums">
                      {formatCents(p.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "text-[#71717A]"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA] text-xs">
                      {new Date(p.periodStart).toLocaleDateString()} —{" "}
                      {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-[#71717A] text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handlePayoutAction(p.id, "approve")}
                              className="text-[10px] font-medium px-2 py-1 rounded bg-[#818CF8]/15 text-[#818CF8] hover:bg-[#818CF8]/25 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handlePayoutAction(p.id, "cancel")}
                              className="text-[10px] font-medium px-2 py-1 rounded text-[#71717A] hover:text-[#EF4444] transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {p.status === "APPROVED" && (
                          <>
                            <button
                              onClick={() => {
                                const ref = prompt("Bank transfer reference:");
                                if (ref !== null) handlePayoutAction(p.id, "pay", ref);
                              }}
                              className="text-[10px] font-medium px-2 py-1 rounded bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 transition-colors"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handlePayoutAction(p.id, "cancel")}
                              className="text-[10px] font-medium px-2 py-1 rounded text-[#71717A] hover:text-[#EF4444] transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {p.status === "PAID" && p.paidReference && (
                          <span className="text-[10px] text-[#52525B]">Ref: {p.paidReference}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#71717A] text-sm">
                      No payouts yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
          variant={confirmAction.variant}
        />
      )}
    </>
  );
}
