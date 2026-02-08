import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms", "/contact", "/blog"],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: `${process.env.AUTH_URL || "https://algo-studio.com"}/sitemap.xml`,
  };
}
