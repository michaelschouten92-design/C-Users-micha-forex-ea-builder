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
        const data = await res.json();
        const msg = data.error || "Something went wrong";
        if (res.status === 403 || msg.toLowerCase().includes("limit")) {
          setIsLimitError(true);
        }
        throw new Error(msg);
      }

      const project = await res.json();
      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/app/projects/${project.id}`);
      router.refresh();
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
        className="bg-[#4F46E5] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
      >
        + New Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-md mx-4">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">New Project</h3>

                {error && (
                  <div
                    className={`p-3 rounded-lg mb-4 text-sm border ${isLimitError ? "bg-[rgba(79,70,229,0.1)] border-[rgba(79,70,229,0.3)] text-[#A78BFA]" : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"}`}
                  >
                    <p>{error}</p>
                    {isLimitError && (
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
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
                    <label htmlFor="name" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="My EA Strategy"
                      required
                      className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-[#CBD5E1] mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0F172A]/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-[rgba(79,70,229,0.2)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[#94A3B8] hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="bg-[#4F46E5] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
