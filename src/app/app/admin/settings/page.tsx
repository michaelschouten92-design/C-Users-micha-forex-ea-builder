"use client";

import { AdminPageHeader } from "../components/admin-page-header";
import { AnnouncementsTab } from "../components/announcements-tab";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Announcements" />
      <AnnouncementsTab />
    </>
  );
}
