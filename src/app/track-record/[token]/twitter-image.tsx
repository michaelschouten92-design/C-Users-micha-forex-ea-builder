/**
 * Twitter/X card image — re-exports the OG image generator.
 * Next.js uses this file convention to set twitter:image meta tag.
 * Note: runtime/size/contentType must be declared directly (Next.js
 * cannot statically analyze re-exports for route segment config).
 */
export { default } from "./opengraph-image";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AlgoStudio Verified Trading Record";
