"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";

export function CreateProjectButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLimitError, setIsLimitError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLimitError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          res.status === 403
            ? "You've reached your project limit on the current plan. Upgrade to create more projects."
            : data.error || "Something went wrong";
        if (res.status === 403) {
          setIsLimitError(true);
        }
        throw new Error(msg);
      }

      const project = await res.json();
      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/app/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors"
      >
        + New Project
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            if (!loading) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-labelledby="create-project-title"
            className="bg-[#111114] border border-[rgba(255,255,255,0.10)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 id="create-project-title" className="text-lg font-semibold text-white mb-4">
                  New Project
                </h3>

                {error && (
                  <div
                    className={`p-3 rounded-lg mb-4 text-sm border ${isLimitError ? "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.10)] text-[#818CF8]" : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"}`}
                  >
                    <p>{error}</p>
                    {isLimitError && (
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#6366F1] text-white text-xs font-medium rounded-lg hover:bg-[#818CF8] transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                        Upgrade Plan
                      </Link>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#FAFAFA] mb-1">
                      Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 100))}
                      placeholder="My EA Strategy"
                      required
                      autoFocus
                      maxLength={100}
                      className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.10)] rounded-lg text-white placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
                    />
                    <span className="text-[10px] text-[#71717A] mt-0.5 block text-right">
                      {name.length}/100
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-[#FAFAFA] mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                      placeholder="Optional description..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 bg-[#18181B] border border-[rgba(255,255,255,0.10)] rounded-lg text-white placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
                    />
                    <span className="text-[10px] text-[#71717A] mt-0.5 block text-right">
                      {description.length}/500
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#09090B]/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="bg-[#6366F1] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#818CF8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
