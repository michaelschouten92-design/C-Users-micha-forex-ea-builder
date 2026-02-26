"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface Segment {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  active: boolean;
  expiresAt: string | null;
  scheduledAt: string | null;
  segmentId: string | null;
  segment: { id: string; name: string } | null;
  createdAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  maintenance: "bg-red-500/20 text-red-400 border-red-500/50",
};

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("info");
  const [formExpiry, setFormExpiry] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formSegmentId, setFormSegmentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk email state
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkTarget, setBulkTarget] = useState<"all" | "segment">("all");
  const [bulkSegmentId, setBulkSegmentId] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  async function fetchAnnouncements() {
    try {
      const res = await apiClient.get<{ data: Announcement[] }>("/api/admin/announcements");
      setAnnouncements(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnnouncements();
    apiClient
      .get<{ data: Segment[] }>("/api/admin/segments")
      .then((res) => setSegments(res.data))
      .catch((err) => {
        console.error("Failed to fetch segments:", err);
      });
  }, []);

  function resetForm() {
    setFormTitle("");
    setFormMessage("");
    setFormType("info");
    setFormExpiry("");
    setFormScheduledAt("");
    setFormSegmentId("");
    setEditingId(null);
  }

  function startEdit(ann: Announcement) {
    setEditingId(ann.id);
    setFormTitle(ann.title);
    setFormMessage(ann.message);
    setFormType(ann.type);
    setFormExpiry(ann.expiresAt ? ann.expiresAt.slice(0, 16) : "");
    setFormScheduledAt(ann.scheduledAt ? ann.scheduledAt.slice(0, 16) : "");
    setFormSegmentId(ann.segmentId || "");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formTitle.trim() || !formMessage.trim() || creating) return;
    if (formScheduledAt && formExpiry && new Date(formScheduledAt) >= new Date(formExpiry)) {
      showError("Validation", "Scheduled date must be before expiry date");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        title: formTitle,
        message: formMessage,
        type: formType,
        ...(formExpiry && { expiresAt: new Date(formExpiry).toISOString() }),
        ...(formScheduledAt && { scheduledAt: new Date(formScheduledAt).toISOString() }),
        ...(formSegmentId && { segmentId: formSegmentId }),
      };

      if (editingId) {
        await apiClient.patch("/api/admin/announcements", {
          id: editingId,
          ...payload,
          expiresAt: formExpiry ? new Date(formExpiry).toISOString() : null,
          scheduledAt: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
          segmentId: formSegmentId || null,
        });
        showSuccess("Updated", "Announcement updated");
      } else {
        await apiClient.post("/api/admin/announcements", {
          ...payload,
          active: true,
        });
        showSuccess("Created", "Announcement published");
      }

      setShowForm(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await apiClient.patch("/api/admin/announcements", { id, active: !active });
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/api/admin/announcements?id=${id}`);
      showSuccess("Deleted", "Announcement removed");
      setDeletingId(null);
      fetchAnnouncements();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSendBulkEmail() {
    if (!bulkSubject.trim() || !bulkMessage.trim() || sendingBulk) return;
    if (!confirm(`Send bulk email to ${bulkTarget === "all" ? "ALL users" : "segment users"}?`))
      return;
    setSendingBulk(true);
    try {
      const res = await apiClient.post<{ sent: number; failed: number; total: number }>(
        "/api/admin/bulk-email",
        {
          subject: bulkSubject,
          message: bulkMessage,
          targetType: bulkTarget,
          ...(bulkTarget === "segment" && bulkSegmentId && { segmentId: bulkSegmentId }),
        }
      );
      showSuccess("Sent", `${res.sent} emails sent, ${res.failed} failed`);
      setBulkSubject("");
      setBulkMessage("");
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSendingBulk(false);
    }
  }

  function getStatusLabel(ann: Announcement): { label: string; color: string } {
    if (!ann.active && ann.scheduledAt && new Date(ann.scheduledAt) > new Date()) {
      return { label: "Scheduled", color: "text-blue-400" };
    }
    if (!ann.active) return { label: "Inactive", color: "text-[#7C8DB0]" };
    if (ann.expiresAt && new Date(ann.expiresAt) < new Date())
      return { label: "Expired", color: "text-amber-400" };
    return { label: "Active", color: "text-emerald-400" };
  }

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
        <button
          onClick={() => {
            if (showForm) resetForm();
            setShowForm(!showForm);
          }}
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {showForm ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60">
          <h3 className="text-sm font-semibold text-white mb-3">
            {editingId ? "Edit Announcement" : "New Announcement"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
            />
            <textarea
              placeholder="Message"
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              rows={3}
              className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors resize-none"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#7C8DB0]">Expires at</label>
                <input
                  type="datetime-local"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#7C8DB0]">Schedule at</label>
                <input
                  type="datetime-local"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                />
              </div>
              {segments.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#7C8DB0]">Target segment</label>
                  <select
                    value={formSegmentId}
                    onChange={(e) => setFormSegmentId(e.target.value)}
                    className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                  >
                    <option value="">All users</option>
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={creating || !formTitle.trim() || !formMessage.trim()}
                className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors self-end"
              >
                {creating ? "Saving..." : editingId ? "Save Changes" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6 text-center text-[#7C8DB0]">
          No announcements yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const status = getStatusLabel(ann);
            return (
              <div
                key={ann.id}
                className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-medium">{ann.title}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${TYPE_BADGE[ann.type] || TYPE_BADGE.info}`}
                      >
                        {ann.type}
                      </span>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      {ann.segment && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30">
                          {ann.segment.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#94A3B8] mb-2">{ann.message}</p>
                    <div className="text-xs text-[#7C8DB0]">
                      Created {new Date(ann.createdAt).toLocaleString()}
                      {ann.expiresAt && ` · Expires ${new Date(ann.expiresAt).toLocaleString()}`}
                      {ann.scheduledAt &&
                        ` · Scheduled ${new Date(ann.scheduledAt).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(ann)}
                      className="text-xs px-3 py-1 rounded text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(ann.id, ann.active)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        ann.active
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-[rgba(79,70,229,0.2)] text-[#94A3B8] hover:bg-[rgba(79,70,229,0.3)]"
                      }`}
                    >
                      {ann.active ? "Deactivate" : "Activate"}
                    </button>
                    {deletingId === ann.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-[#94A3B8] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeletingId(ann.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Email Section */}
      <div className="mt-8">
        <button
          onClick={() => setShowBulkEmail(!showBulkEmail)}
          className="flex items-center gap-2 text-sm font-semibold text-[#A78BFA] hover:text-white transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showBulkEmail ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Bulk Email
        </button>

        {showBulkEmail && (
          <div className="mt-3 p-4 rounded-lg border border-[rgba(79,70,229,0.3)] bg-[#1A0626]/60">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Subject"
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
              />
              <textarea
                placeholder="Message (plain text, newlines will be preserved)"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                rows={5}
                className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors resize-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#94A3B8]">Target:</span>
                <label className="flex items-center gap-1 text-sm text-white cursor-pointer">
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={bulkTarget === "all"}
                    onChange={() => setBulkTarget("all")}
                    className="accent-[#4F46E5]"
                  />
                  All Users
                </label>
                <label className="flex items-center gap-1 text-sm text-white cursor-pointer">
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={bulkTarget === "segment"}
                    onChange={() => setBulkTarget("segment")}
                    className="accent-[#4F46E5]"
                  />
                  Segment
                </label>
                {bulkTarget === "segment" && segments.length > 0 && (
                  <select
                    value={bulkSegmentId}
                    onChange={(e) => setBulkSegmentId(e.target.value)}
                    className="bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-2 py-1 text-sm text-white focus:outline-none"
                  >
                    <option value="">Select segment</option>
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleSendBulkEmail}
                  disabled={sendingBulk || !bulkSubject.trim() || !bulkMessage.trim()}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors ml-auto"
                >
                  {sendingBulk ? "Sending..." : "Send Bulk Email"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
