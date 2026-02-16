"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

const TYPE_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  maintenance: "bg-red-500/10 border-red-500/30 text-red-400",
};

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = sessionStorage.getItem("dismissed-announcements");
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // ignore
  }
  return new Set();
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setAnnouncements(data.data);
      })
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      sessionStorage.setItem("dismissed-announcements", JSON.stringify([...next]));
    } catch {
      // ignore
    }
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-2">
      {visible.map((ann) => (
        <div
          key={ann.id}
          className={`px-4 py-3 rounded-lg border flex items-start justify-between gap-3 ${TYPE_STYLES[ann.type] || TYPE_STYLES.info}`}
        >
          <div>
            <span className="font-medium">{ann.title}</span>
            <span className="ml-2 opacity-80">{ann.message}</span>
          </div>
          <button
            onClick={() => dismiss(ann.id)}
            className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
