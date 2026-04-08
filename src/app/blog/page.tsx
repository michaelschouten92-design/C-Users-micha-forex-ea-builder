import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { getAllPosts } from "@/lib/blog/posts";
import { BlogList } from "./blog-list";

export const metadata: Metadata = {
  title: "Blog — MT5 Trading & EA Monitoring Insights | Algo Studio",
  description:
    "Articles on MT5 Expert Advisor monitoring, strategy drift detection, backtest analysis, and risk management. Practical insights for algo traders.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | Algo Studio",
    description:
      "Articles on strategy monitoring, verification, and governance for algorithmic trading.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  return (
    <div className="min-h-screen flex flex-col bg-[#08080A]">
      <SiteNav />
      <div className="max-w-3xl mx-auto pt-32 pb-16 px-4 flex-1">
        <div className="mb-12">
          <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#FAFAFA] tracking-tight">
            Blog
          </h1>
          <p className="text-[#A1A1AA] mt-3">
            Insights on MT5 strategy monitoring, drift detection, and algorithmic trading.
          </p>
        </div>

        <BlogList posts={posts} allTags={allTags} />
      </div>
      <Footer />
    </div>
  );
}
