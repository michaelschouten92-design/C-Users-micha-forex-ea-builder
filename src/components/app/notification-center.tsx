"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { getCsrfHeaders } from "@/lib/api-client";

interface AlertRule {
  type: string;
  threshold: number;
}

interface AlertInstance {
  eaName: string;
  symbol: string | null;
}

interface Notification {
  id: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
  rule: AlertRule;
  instance: AlertInstance;
}

interface NotificationsResponse {
  alerts: Notification[];
  unreadCount: number;
}

const ALERT_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  DRAWDOWN_EXCEEDED: { icon: "trending-down", color: "#EF4444" },
  CONSECUTIVE_LOSSES: { icon: "alert-triangle", color: "#F59E0B" },
  OFFLINE_DURATION: { icon: "wifi-off", color: "#94A3B8" },
  EQUITY_DROP: { icon: "arrow-down", color: "#EF4444" },
};

function getAlertIcon(type: string): { icon: string; color: string } {
  return ALERT_TYPE_ICONS[type] ?? { icon: "bell", color: "#A78BFA" };
}

function AlertIcon({ type }: { type: string }) {
  const { color } = getAlertIcon(type);

  if (type === "DRAWDOWN_EXCEEDED" || type === "EQUITY_DROP") {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        />
      </svg>
    );
  }

  if (type === "CONSECUTIVE_LOSSES") {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    );
  }

  if (type === "OFFLINE_DURATION") {
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01"
        />
      </svg>
    );
  }

  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<NotificationsResponse>("/api/notifications", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.alerts ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [isOpen]);

  async function handleAcknowledge(id: string) {
    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          alerts: current.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
        };
      },
      { revalidate: false }
    );

    await fetch(`/api/notifications/${id}/acknowledge`, {
      method: "POST",
      headers: getCsrfHeaders(),
    });
  }

  async function handleMarkAllRead() {
    if (!data?.alerts) return;

    const unreadAlerts = data.alerts.filter((a) => !a.acknowledged);

    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          unreadCount: 0,
          alerts: current.alerts.map((a) => ({ ...a, acknowledged: true })),
        };
      },
      { revalidate: false }
    );

    // Acknowledge all unread in parallel
    await Promise.allSettled(
      unreadAlerts.map((alert) =>
        fetch(`/api/notifications/${alert.id}/acknowledge`, {
          method: "POST",
          headers: getCsrfHeaders(),
        })
      )
    );

    mutate();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200 p-1"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-[rgba(79,70,229,0.2)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#A78BFA] hover:text-white transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <svg
                  className="w-8 h-8 text-[#475569] mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm text-[#7C8DB0]">No notifications yet</p>
                <p className="text-xs text-[#475569] mt-1">
                  Alerts from your live EAs will appear here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors ${
                    !notification.acknowledged ? "bg-[rgba(79,70,229,0.08)]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className="mt-0.5">
                      <AlertIcon type={notification.rule.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#CBD5E1] leading-snug">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#7C8DB0]">
                          {notification.instance.eaName}
                          {notification.instance.symbol ? ` - ${notification.instance.symbol}` : ""}
                        </span>
                        <span className="text-[#475569]">·</span>
                        <span className="text-xs text-[#7C8DB0]">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Dismiss button */}
                    {!notification.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(notification.id)}
                        className="text-[#7C8DB0] hover:text-white p-0.5 transition-colors flex-shrink-0"
                        aria-label="Dismiss notification"
                        title="Mark as read"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[rgba(79,70,229,0.2)]">
            <Link
              href="/app/settings"
              className="block text-center text-xs text-[#7C8DB0] hover:text-[#22D3EE] py-1.5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Notification Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
