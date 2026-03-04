import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const host = process.env.AUTH_URL || "https://algo-studio.com";

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
          "/product/track-record",
          "/pricing",
          "/verified",
          "/verify",
          "/proof/",
          "/blog",
          "/prop-firms",
          "/faq",
          "/about",
          "/contact",
          "/privacy",
          "/terms",
          "/roadmap",
          "/status",
        ],
        disallow: [
          "/app/",
          "/api/",
          "/internal/",
          "/embed/",
          "/shared/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    host,
    sitemap: `${host}/sitemap.xml`,
  };
}
