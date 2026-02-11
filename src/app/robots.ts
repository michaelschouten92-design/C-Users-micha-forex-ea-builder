import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/product",
          "/product/how-it-works",
          "/product/mt5-export",
          "/product/simplicity",
          "/pricing",
          "/privacy",
          "/terms",
          "/contact",
          "/blog",
          "/templates",
          "/build-mt5-expert-advisor-without-coding",
          "/visual-trading-bot-builder",
          "/trading-strategy-templates-mt5",
          "/compare/algostudio-vs-complex-ea-builders",
          "/faq",
        ],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: `${process.env.AUTH_URL || "https://algo-studio.com"}/sitemap.xml`,
  };
}
