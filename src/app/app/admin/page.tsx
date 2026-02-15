"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  subscription: { tier: string; status: string };
  projectCount: number;
  exportCount: number;
}

type Tier = "FREE" | "PRO" | "ELITE";

const TIER_COLORS: Record<string, string> = {
  ELITE: "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/50",
  PRO: "bg-[#4F46E5]/20 text-[#A78BFA] border-[#4F46E5]/50",
  FREE: "bg-[rgba(79,70,229,0.2)] text-[#A78BFA] border-[rgba(79,70,229,0.3)]",
};

export default function AdminPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>("FREE");
  const [upgrading, setUpgrading] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Feature 1: Delete state
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Feature 2: Verify state
  const [verifyingUser, setVerifyingUser] = useState<string | null>(null);

  // Feature 3: Search/filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | Tier>("ALL");

  // Feature 5: Impersonation state
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await apiClient.get<{ data: UserData[]; adminEmail: string }>("/api/admin/users");
      setUsers(res.data);
      setAdminEmail(res.adminEmail);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    const user = users.find((u) => u.id === selectedUser);
    if (!user || upgrading) return;

    setUpgrading(true);
    try {
      await apiClient.post("/api/admin/users/upgrade", {
        email: user.email,
        tier: selectedTier,
      });
      showSuccess("Tier updated", `${user.email} is now ${selectedTier}`);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      showError("Upgrade failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpgrading(false);
    }
  }

  // Feature 1: Delete handler
  async function handleDelete(email: string) {
    setDeleteInProgress(true);
    try {
      await apiClient.post("/api/admin/users/delete", { email });
      showSuccess("User deleted", `${email} has been removed`);
      setDeletingUser(null);
      await fetchUsers();
    } catch (err) {
      showError("Delete failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleteInProgress(false);
    }
  }

  // Feature 2: Verify handler
  async function handleVerify(email: string) {
    setVerifyingUser(email);
    try {
      await apiClient.post("/api/admin/users/verify-email", { email });
      showSuccess("Email verified", `${email} is now verified`);
      await fetchUsers();
    } catch (err) {
      showError("Verify failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifyingUser(null);
    }
  }

  // Feature 5: Impersonate handler
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

  // Feature 3: Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" || user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "ALL" || user.subscription.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [users, searchQuery, tierFilter]);

  // Feature 4: Dashboard stats
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
        {/* Feature 4: Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        </div>

        {/* Feature 3: Search/filter + user count */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <span className="text-sm text-[#94A3B8]">
            {filteredUsers.length === users.length
              ? `${users.length} users`
              : `${filteredUsers.length} of ${users.length} users`}
          </span>
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
        </div>

        <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Tier</th>
                <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Status</th>
                <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Projects</th>
                <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Exports</th>
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
                    <td className="px-4 py-3 text-white">
                      {user.email}
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
                    <td className="px-4 py-3 text-right text-[#CBD5E1]">{user.projectCount}</td>
                    <td className="px-4 py-3 text-right text-[#CBD5E1]">{user.exportCount}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {/* Change Tier */}
                        <button
                          onClick={() => {
                            setSelectedUser(selectedUser === user.id ? null : user.id);
                            setSelectedTier(user.subscription.tier as Tier);
                          }}
                          className="text-xs text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                        >
                          {selectedUser === user.id ? "Cancel" : "Change Tier"}
                        </button>

                        {/* Feature 2: Verify email */}
                        {!user.emailVerified && (
                          <button
                            onClick={() => handleVerify(user.email)}
                            disabled={verifyingUser === user.email}
                            className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                          >
                            {verifyingUser === user.email ? "Verifying..." : "Verify"}
                          </button>
                        )}

                        {/* Feature 5: Impersonate */}
                        {!isAdmin && (
                          <button
                            onClick={() => handleImpersonate(user.email)}
                            disabled={impersonating}
                            className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                          >
                            Impersonate
                          </button>
                        )}

                        {/* Feature 1: Delete with inline confirmation */}
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
      </main>
    </div>
  );
}
