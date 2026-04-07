"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

interface SubscribeButtonProps {
  plan: "PRO" | "ELITE" | "INSTITUTIONAL";
  variant?: "primary" | "secondary";
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function SubscribeButton({
  plan,
  variant = "secondary",
  label = "Start monitoring",
  disabled = false,
  className = "",
}: SubscribeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      if (res.status === 401) {
        router.push(`/login?mode=register&redirect=/app/onboarding`);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showError(
          data.details ? `${data.error}: ${data.details}` : data.error || "Failed to start checkout"
        );
        setLoading(false);
      }
    } catch {
      showError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const base =
    variant === "primary"
      ? "bg-[#6366F1] text-white hover:bg-[#818CF8] btn-primary-cta"
      : "border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] hover:border-[rgba(255,255,255,0.20)]";

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || disabled}
      className={`w-full py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm ${base} ${className}`}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
