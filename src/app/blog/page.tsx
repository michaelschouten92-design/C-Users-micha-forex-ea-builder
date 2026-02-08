import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";
import { BlogList } from "./blog-list";

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
            Tips, tutorials, and strategies for building profitable Expert Advisors.
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
