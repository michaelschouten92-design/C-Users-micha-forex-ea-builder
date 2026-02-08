import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog | AlgoStudio",
  description:
    "Learn about automated forex trading, EA development, and strategy building with AlgoStudio.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | AlgoStudio",
    description: "Learn about automated forex trading, EA development, and strategy building.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            AlgoStudio
          </Link>
          <h1 className="text-4xl font-bold text-white mt-4">Blog</h1>
          <p className="text-[#94A3B8] mt-2">
            Tips, tutorials, and strategies for building profitable Expert Advisors.
          </p>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
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
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-[#22D3EE] hover:underline text-sm">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
