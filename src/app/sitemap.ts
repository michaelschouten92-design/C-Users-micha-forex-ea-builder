import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/posts";
import { prisma } from "@/lib/prisma";

async function getPublicStrategyPages(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const pages = await prisma.verifiedStrategyPage.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
    });
    return pages.map((p) => ({
      url: `${baseUrl}/strategy/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

async function getPublicTraderProfiles(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const users = await prisma.user.findMany({
      where: { handle: { not: null } },
      select: { handle: true, lastLoginAt: true },
    });
    return users
      .filter((u): u is { handle: string; lastLoginAt: Date | null } => u.handle !== null)
      .map((u) => ({
        url: `${baseUrl}/u/${u.handle}`,
        lastModified: u.lastLoginAt ?? new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

  const blogPosts = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const [strategyPages, traderProfiles] = await Promise.all([
    getPublicStrategyPages(baseUrl),
    getPublicTraderProfiles(baseUrl),
  ]);

  return [
    ...strategyPages,
    ...traderProfiles,
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/how-it-works`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/verify`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogPosts,
    {
      url: `${baseUrl}/strategies`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sample-evaluation`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/roadmap`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/status`,
      changeFrequency: "daily",
      priority: 0.4,
    },
  ];
}
