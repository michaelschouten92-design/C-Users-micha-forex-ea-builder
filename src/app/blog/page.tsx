import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { getAllPosts } from "@/lib/blog/posts";
import { BlogList } from "./blog-list";

export const metadata: Metadata = {
  title: "Blog — Strategy Monitoring & Governance | AlgoStudio",
  description:
    "Articles on algorithmic trading strategy monitoring, verification, risk analysis, and governance. Practical insights for systematic traders.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | AlgoStudio",
    description:
      "Articles on strategy monitoring, verification, and governance for algorithmic trading.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B]">
      <SiteNav />
      <div className="max-w-3xl mx-auto pt-32 pb-16 px-4 flex-1">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#FAFAFA]">Blog</h1>
          <p className="text-[#A1A1AA] mt-2">
            Strategy monitoring, verification, and governance for algorithmic trading.
          </p>
        </div>

        <BlogList posts={posts} allTags={allTags} />
      </div>
      <Footer />
    </div>
  );
}
