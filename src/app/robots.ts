import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/privacy",
          "/terms",
          "/contact",
          "/blog",
          "/no-code-ea-builder",
          "/visual-strategy-builder",
          "/automated-trading-for-beginners",
          "/templates",
        ],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: `${process.env.AUTH_URL || "https://algo-studio.com"}/sitemap.xml`,
  };
}
