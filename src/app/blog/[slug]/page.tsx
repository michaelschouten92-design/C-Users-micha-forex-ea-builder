import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | AlgoStudio Blog`,
    description: post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/blog" className="text-[#22D3EE] hover:underline text-sm">
            &larr; Back to blog
          </Link>
        </div>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-xs text-[#64748B] mb-4">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>&middot;</span>
            <span>{post.readTime}</span>
            <span>&middot;</span>
            <span>{post.author}</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight">{post.title}</h1>
          <p className="text-[#94A3B8] mt-3">{post.description}</p>
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.3)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div
          className="prose prose-invert prose-sm max-w-none
            [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4
            [&_p]:text-[#CBD5E1] [&_p]:leading-relaxed [&_p]:mb-4
            [&_strong]:text-white
            [&_ul]:text-[#CBD5E1] [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc
            [&_ol]:text-[#CBD5E1] [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal
            [&_li]:leading-relaxed
            [&_a]:text-[#22D3EE] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-[#1A0626] to-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready to build your own EA?</h3>
          <p className="text-[#94A3B8] mb-6 text-sm">
            Start building automated trading strategies for MetaTrader 5 — no coding required.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
          >
            Get Started Free
          </Link>
        </div>
      </article>
    </div>
  );
}
