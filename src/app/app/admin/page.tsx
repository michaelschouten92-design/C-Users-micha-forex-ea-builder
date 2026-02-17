"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { AdminTabs, type AdminTab } from "./components/admin-tabs";
import { UsersTab } from "./components/users-tab";
import { AuditLogTab } from "./components/audit-log-tab";
import { RevenueTab } from "./components/revenue-tab";
import { ExportsTab } from "./components/exports-tab";
import { AnalyticsTab } from "./components/analytics-tab";
import { AnnouncementsTab } from "./components/announcements-tab";
import { LiveEAsTab } from "./components/live-eas-tab";
import { UserDetailModal } from "./components/user-detail-modal";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  referredBy?: string;
  subscription: { tier: string; status: string };
  projectCount: number;
  exportCount: number;
}

interface AdminStats {
  mrr: number;
  exportsToday: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [extraStats, setExtraStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchExtraStats();
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
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "exports" && <ExportsTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "announcements" && <AnnouncementsTab />}
        {activeTab === "live-eas" && <LiveEAsTab />}
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
