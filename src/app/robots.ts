import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const host = process.env.SITE_URL ?? "https://algo-studio.com";

  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/app/",
          "/api/",
          "/internal/",
          "/embed/",
          "/shared/",
          "/login",
          "/login/",
          "/register",
          "/register/",
          "/forgot-password",
          "/forgot-password/",
          "/reset-password",
          "/reset-password/",
        ],
      },
    ],
    host,
    sitemap: `${host}/sitemap.xml`,
  };
}
