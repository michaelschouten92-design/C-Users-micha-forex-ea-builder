"use client";

import { useState, useMemo } from "react";

type FAQCategory = "General" | "Templates & Builder" | "Technical" | "Pricing";

interface FAQItem {
  q: string;
  a: string;
  category: FAQCategory;
}

const CATEGORIES: FAQCategory[] = ["General", "Templates & Builder", "Technical", "Pricing"];

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
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]"
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
          className="w-full pl-11 pr-4 py-3 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all duration-200"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory("All")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeCategory === "All"
              ? "bg-[#4F46E5] text-white"
              : "bg-[#1A0626]/50 text-[#94A3B8] border border-[rgba(79,70,229,0.15)] hover:border-[rgba(79,70,229,0.4)] hover:text-white"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-[#4F46E5] text-white"
                : "bg-[#1A0626]/50 text-[#94A3B8] border border-[rgba(79,70,229,0.15)] hover:border-[rgba(79,70,229,0.4)] hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-center text-[#64748B] py-8">
            No questions match your search. Try a different term.
          </p>
        ) : (
          filtered.map((item, i) => (
            <details
              key={i}
              className="group bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                <span className="flex items-center gap-3">
                  {item.q}
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(79,70,229,0.1)] text-[#A78BFA] border border-[rgba(79,70,229,0.2)]">
                    {item.category}
                  </span>
                </span>
                <svg
                  className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-4 text-sm text-[#94A3B8] leading-relaxed">{item.a}</div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
