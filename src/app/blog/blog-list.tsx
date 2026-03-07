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
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            !activeTag
              ? "bg-[#6366F1] text-white border-[#6366F1]"
              : "bg-transparent text-[#A1A1AA] border-[rgba(255,255,255,0.10)] hover:text-[#FAFAFA]"
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeTag === tag
                ? "bg-[#6366F1] text-white border-[#6366F1]"
                : "bg-transparent text-[#A1A1AA] border-[rgba(255,255,255,0.10)] hover:text-[#FAFAFA]"
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
            className="block bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 hover:border-[rgba(255,255,255,0.10)] transition-colors group"
          >
            <div className="flex items-center gap-3 text-xs text-[#71717A] mb-3">
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
            <h2 className="text-lg font-semibold text-[#FAFAFA] group-hover:text-[#818CF8] transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-sm text-[#A1A1AA] line-clamp-2">{post.description}</p>
            <div className="flex gap-2 mt-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.10)] text-[#818CF8] border border-[rgba(99,102,241,0.20)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-center py-12 text-[#71717A] text-sm">
            No posts found for &ldquo;{activeTag}&rdquo;
          </p>
        )}
      </div>
    </>
  );
}
