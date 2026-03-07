/**
 * Twitter image — re-exports the OpenGraph image so twitter:image is explicitly set.
 * This ensures X/Twitter shows the large proof card regardless of og:image fallback behavior.
 */
export { default } from "./opengraph-image";
export { runtime, alt, size, contentType } from "./opengraph-image";
