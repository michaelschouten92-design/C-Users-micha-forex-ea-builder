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
  suspended?: boolean;
  subscription: { tier: string; status: string };
  projectCount: number;
  exportCount: number;
  activityStatus?: "active" | "inactive";
  churnRisk?: boolean;
}

import { type Tier, TIER_BADGE_COLORS, TIER_LABELS } from "../admin-constants";

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
      .catch((err) => {
        console.error("Failed to fetch segments:", err);
      });
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
        <span className="text-sm text-[#A1A1AA]">
          {filteredUsers.length === users.length
            ? `${users.length} users`
            : `${filteredUsers.length} of ${users.length} users`}
        </span>
      </div>

      {/* Segments */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {segments.length > 0 && (
          <>
            <span className="text-xs text-[#A1A1AA]">Segments:</span>
            {segments.map((seg) => (
              <span key={seg.id} className="inline-flex items-center gap-1">
                <button
                  onClick={() => applySegment(seg)}
                  className="text-xs px-2.5 py-1 rounded-full bg-[#111114] border border-[rgba(255,255,255,0.10)] text-[#818CF8] hover:border-[#6366F1] transition-colors"
                >
                  {seg.name}
                </button>
                <button
                  onClick={() => handleDeleteSegment(seg.id)}
                  className="text-xs text-[#71717A] hover:text-red-400 transition-colors"
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
            className="w-28 bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-2 py-1 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#6366F1]"
          />
          <button
            onClick={handleSaveSegment}
            disabled={!segmentName.trim() || savingSegment}
            className="text-xs px-2 py-1 rounded bg-[#6366F1] text-white disabled:opacity-50 hover:bg-[#6366F1] transition-colors"
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
          className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-3 py-2 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#6366F1] transition-colors"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as "ALL" | Tier)}
          className="bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366F1] transition-colors"
        >
          <option value="ALL">All Tiers</option>
          <option value="FREE">Baseline</option>
          <option value="PRO">Control</option>
          <option value="ELITE">Authority</option>
          <option value="INSTITUTIONAL">Institutional</option>
        </select>
        <select
          value={loginFilter}
          onChange={(e) => setLoginFilter(e.target.value as "ALL" | "7d" | "30d" | "NEVER")}
          className="bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366F1] transition-colors"
        >
          <option value="ALL">All Logins</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="NEVER">Never logged in</option>
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as "ALL" | "active" | "inactive")}
          className="bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366F1] transition-colors"
        >
          <option value="ALL">All Activity</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[#A1A1AA] cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={churnFilter}
            onChange={(e) => setChurnFilter(e.target.checked)}
            className="accent-[#6366F1]"
          />
          Churn Risk
        </label>
        {(searchQuery ||
          tierFilter !== "ALL" ||
          loginFilter !== "ALL" ||
          activityFilter !== "ALL" ||
          churnFilter) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setTierFilter("ALL");
              setLoginFilter("ALL");
              setActivityFilter("ALL");
              setChurnFilter(false);
            }}
            className="text-xs text-[#A1A1AA] hover:text-white transition-colors whitespace-nowrap"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/10 flex flex-wrap items-center gap-3">
          <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
          <select
            value={bulkTier}
            onChange={(e) => setBulkTier(e.target.value as Tier)}
            className="bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-2 py-1 text-sm text-white focus:outline-none"
          >
            <option value="FREE">Baseline</option>
            <option value="PRO">Control</option>
            <option value="ELITE">Authority</option>
            <option value="INSTITUTIONAL">Institutional</option>
          </select>
          <button
            onClick={handleBulkUpgrade}
            disabled={bulkUpgrading}
            className="bg-[#6366F1] hover:bg-[#6366F1] disabled:opacity-50 text-white text-sm px-3 py-1 rounded transition-colors"
          >
            {bulkUpgrading ? "Upgrading..." : "Change Tier"}
          </button>
          <button
            onClick={handleExportCsv}
            className="bg-[#111114] border border-[rgba(255,255,255,0.10)] hover:border-[#6366F1] text-white text-sm px-3 py-1 rounded transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-[#A1A1AA] hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111114]/60 border-b border-[rgba(255,255,255,0.06)]">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#6366F1]"
                />
              </th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Tier</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Activity</th>
              <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Projects</th>
              <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Exports</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Referred By</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Joined</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isAdmin = user.email === adminEmail;
              return (
                <tr
                  key={user.id}
                  className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="accent-[#6366F1]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onUserClick(user.id)}
                      className="text-white hover:text-[#818CF8] transition-colors text-left"
                    >
                      {user.email}
                    </button>
                    {isAdmin && <span className="ml-2 text-xs text-[#818CF8]">(you)</span>}
                    {user.suspended && (
                      <span className="ml-2 text-xs text-red-400">(suspended)</span>
                    )}
                    {!user.emailVerified && (
                      <span className="ml-2 text-xs text-yellow-400">(unverified)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${TIER_BADGE_COLORS[user.subscription.tier] ?? TIER_COLORS.FREE}`}
                    >
                      {TIER_LABELS[user.subscription.tier] ?? user.subscription.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{user.subscription.status}</td>
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
                  <td className="px-4 py-3 text-right text-[#FAFAFA]">{user.projectCount}</td>
                  <td className="px-4 py-3 text-right text-[#FAFAFA]">{user.exportCount}</td>
                  <td className="px-4 py-3 text-[#A1A1AA] text-xs">{user.referredBy || "-"}</td>
                  <td className="px-4 py-3 text-[#A1A1AA] text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => {
                          setSelectedUser(selectedUser === user.id ? null : user.id);
                          setSelectedTier(user.subscription.tier as Tier);
                        }}
                        className="text-xs text-[#818CF8] hover:text-[#818CF8]/80 transition-colors"
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
                                className="text-xs text-[#A1A1AA] hover:text-white disabled:opacity-50 transition-colors"
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
        <div className="mt-4 p-4 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111114]/60">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-[#A1A1AA]">
              Change tier for{" "}
              <span className="text-white font-medium">
                {users.find((u) => u.id === selectedUser)?.email}
              </span>
            </span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as Tier)}
              className="bg-[#09090B] border border-[rgba(255,255,255,0.10)] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#6366F1]"
            >
              <option value="FREE">Baseline</option>
              <option value="PRO">Control</option>
              <option value="ELITE">Authority</option>
              <option value="INSTITUTIONAL">Institutional</option>
            </select>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="bg-[#6366F1] hover:bg-[#6366F1] disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {upgrading ? "Updating..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
