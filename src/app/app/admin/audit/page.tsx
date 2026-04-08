"use client";

import { useState } from "react";
import { AdminPageHeader } from "../components/admin-page-header";
import { AuditLogTab } from "../components/audit-log-tab";
import { UserDetailModal } from "../components/user-detail-modal";

export default function AdminAuditPage() {
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  return (
    <>
      <AdminPageHeader title="Audit Log" subtitle="System-wide event history" />
      <AuditLogTab onUserClick={setDetailUserId} />
      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onRefresh={() => {}}
        />
      )}
    </>
  );
}
