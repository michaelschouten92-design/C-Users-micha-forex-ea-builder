import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
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
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="max-w-3xl mx-auto pt-32 pb-16 px-4 flex-1">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white">Blog</h1>
          <p className="text-[#94A3B8] mt-2">
            Practical MT5 automation tutorials. Build each strategy in minutes.
          </p>
        </div>

        <BlogList posts={posts} allTags={allTags} />
      </div>
      <Footer />
    </div>
  );
}
