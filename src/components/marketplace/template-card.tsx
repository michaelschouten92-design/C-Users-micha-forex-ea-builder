"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError, showSuccess } from "@/lib/toast";

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string | null;
    buildJson: unknown;
    authorEmail: string;
    downloads: number;
    tags: string[];
    category: string | null;
    avgRating: number;
    ratingCount: number;
    createdAt: string;
  };
  currentUserId: string;
  onRateTemplate: (templateId: string) => void;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating >= star;
        const halfFilled = !filled && rating >= star - 0.5;
        return (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${filled ? "text-[#F59E0B]" : halfFilled ? "text-[#F59E0B]/60" : "text-[#374151]"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
      <span className="text-xs text-[#7C8DB0] ml-1">({count})</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function categoryLabel(category: string | null): string {
  if (!category) return "";
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function TemplateCard({ template, onRateTemplate }: TemplateCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUseTemplate() {
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: `${template.name} (Marketplace)` }),
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
        body: JSON.stringify({ buildJson: template.buildJson }),
      });

      if (versionRes.ok) {
        // Increment download count (fire-and-forget)
        fetch(`/api/marketplace/search?incrementDownload=${template.id}`, {
          method: "POST",
          headers: getCsrfHeaders(),
        }).catch(() => {});
      }

      showSuccess("Project created from template");
      router.push(`/app/projects/${data.id}/builder`);
    } catch {
      showError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 flex flex-col hover:border-[rgba(79,70,229,0.4)] transition-all duration-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.1)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-lg font-semibold text-white line-clamp-1" title={template.name}>
          {template.name}
        </h3>
        {template.category && (
          <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30 whitespace-nowrap">
            {categoryLabel(template.category)}
          </span>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-[#94A3B8] mb-3 line-clamp-2">{template.description}</p>
      )}

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-[#0A0118] text-[#7C8DB0] border border-[rgba(79,70,229,0.15)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Rating and downloads */}
      <div className="flex items-center justify-between mb-3">
        <StarRating rating={template.avgRating} count={template.ratingCount} />
        <div className="flex items-center gap-1 text-xs text-[#7C8DB0]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>{template.downloads}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div className="flex items-center justify-between text-xs text-[#7C8DB0] mb-3">
          <span>{template.authorEmail}</span>
          <span>{formatDate(template.createdAt)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUseTemplate}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30 hover:bg-[#4F46E5]/30 hover:border-[#4F46E5]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? "Creating..." : "Use Template"}
          </button>
          <button
            onClick={() => onRateTemplate(template.id)}
            className="py-2 px-3 rounded-lg text-sm text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-[#A78BFA] hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
            title="Rate this template"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
