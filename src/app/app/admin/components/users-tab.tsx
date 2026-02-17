"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface Segment {
  id: string;
  name: string;
  filters: {
    tierFilter?: string;
    loginFilter?: string;
    activityFilter?: string;
    churnFilter?: boolean;
    searchQuery?: string;
  };
}

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

type Tier = "FREE" | "PRO" | "ELITE";

const TIER_COLORS: Record<string, string> = {
  ELITE: "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/50",
  PRO: "bg-[#4F46E5]/20 text-[#A78BFA] border-[#4F46E5]/50",
  FREE: "bg-[rgba(79,70,229,0.2)] text-[#A78BFA] border-[rgba(79,70,229,0.3)]",
};

interface UsersTabProps {
  users: UserData[];
  adminEmail: string | null;
  onRefresh: () => void;
  onUserClick: (userId: string) => void;
}

export function UsersTab({ users, adminEmail, onRefresh, onUserClick }: UsersTabProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>("FREE");
  const [upgrading, setUpgrading] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");
  const [loginFilter, setLoginFilter] = useState<"ALL" | "7d" | "30d" | "NEVER">("ALL");
  const [activityFilter, setActivityFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [churnFilter, setChurnFilter] = useState(false);

  // Segments
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentName, setSegmentName] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTier, setBulkTier] = useState<Tier>("PRO");
  const [bulkUpgrading, setBulkUpgrading] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: Segment[] }>("/api/admin/segments")
      .then((res) => setSegments(res.data))
      .catch(() => {});
  }, []);

  async function handleSaveSegment() {
    if (!segmentName.trim() || savingSegment) return;
    setSavingSegment(true);
    try {
      const res = await apiClient.post<Segment>("/api/admin/segments", {
        name: segmentName.trim(),
        filters: { tierFilter, loginFilter, activityFilter, churnFilter, searchQuery },
      });
      setSegments((prev) => [res, ...prev]);
      setSegmentName("");
      showSuccess("Segment saved", `"${res.name}" created`);
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingSegment(false);
    }
  }

  function applySegment(segment: Segment) {
    const f = segment.filters;
    if (f.tierFilter) setTierFilter(f.tierFilter as "ALL" | Tier);
    if (f.loginFilter) setLoginFilter(f.loginFilter as "ALL" | "7d" | "30d" | "NEVER");
    if (f.activityFilter) setActivityFilter(f.activityFilter as "ALL" | "active" | "inactive");
    if (f.churnFilter !== undefined) setChurnFilter(f.churnFilter);
    if (f.searchQuery !== undefined) setSearchQuery(f.searchQuery);
  }

  async function handleDeleteSegment(id: string) {
    try {
      await apiClient.delete(`/api/admin/segments?id=${id}`);
      setSegments((prev) => prev.filter((s) => s.id !== id));
      showSuccess("Deleted", "Segment removed");
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  const filteredUsers = useMemo(() => {
    const now = Date.now();
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" || user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "ALL" || user.subscription.tier === tierFilter;
      let matchesLogin = true;
      if (loginFilter === "NEVER") {
        matchesLogin = !user.lastLoginAt;
      } else if (loginFilter === "7d") {
        matchesLogin =
          !!user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() <= 7 * 86_400_000;
      } else if (loginFilter === "30d") {
        matchesLogin =
          !!user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() <= 30 * 86_400_000;
      }
      const matchesActivity = activityFilter === "ALL" || user.activityStatus === activityFilter;
      const matchesChurn = !churnFilter || user.churnRisk;
      return matchesSearch && matchesTier && matchesLogin && matchesActivity && matchesChurn;
    });
  }, [users, searchQuery, tierFilter, loginFilter, activityFilter, churnFilter]);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  }

  function toggleUser(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleUpgrade() {
    const user = users.find((u) => u.id === selectedUser);
    if (!user || upgrading) return;
    setUpgrading(true);
    try {
      await apiClient.post("/api/admin/users/upgrade", { email: user.email, tier: selectedTier });
      showSuccess("Tier updated", `${user.email} is now ${selectedTier}`);
      setSelectedUser(null);
      onRefresh();
    } catch (err) {
      showError("Upgrade failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleDelete(email: string) {
    setDeleteInProgress(true);
    try {
      await apiClient.post("/api/admin/users/delete", { email });
      showSuccess("User deleted", `${email} has been removed`);
      setDeletingUser(null);
      onRefresh();
    } catch (err) {
      showError("Delete failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleteInProgress(false);
    }
  }

  async function handleVerify(email: string) {
    setVerifyingUser(email);
    try {
      await apiClient.post("/api/admin/users/verify-email", { email });
      showSuccess("Email verified", `${email} is now verified`);
      onRefresh();
    } catch (err) {
      showError("Verify failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifyingUser(null);
    }
  }

  async function handleImpersonate(email: string) {
    setImpersonating(true);
    try {
      const res = await apiClient.post<{ impersonate: { userId: string; email: string } }>(
        "/api/admin/users/impersonate",
        { email }
      );
      await updateSession(res);
      router.push("/app");
      router.refresh();
    } catch (err) {
      showError("Impersonation failed", err instanceof Error ? err.message : "Unknown error");
      setImpersonating(false);
    }
  }

  async function handleBulkUpgrade() {
    if (selectedIds.size === 0 || bulkUpgrading) return;
    setBulkUpgrading(true);
    try {
      const emails = users.filter((u) => selectedIds.has(u.id)).map((u) => u.email);
      const res = await apiClient.post<{ updated: number; failed: string[] }>(
        "/api/admin/users/bulk-upgrade",
        { emails, tier: bulkTier }
      );
      showSuccess("Bulk upgrade complete", `${res.updated} users updated`);
      if (res.failed.length > 0) {
        showError("Some failed", res.failed.join(", "));
      }
      setSelectedIds(new Set());
      onRefresh();
    } catch (err) {
      showError("Bulk upgrade failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBulkUpgrading(false);
    }
  }

  async function handleExportCsv() {
    try {
      const res = await fetch("/api/admin/users/export-csv");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError("CSV export failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div>
      {/* Search/filter + user count */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <span className="text-sm text-[#94A3B8]">
          {filteredUsers.length === users.length
            ? `${users.length} users`
            : `${filteredUsers.length} of ${users.length} users`}
        </span>
      </div>

      {/* Segments */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {segments.length > 0 && (
          <>
            <span className="text-xs text-[#94A3B8]">Segments:</span>
            {segments.map((seg) => (
              <span key={seg.id} className="inline-flex items-center gap-1">
                <button
                  onClick={() => applySegment(seg)}
                  className="text-xs px-2.5 py-1 rounded-full bg-[#1A0626] border border-[rgba(79,70,229,0.3)] text-[#A78BFA] hover:border-[#4F46E5] transition-colors"
                >
                  {seg.name}
                </button>
                <button
                  onClick={() => handleDeleteSegment(seg.id)}
                  className="text-xs text-[#64748B] hover:text-red-400 transition-colors"
                  title="Delete segment"
                >
                  &times;
                </button>
              </span>
            ))}
          </>
        )}
        <div className="inline-flex items-center gap-1">
          <input
            type="text"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder="Save as..."
            className="w-28 bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5]"
          />
          <button
            onClick={handleSaveSegment}
            disabled={!segmentName.trim() || savingSegment}
            className="text-xs px-2 py-1 rounded bg-[#4F46E5] text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as "ALL" | Tier)}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        >
          <option value="ALL">All Tiers</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="ELITE">ELITE</option>
        </select>
        <select
          value={loginFilter}
          onChange={(e) => setLoginFilter(e.target.value as "ALL" | "7d" | "30d" | "NEVER")}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        >
          <option value="ALL">All Logins</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="NEVER">Never logged in</option>
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as "ALL" | "active" | "inactive")}
          className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
        >
          <option value="ALL">All Activity</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={churnFilter}
            onChange={(e) => setChurnFilter(e.target.checked)}
            className="accent-[#4F46E5]"
          />
          Churn Risk
        </label>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-[#4F46E5]/40 bg-[#4F46E5]/10 flex flex-wrap items-center gap-3">
          <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
          <select
            value={bulkTier}
            onChange={(e) => setBulkTier(e.target.value as Tier)}
            className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1 text-sm text-white focus:outline-none"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ELITE">ELITE</option>
          </select>
          <button
            onClick={handleBulkUpgrade}
            disabled={bulkUpgrading}
            className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-3 py-1 rounded transition-colors"
          >
            {bulkUpgrading ? "Upgrading..." : "Change Tier"}
          </button>
          <button
            onClick={handleExportCsv}
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] hover:border-[#4F46E5] text-white text-sm px-3 py-1 rounded transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#4F46E5]"
                />
              </th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Tier</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Activity</th>
              <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Projects</th>
              <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Exports</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Referred By</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Joined</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isAdmin = user.email === adminEmail;
              return (
                <tr
                  key={user.id}
                  className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="accent-[#4F46E5]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onUserClick(user.id)}
                      className="text-white hover:text-[#22D3EE] transition-colors text-left"
                    >
                      {user.email}
                    </button>
                    {isAdmin && <span className="ml-2 text-xs text-[#A78BFA]">(you)</span>}
                    {!user.emailVerified && (
                      <span className="ml-2 text-xs text-yellow-400">(unverified)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${TIER_COLORS[user.subscription.tier] ?? TIER_COLORS.FREE}`}
                    >
                      {user.subscription.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{user.subscription.status}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.activityStatus === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {user.activityStatus || "inactive"}
                    </span>
                    {user.churnRisk && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                        churn risk
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#CBD5E1]">{user.projectCount}</td>
                  <td className="px-4 py-3 text-right text-[#CBD5E1]">{user.exportCount}</td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{user.referredBy || "-"}</td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => {
                          setSelectedUser(selectedUser === user.id ? null : user.id);
                          setSelectedTier(user.subscription.tier as Tier);
                        }}
                        className="text-xs text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                      >
                        {selectedUser === user.id ? "Cancel" : "Change Tier"}
                      </button>
                      {!user.emailVerified && (
                        <button
                          onClick={() => handleVerify(user.email)}
                          disabled={verifyingUser === user.email}
                          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                        >
                          {verifyingUser === user.email ? "Verifying..." : "Verify"}
                        </button>
                      )}
                      {!isAdmin && (
                        <button
                          onClick={() => handleImpersonate(user.email)}
                          disabled={impersonating}
                          className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                        >
                          Impersonate
                        </button>
                      )}
                      {!isAdmin && (
                        <>
                          {deletingUser === user.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-red-400">Delete?</span>
                              <button
                                onClick={() => handleDelete(user.email)}
                                disabled={deleteInProgress}
                                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 font-semibold transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingUser(null)}
                                disabled={deleteInProgress}
                                className="text-xs text-[#94A3B8] hover:text-white disabled:opacity-50 transition-colors"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeletingUser(user.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tier change panel */}
      {selectedUser && (
        <div className="mt-4 p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-[#94A3B8]">
              Change tier for{" "}
              <span className="text-white font-medium">
                {users.find((u) => u.id === selectedUser)?.email}
              </span>
            </span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as Tier)}
              className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="ELITE">ELITE</option>
            </select>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {upgrading ? "Updating..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
