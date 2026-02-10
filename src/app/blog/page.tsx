import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";
import { BlogList } from "./blog-list";

export const metadata: Metadata = {
  title: "Blog — MT5 Automation Tutorials",
  description:
    "Practical MT5 automation tutorials. Learn to build trading bots with EMA crossovers, RSI reversals, range breakouts, and more — no coding required.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog — MT5 Automation Tutorials | AlgoStudio",
    description:
      "Practical MT5 automation tutorials. Build each strategy in minutes with AlgoStudio.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            AlgoStudio
          </Link>
          <h1 className="text-4xl font-bold text-white mt-4">Blog</h1>
          <p className="text-[#94A3B8] mt-2">
            Practical MT5 automation tutorials. Build each strategy in minutes.
          </p>
        </div>

        <BlogList posts={posts} allTags={allTags} />

        <div className="mt-12 text-center">
          <Link href="/" className="text-[#22D3EE] hover:underline text-sm">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
