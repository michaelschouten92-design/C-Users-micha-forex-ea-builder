"use client";

import { useState, useEffect } from "react";
import type { AlertConfig, EAInstanceData } from "./types";
import { ALERT_TYPE_LABELS } from "./types";
import { formatRelativeTime } from "./utils";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

export function AlertsModal({
  instances,
  onClose,
}: {
  instances: EAInstanceData[];
  onClose: () => void;
}) {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New alert form state
  const [newAlertType, setNewAlertType] = useState("DRAWDOWN");
  const [newThreshold, setNewThreshold] = useState("5");
  const [newChannel, setNewChannel] = useState("BROWSER_PUSH");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newInstanceId, setNewInstanceId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/live/alerts");
      if (!cancelled && res.ok) {
        const json = await res.json();
        setAlerts(json.data);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateAlert(): Promise<void> {
    setSaving(true);
    const body: Record<string, unknown> = {
      alertType: newAlertType,
      channel: newChannel,
      alertState: "ACTIVE" as const,
    };

    if (newInstanceId) {
      body.instanceId = newInstanceId;
    }

    if (["DRAWDOWN", "DAILY_LOSS", "WEEKLY_LOSS", "EQUITY_TARGET"].includes(newAlertType)) {
      const threshold = parseFloat(newThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        showError("Invalid threshold", "Please enter a valid threshold value.");
        setSaving(false);
        return;
      }
      body.threshold = threshold;
    }

    if (newChannel === "WEBHOOK") {
      if (!newWebhookUrl) {
        showError("Missing webhook URL", "Please enter a webhook URL.");
        setSaving(false);
        return;
      }
      body.webhookUrl = newWebhookUrl;
    }

    const res = await fetch("/api/live/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showSuccess("Alert created");
      // Refresh alerts list
      const refreshRes = await fetch("/api/live/alerts");
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        setAlerts(refreshJson.data);
      }
      // Reset form
      setNewAlertType("DRAWDOWN");
      setNewThreshold("5");
      setNewChannel("BROWSER_PUSH");
      setNewWebhookUrl("");
      setNewInstanceId("");
    } else {
      const json = await res.json().catch(() => ({ error: "Failed to create alert" }));
      showError("Failed to create alert", json.error);
    }
    setSaving(false);
  }

  async function handleToggleAlert(
    alertId: string,
    alertState: "ACTIVE" | "DISABLED"
  ): Promise<void> {
    const res = await fetch("/api/live/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ id: alertId, alertState }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, alertState } : a)));
    }
  }

  async function handleDeleteAlert(alertId: string): Promise<void> {
    const res = await fetch("/api/live/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ id: alertId }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showSuccess("Alert deleted");
    }
  }

  const needsThreshold = ["DRAWDOWN", "DAILY_LOSS", "WEEKLY_LOSS", "EQUITY_TARGET"].includes(
    newAlertType
  );
  const needsWebhook = false;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-lg font-semibold text-white">Alert Configuration</h2>
          <button onClick={onClose} className="text-[#7C8DB0] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Create New Alert */}
        <div className="p-6 border-b border-[rgba(79,70,229,0.15)]">
          <h3 className="text-sm font-medium text-[#CBD5E1] mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Alert Type */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Alert Type
              </label>
              <select
                value={newAlertType}
                onChange={(e) => setNewAlertType(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="DRAWDOWN">Floating Drawdown</option>
                <option value="OFFLINE">EA Offline</option>
                <option value="NEW_TRADE">New Trade</option>
                <option value="ERROR">EA Error</option>
                <option value="DAILY_LOSS">Daily Loss Limit</option>
                <option value="WEEKLY_LOSS">Weekly Loss Limit</option>
                <option value="EQUITY_TARGET">Equity Target</option>
              </select>
            </div>

            {/* Instance Scope */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Applies To
              </label>
              <select
                value={newInstanceId}
                onChange={(e) => setNewInstanceId(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">All Instances</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.eaName}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold (conditional) */}
            {needsThreshold && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  Threshold (%)
                </label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
                  placeholder="5.0"
                />
              </div>
            )}

            {/* Channel */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Channel
              </label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="BROWSER_PUSH">Browser Push</option>
                <option value="TELEGRAM">Telegram</option>
              </select>
            </div>

            {/* Webhook URL (conditional) */}
            {needsWebhook && (
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.2)] text-[#CBD5E1] px-3 py-2 text-xs focus:outline-none focus:border-[#4F46E5]"
                  placeholder="https://hooks.example.com/alert"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleCreateAlert}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Alert"}
          </button>
        </div>

        {/* Existing Alerts */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-[#CBD5E1] mb-4">Active Alerts</h3>

          {loading ? (
            <div className="text-xs text-[#7C8DB0] py-4 text-center">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-xs text-[#7C8DB0] py-4 text-center">
              No alerts configured yet. Create one above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                    alert.alertState === "ACTIVE"
                      ? "bg-[rgba(79,70,229,0.05)] border-[rgba(79,70,229,0.15)]"
                      : "bg-[#0A0118]/50 border-[rgba(79,70,229,0.08)] opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#CBD5E1]">
                        {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                      </span>
                      {alert.threshold !== null && (
                        <span className="text-[10px] text-[#A78BFA]">at {alert.threshold}%</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(79,70,229,0.1)] text-[#7C8DB0]">
                        {alert.channel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#7C8DB0]">
                        {alert.instanceName ?? "All instances"}
                      </span>
                      {alert.lastTriggered && (
                        <span className="text-[10px] text-[#7C8DB0]">
                          Last triggered: {formatRelativeTime(alert.lastTriggered)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() =>
                        handleToggleAlert(
                          alert.id,
                          alert.alertState === "ACTIVE" ? "DISABLED" : "ACTIVE"
                        )
                      }
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                        alert.alertState === "ACTIVE" ? "bg-[#10B981]" : "bg-[#374151]"
                      }`}
                      title={alert.alertState === "ACTIVE" ? "Disable" : "Enable"}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          alert.alertState === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-[#7C8DB0] hover:text-[#EF4444] transition-colors"
                      title="Delete alert"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
