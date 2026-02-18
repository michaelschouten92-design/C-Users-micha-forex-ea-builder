"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

type Tier = "FREE" | "PRO" | "ELITE";

interface UserDetail {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  adminNotes: string | null;
  role: string;
  referralCode: string | null;
  referredBy: string | null;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  subscription: {
    tier: string;
    status: string;
    stripeCustomerId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
    updatedAt: string;
    _count: { versions: number; exports: number };
  }[];
  exports: {
    id: string;
    exportType: string;
    status: string;
    createdAt: string;
    errorMessage: string | null;
    project: { name: string };
  }[];
  auditLogs: {
    id: string;
    eventType: string;
    resourceType: string | null;
    createdAt: string;
    metadata: string | null;
  }[];
}

const STATUS_BADGE: Record<string, string> = {
  DONE: "text-emerald-400",
  FAILED: "text-red-400",
  QUEUED: "text-yellow-400",
  RUNNING: "text-blue-400",
};

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function UserDetailModal({ userId, onClose, onRefresh }: UserDetailModalProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<Tier>("FREE");
  const [upgrading, setUpgrading] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await apiClient.get<UserDetail>(`/api/admin/users/${userId}`);
        setUser(res);
        setSelectedTier((res.subscription?.tier || "FREE") as Tier);
        setNotes(res.adminNotes || "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  async function handleTierChange() {
    if (!user || upgrading) return;
    setUpgrading(true);
    try {
      await apiClient.post("/api/admin/users/upgrade", { email: user.email, tier: selectedTier });
      showSuccess("Tier updated", `${user.email} is now ${selectedTier}`);
      onRefresh();
      // Refetch
      const res = await apiClient.get<UserDetail>(`/api/admin/users/${userId}`);
      setUser(res);
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleVerify() {
    if (!user) return;
    try {
      await apiClient.post("/api/admin/users/verify-email", { email: user.email });
      showSuccess("Verified", `${user.email} verified`);
      onRefresh();
      const res = await apiClient.get<UserDetail>(`/api/admin/users/${userId}`);
      setUser(res);
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSuspend() {
    if (!user || suspending) return;
    setSuspending(true);
    try {
      if (user.suspended) {
        await apiClient.post("/api/admin/users/unsuspend", { email: user.email });
        showSuccess("Unsuspended", `${user.email} has been unsuspended`);
      } else {
        if (!suspendReason.trim()) {
          showError("Required", "Please provide a reason for suspension");
          setSuspending(false);
          return;
        }
        await apiClient.post("/api/admin/users/suspend", {
          email: user.email,
          reason: suspendReason,
        });
        showSuccess("Suspended", `${user.email} has been suspended`);
      }
      onRefresh();
      const res = await apiClient.get<UserDetail>(`/api/admin/users/${userId}`);
      setUser(res);
      setSuspendReason("");
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSuspending(false);
    }
  }

  async function handlePasswordReset() {
    if (!user || resettingPassword) return;
    setResettingPassword(true);
    try {
      await apiClient.post("/api/admin/users/reset-password", { email: user.email });
      showSuccess("Sent", `Password reset email sent to ${user.email}`);
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleExtendSubscription() {
    if (!user || extending) return;
    setExtending(true);
    try {
      const res = await apiClient.post<{ newEnd: string }>("/api/admin/users/extend-subscription", {
        email: user.email,
        days: extendDays,
      });
      showSuccess(
        "Extended",
        `Subscription extended to ${new Date(res.newEnd).toLocaleDateString()}`
      );
      onRefresh();
      const detail = await apiClient.get<UserDetail>(`/api/admin/users/${userId}`);
      setUser(detail);
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExtending(false);
    }
  }

  async function handleImpersonate() {
    if (!user) return;
    try {
      const res = await apiClient.post<{ impersonate: { userId: string; email: string } }>(
        "/api/admin/users/impersonate",
        { email: user.email }
      );
      await updateSession(res);
      router.push("/app");
      router.refresh();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-[rgba(79,70,229,0.3)] bg-[#0F0318] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#0F0318] border-b border-[rgba(79,70,229,0.2)] px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-white">User Detail</h2>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white text-xl transition-colors"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-[#94A3B8]">Loading user details...</div>
        ) : !user ? (
          <div className="p-6 text-center text-red-400">User not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Account */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Account
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#64748B]">Email:</span>{" "}
                  <span className="text-white">{user.email}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Verified:</span>{" "}
                  <span className={user.emailVerified ? "text-emerald-400" : "text-yellow-400"}>
                    {user.emailVerified ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Role:</span>{" "}
                  <span className="text-white">{user.role}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Joined:</span>{" "}
                  <span className="text-white">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Last Login:</span>{" "}
                  <span className="text-white">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                  </span>
                </div>
                {user.referralCode && (
                  <div>
                    <span className="text-[#64748B]">Referral Code:</span>{" "}
                    <span className="text-[#A78BFA] font-mono">{user.referralCode}</span>
                  </div>
                )}
                {user.referredBy && (
                  <div>
                    <span className="text-[#64748B]">Referred By:</span>{" "}
                    <span className="text-[#A78BFA] font-mono">{user.referredBy}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Subscription */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Subscription
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#64748B]">Tier:</span>{" "}
                  <span className="text-white">{user.subscription?.tier || "FREE"}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Status:</span>{" "}
                  <span className="text-white">{user.subscription?.status || "active"}</span>
                </div>
                {user.subscription?.stripeCustomerId && (
                  <div className="col-span-2">
                    <span className="text-[#64748B]">Stripe:</span>{" "}
                    <a
                      href={`https://dashboard.stripe.com/customers/${user.subscription.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#22D3EE] hover:text-[#22D3EE]/80 text-xs font-mono transition-colors"
                    >
                      {user.subscription.stripeCustomerId}
                    </a>
                  </div>
                )}
                {user.subscription?.currentPeriodStart && (
                  <div>
                    <span className="text-[#64748B]">Period Start:</span>{" "}
                    <span className="text-white">
                      {new Date(user.subscription.currentPeriodStart).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {user.subscription?.currentPeriodEnd && (
                  <div>
                    <span className="text-[#64748B]">Period End:</span>{" "}
                    <span className="text-white">
                      {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as Tier)}
                    className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1 text-sm text-white focus:outline-none"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="ELITE">ELITE</option>
                  </select>
                  <button
                    onClick={handleTierChange}
                    disabled={upgrading}
                    className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    {upgrading ? "Updating..." : "Change Tier"}
                  </button>
                </div>
                {!user.emailVerified && (
                  <button
                    onClick={handleVerify}
                    className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded transition-colors"
                  >
                    Verify Email
                  </button>
                )}
                <button
                  onClick={handleImpersonate}
                  className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded transition-colors"
                >
                  Impersonate
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={resettingPassword}
                  className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {resettingPassword ? "Sending..." : "Send Password Reset"}
                </button>
              </div>

              {/* Suspend/Unsuspend */}
              <div className="mt-3 flex items-center gap-2">
                {!user.suspended ? (
                  <>
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Suspension reason..."
                      className="flex-1 bg-[#0F0318] border border-red-500/30 rounded px-2 py-1 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={handleSuspend}
                      disabled={suspending}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {suspending ? "Suspending..." : "Suspend User"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSuspend}
                    disabled={suspending}
                    className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {suspending ? "Unsuspending..." : "Unsuspend User"}
                  </button>
                )}
              </div>
              {user.suspended && user.suspendedReason && (
                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs">
                  <span className="text-red-400 font-medium">Suspended:</span>{" "}
                  <span className="text-white">{user.suspendedReason}</span>
                  {user.suspendedAt && (
                    <span className="text-[#64748B] ml-2">
                      ({new Date(user.suspendedAt).toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {/* Extend Subscription */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Extend subscription by</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="w-16 bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                />
                <span className="text-xs text-[#94A3B8]">days</span>
                <button
                  onClick={handleExtendSubscription}
                  disabled={extending}
                  className="text-xs text-[#22D3EE] hover:text-[#22D3EE]/80 border border-[#22D3EE]/30 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {extending ? "Extending..." : "Extend"}
                </button>
              </div>
            </section>

            {/* Admin Notes */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Admin Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this user..."
                rows={3}
                className="w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors resize-y"
              />
              <button
                onClick={async () => {
                  if (!user) return;
                  setSavingNotes(true);
                  try {
                    await apiClient.patch(`/api/admin/users/${user.id}`, { adminNotes: notes });
                    showSuccess("Saved", "Notes updated");
                  } catch (err) {
                    showError("Failed", err instanceof Error ? err.message : "Unknown error");
                  } finally {
                    setSavingNotes(false);
                  }
                }}
                disabled={savingNotes}
                className="mt-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </section>

            {/* Projects */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Projects ({user.projects.length})
              </h3>
              {user.projects.length === 0 ? (
                <div className="text-[#64748B] text-sm">No projects</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Name</th>
                        <th className="text-right px-3 py-2 text-[#94A3B8] font-medium">
                          Versions
                        </th>
                        <th className="text-right px-3 py-2 text-[#94A3B8] font-medium">Exports</th>
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.projects.map((p) => (
                        <tr key={p.id} className="border-b border-[rgba(79,70,229,0.1)]">
                          <td className="px-3 py-2 text-white">{p.name}</td>
                          <td className="px-3 py-2 text-right text-[#CBD5E1]">
                            {p._count.versions}
                          </td>
                          <td className="px-3 py-2 text-right text-[#CBD5E1]">
                            {p._count.exports}
                          </td>
                          <td className="px-3 py-2 text-[#94A3B8]">
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent Exports */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Recent Exports ({user.exports.length})
              </h3>
              {user.exports.length === 0 ? (
                <div className="text-[#64748B] text-sm">No exports</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Time</th>
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Project</th>
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Type</th>
                        <th className="text-left px-3 py-2 text-[#94A3B8] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.exports.map((exp) => (
                        <tr key={exp.id} className="border-b border-[rgba(79,70,229,0.1)]">
                          <td className="px-3 py-2 text-[#94A3B8]">
                            {new Date(exp.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-white">{exp.project.name}</td>
                          <td className="px-3 py-2 text-[#A78BFA] font-mono text-xs">
                            {exp.exportType}
                          </td>
                          <td className="px-3 py-2">
                            <span className={STATUS_BADGE[exp.status] || "text-[#94A3B8]"}>
                              {exp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Activity Log */}
            <section>
              <h3 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Activity Log ({user.auditLogs.length})
              </h3>
              {user.auditLogs.length === 0 ? (
                <div className="text-[#64748B] text-sm">No activity</div>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {user.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 text-xs py-1.5 border-b border-[rgba(79,70,229,0.05)]"
                    >
                      <span className="text-[#64748B] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className="text-[#A78BFA] font-medium">{log.eventType}</span>
                      {log.resourceType && (
                        <span className="text-[#94A3B8]">{log.resourceType}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
