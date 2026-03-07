"use client";

import { useState, useMemo } from "react";

type FAQCategory =
  | "General"
  | "Verification"
  | "Track Record & Monitoring"
  | "Technical"
  | "Pricing";

interface FAQItem {
  q: string;
  a: string;
  category: FAQCategory;
}

const CATEGORIES: FAQCategory[] = [
  "General",
  "Verification",
  "Track Record & Monitoring",
  "Technical",
  "Pricing",
];

export function FAQContent({ items }: { items: FAQItem[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FAQCategory | "All">("All");

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        !query || item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, activeCategory]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="w-full pl-11 pr-4 py-3 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#FAFAFA] text-sm placeholder-[#71717A] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory("All")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeCategory === "All"
              ? "bg-[#6366F1] text-white"
              : "bg-[#111114] text-[#A1A1AA] border border-[rgba(255,255,255,0.06)] hover:text-[#FAFAFA]"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-[#6366F1] text-white"
                : "bg-[#111114] text-[#A1A1AA] border border-[rgba(255,255,255,0.06)] hover:text-[#FAFAFA]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-center text-[#71717A] py-8">
            No questions match your search. Try a different term.
          </p>
        ) : (
          filtered.map((item, i) => (
            <details
              key={i}
              className="group bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-[#FAFAFA] font-medium text-sm list-none">
                <span className="flex items-center gap-3">
                  {item.q}
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(99,102,241,0.10)] text-[#818CF8] border border-[rgba(99,102,241,0.20)]">
                    {item.category}
                  </span>
                </span>
                <svg
                  className="w-5 h-5 text-[#71717A] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
