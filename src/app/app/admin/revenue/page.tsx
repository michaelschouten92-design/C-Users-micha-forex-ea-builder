"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { AdminPageHeader } from "../components/admin-page-header";
import { RevenueTab } from "../components/revenue-tab";

interface UserData {
  id: string;
  email: string;
  createdAt: string;
  subscription: { tier: string; status: string };
}

export default function AdminRevenuePage() {
  const [users, setUsers] = useState<UserData[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: UserData[] }>("/api/admin/users?limit=500");
      setUsers(res.data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      await fetchUsers();
      if (!active) return;
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminPageHeader title="Revenue" subtitle="MRR, subscriptions, and churn" />
      <RevenueTab sharedUsers={users} />
    </>
  );
}
