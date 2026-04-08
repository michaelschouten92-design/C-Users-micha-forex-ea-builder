"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { AdminPageHeader } from "../components/admin-page-header";
import { UsersTab } from "../components/users-tab";
import { UserDetailModal } from "../components/user-detail-modal";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: { tier: string; status: string };
  accountCount: number;
  activityStatus?: "active" | "inactive";
  churnRisk?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: UserData[]; adminEmail: string }>("/api/admin/users");
      setUsers(res.data);
      setAdminEmail(res.adminEmail);
    } catch {
      // handled by layout auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#111114] rounded animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-[#111114] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Users" subtitle={`${users.length} total users`} />
      <UsersTab
        users={users}
        adminEmail={adminEmail}
        onRefresh={fetchUsers}
        onUserClick={setDetailUserId}
      />
      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onRefresh={fetchUsers}
        />
      )}
    </>
  );
}
