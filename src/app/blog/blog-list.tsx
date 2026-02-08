"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog/posts";

interface BlogListProps {
  posts: BlogPost[];
  allTags: string[];
}

export function BlogList({ posts, allTags }: BlogListProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.includes(activeTag));
  }, [posts, activeTag]);

  return (
    <>
      {/* Tag filter bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
            !activeTag
              ? "bg-[#4F46E5] text-white border-[#4F46E5]"
              : "bg-transparent text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:border-[rgba(79,70,229,0.5)] hover:text-white"
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
              activeTag === tag
                ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                : "bg-transparent text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:border-[rgba(79,70,229,0.5)] hover:text-white"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="space-y-6">
        {filtered.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3 text-xs text-[#64748B] mb-3">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>&middot;</span>
              <span>{post.readTime}</span>
            </div>
            <h2 className="text-lg font-semibold text-white group-hover:text-[#22D3EE] transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-sm text-[#94A3B8] line-clamp-2">{post.description}</p>
            <div className="flex gap-2 mt-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.3)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-center py-12 text-[#64748B] text-sm">
            No posts found for &ldquo;{activeTag}&rdquo;
          </p>
        )}
      </div>
    </>
  );
}
