"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

interface UseTemplateButtonProps {
  templateName: string;
  buildJson: object;
}

export function UseTemplateButton({ templateName, buildJson }: UseTemplateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUseTemplate() {
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: `${templateName} (Community)` }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Failed to create project");
        setLoading(false);
        return;
      }

      // Save the template's buildJson as the first version
      const versionRes = await fetch(`/api/projects/${data.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson }),
      });

      if (!versionRes.ok) {
        // Project was created but version failed -- still redirect to builder
        router.push(`/app/projects/${data.id}/builder`);
        return;
      }

      router.push(`/app/projects/${data.id}/builder`);
    } catch {
      showError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUseTemplate}
      disabled={loading}
      className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30 hover:bg-[#4F46E5]/30 hover:border-[#4F46E5]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
    >
      {loading ? "Creating project..." : "Use Template"}
    </button>
  );
}
