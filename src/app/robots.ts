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
          "/verified",
          "/faq",
        ],
        disallow: ["/app/", "/api/", "/internal/"],
      },
    ],
    sitemap: `${process.env.AUTH_URL || "https://algo-studio.com"}/sitemap.xml`,
  };
}
