"use client";

import { useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface RateModalProps {
  isOpen: boolean;
  templateId: string;
  onClose: () => void;
  onRated: () => void;
}

export function RateModal({ isOpen, templateId, onClose, onRated }: RateModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (rating === 0) {
      showError("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/marketplace/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          templateId,
          rating,
          review: review.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Failed to submit rating");
        return;
      }

      showSuccess("Rating submitted");
      onRated();
      onClose();
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Rate Template</h3>
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

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <svg
                  className={`w-8 h-8 ${displayRating >= star ? "text-[#F59E0B]" : "text-[#374151]"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-[#7C8DB0] mb-4">
            {displayRating === 0 && "Click to rate"}
            {displayRating === 1 && "Poor"}
            {displayRating === 2 && "Fair"}
            {displayRating === 3 && "Good"}
            {displayRating === 4 && "Very Good"}
            {displayRating === 5 && "Excellent"}
          </p>

          {/* Review */}
          <div className="mb-6">
            <textarea
              maxLength={500}
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Optional: share your thoughts..."
              className="w-full rounded-lg bg-[#0A0118] border border-[rgba(79,70,229,0.3)] text-white px-4 py-2.5 text-sm placeholder:text-[#7C8DB0] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors resize-none"
            />
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
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
