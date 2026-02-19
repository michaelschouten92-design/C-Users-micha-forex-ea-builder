"use client";

import { useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
  buildJson: object | null;
}

const CATEGORIES = [
  { value: "scalping", label: "Scalping" },
  { value: "trend-following", label: "Trend Following" },
  { value: "breakout", label: "Breakout" },
  { value: "mean-reversion", label: "Mean Reversion" },
  { value: "grid", label: "Grid" },
  { value: "martingale", label: "Martingale" },
  { value: "hedging", label: "Hedging" },
  { value: "news-trading", label: "News Trading" },
  { value: "other", label: "Other" },
] as const;

const SUGGESTED_TAGS = [
  "forex",
  "gold",
  "indices",
  "crypto",
  "multi-pair",
  "high-frequency",
  "swing",
  "day-trading",
  "passive",
  "aggressive",
] as const;

export function PublishModal({ isOpen, onClose, onPublished, buildJson }: PublishModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function handleToggleTag(tag: string) {
    setTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  }

  function handleAddCustomTag() {
    const trimmed = customTag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 5) return;
    setTags((prev) => [...prev, trimmed]);
    setCustomTag("");
  }

  async function handlePublish() {
    if (!name.trim()) {
      showError("Please enter a name for your strategy");
      return;
    }

    if (!buildJson) {
      showError("No strategy data available to publish");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/marketplace/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          buildJson,
          tags,
          category: category || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Failed to publish strategy");
        return;
      }

      showSuccess("Strategy published to marketplace");
      onPublished();
      onClose();
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Publish to Marketplace</h3>
            <button
              onClick={onClose}
              className="text-[#7C8DB0] hover:text-white transition-colors p-1"
            >
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

          {/* Name */}
          <div className="mb-4">
            <label htmlFor="pub-name" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Strategy Name *
            </label>
            <input
              id="pub-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Golden Cross Scalper"
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm placeholder:text-[#7C8DB0] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="pub-desc" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Description
            </label>
            <textarea
              id="pub-desc"
              maxLength={1000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how your strategy works, best pairs, timeframes, etc."
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm placeholder:text-[#7C8DB0] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label htmlFor="pub-cat" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Category
            </label>
            <select
              id="pub-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Tags ({tags.length}/5)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
                    tags.includes(tag)
                      ? "bg-[#4F46E5]/30 text-[#A78BFA] border-[#4F46E5]/50"
                      : "bg-[#0A0118] text-[#7C8DB0] border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={30}
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Add custom tag..."
                className="flex-1 rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-3 py-1.5 text-xs placeholder:text-[#7C8DB0] focus:outline-none focus:border-[#4F46E5] transition-colors"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim() || tags.length >= 5}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30 hover:bg-[#4F46E5]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting || !name.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            >
              {submitting ? "Publishing..." : "Publish Strategy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
