import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllPosts, getRelatedPosts } from "@/lib/blog/posts";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

/** Strip script tags and event handlers from HTML before rendering */
function sanitizeBlogHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "removed:");
}

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
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "AlgoStudio — Strategy Monitoring & Governance",
        },
      ],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const baseUrl = process.env.AUTH_URL || "https://algo-studio.com";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      url: `${baseUrl}/blog/${slug}`,
      image: `${baseUrl}/opengraph-image`,
      author: {
        "@type": "Organization",
        name: post.author,
        url: baseUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "AlgoStudio",
        url: baseUrl,
        logo: `${baseUrl}/opengraph-image`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: baseUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${baseUrl}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: `${baseUrl}/blog/${slug}`,
        },
      ],
    },
  ];

  return (
    <div id="main-content" className="min-h-screen pt-24 pb-16 px-4 bg-[#09090B]">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/blog" className="text-[#6366F1] hover:underline text-sm">
            &larr; Back to blog
          </Link>
        </div>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-xs text-[#71717A] mb-4">
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
          <h1 className="text-3xl font-bold text-[#FAFAFA] leading-tight">{post.title}</h1>
          <p className="text-[#A1A1AA] mt-3">{post.description}</p>
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[rgba(99,102,241,0.10)] text-[#818CF8] border border-[rgba(99,102,241,0.20)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div
          className="prose prose-invert prose-sm max-w-none
            [&_h2]:text-[#FAFAFA] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4
            [&_p]:text-[#A1A1AA] [&_p]:leading-relaxed [&_p]:mb-4
            [&_strong]:text-[#FAFAFA]
            [&_ul]:text-[#A1A1AA] [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc
            [&_ol]:text-[#A1A1AA] [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal
            [&_li]:leading-relaxed
            [&_a]:text-[#6366F1] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
        />

        {/* Related Posts */}
        {(() => {
          const related = getRelatedPosts(slug);
          return related.length > 0 ? (
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Related Articles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {related.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 hover:border-[rgba(255,255,255,0.10)] transition-colors group"
                  >
                    <p className="text-xs text-[#71717A] mb-1.5">{related.readTime}</p>
                    <h4 className="text-sm font-medium text-[#FAFAFA] group-hover:text-[#818CF8] transition-colors line-clamp-2">
                      {related.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* CTA */}
        <div className="mt-12 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-[#FAFAFA] mb-2">Monitor your trading strategies</h3>
          <p className="text-[#A1A1AA] mb-6 text-sm">
            Continuous performance tracking, verification, and governance for algorithmic
            strategies.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#6366F1] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#818CF8] transition-colors"
          >
            Start monitoring
          </Link>
        </div>
      </article>
      <Footer />
    </div>
  );
}
