import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlgoStudio",
    short_name: "AlgoStudio",
    description: "No-Code MT5 Expert Advisor Builder",
    start_url: "/app",
    display: "standalone",
    background_color: "#0D0117",
    theme_color: "#4F46E5",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
