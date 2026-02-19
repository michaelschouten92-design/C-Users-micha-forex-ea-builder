"use client";

import { useState, useEffect, useCallback } from "react";
import { TemplateCard } from "@/components/marketplace/template-card";
import { SearchFilters } from "@/components/marketplace/search-filters";
import { PublishModal } from "@/components/marketplace/publish-modal";
import { RateModal } from "@/components/marketplace/rate-modal";

interface MarketplaceTemplate {
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
}

interface MarketplaceClientProps {
  userId: string;
  initialTemplates: MarketplaceTemplate[];
  initialCategories: readonly string[];
  initialTotal: number;
}

export function MarketplaceClient({
  userId,
  initialTemplates,
  initialCategories,
  initialTotal,
}: MarketplaceClientProps) {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>(initialTemplates);
  const [categories] = useState<readonly string[]>(initialCategories);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Modal state
  const [publishOpen, setPublishOpen] = useState(false);
  const [ratingTemplateId, setRatingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("sort", sort);
      if (query) params.set("q", query);
      if (category) params.set("category", category);

      const res = await fetch(`/api/marketplace/search?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setTemplates(data.data);
        setTotal(data.pagination.total);
      }
    } catch {
      // Silent fail, keep showing current data
    } finally {
      setLoading(false);
    }
  }, [page, sort, query, category]);

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTemplates();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, sort, fetchTemplates]);

  // Fetch on page change (no debounce needed)
  useEffect(() => {
    if (page > 1) {
      fetchTemplates();
    }
  }, [page, fetchTemplates]);

  function handleRateTemplate(templateId: string) {
    setRatingTemplateId(templateId);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header with publish button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Strategy Marketplace</h2>
          <p className="mt-1 text-[#94A3B8]">
            Browse, share, and rate community strategies. {total} template
            {total !== 1 ? "s" : ""} available.
          </p>
        </div>
        <button
          onClick={() => setPublishOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Publish Strategy
        </button>
      </div>

      {/* Search and filters */}
      <SearchFilters
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={(cat) => {
          setCategory(cat);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        categories={categories}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Template grid */}
      {templates.length === 0 && !loading ? (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-[#4F46E5]/40 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {query || category ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
              <p className="text-[#94A3B8] max-w-md mx-auto">
                Try adjusting your search or filters to find strategies.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No community templates yet</h3>
              <p className="text-[#94A3B8] max-w-md mx-auto">
                Be the first to share a strategy! Click &ldquo;Publish Strategy&rdquo; to get
                started.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              currentUserId={userId}
              onRateTemplate={handleRateTemplate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:text-white hover:border-[rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-[#7C8DB0]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:text-white hover:border-[rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Publish Modal */}
      <PublishModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={fetchTemplates}
        buildJson={null}
      />

      {/* Rate Modal */}
      {ratingTemplateId && (
        <RateModal
          isOpen={true}
          templateId={ratingTemplateId}
          onClose={() => setRatingTemplateId(null)}
          onRated={fetchTemplates}
        />
      )}
    </div>
  );
}
