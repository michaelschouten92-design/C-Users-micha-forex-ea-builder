"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>("FREE");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await apiClient.get<{ data: UserData[] }>("/api/admin/users");
      setUsers(res.data);
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <span className="text-sm text-[#94A3B8]">{users.length} users</span>
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                >
                  <td className="px-4 py-3 text-white">
                    {user.email}
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
                    <button
                      onClick={() => {
                        setSelectedUser(selectedUser === user.id ? null : user.id);
                        setSelectedTier(user.subscription.tier as Tier);
                      }}
                      className="text-xs text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                    >
                      {selectedUser === user.id ? "Cancel" : "Change Tier"}
                    </button>
                  </td>
                </tr>
              ))}
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
