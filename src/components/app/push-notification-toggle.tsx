"use client";

import { useState, useEffect } from "react";
import { showError } from "@/lib/toast";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  async function handleToggle() {
    if (!supported) return;
    setLoading(true);

    try {
      if (subscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Request permission and subscribe
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          setLoading(false);
          return;
        }

        // Get VAPID key
        const vapidRes = await fetch("/api/push/vapid-key");
        if (!vapidRes.ok) {
          setLoading(false);
          return;
        }
        const { publicKey } = await vapidRes.json();

        // Subscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });

        // Send subscription to server
        const subJson = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh ?? "",
              auth: subJson.keys?.auth ?? "",
            },
          }),
        });

        setSubscribed(true);
      }
    } catch {
      showError("Failed to update push notification settings");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="text-xs text-[#7C8DB0]">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="text-xs text-[#EF4444]">
        Push notifications are blocked. Please enable them in your browser settings.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 focus:ring-offset-[#1A0626] disabled:opacity-50 ${
          subscribed ? "bg-[#4F46E5]" : "bg-[#334155]"
        }`}
        role="switch"
        aria-checked={subscribed}
        aria-label="Toggle push notifications"
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            subscribed ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-[#CBD5E1]">
        {loading
          ? "Updating..."
          : subscribed
            ? "Push notifications enabled"
            : "Enable push notifications"}
      </span>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
