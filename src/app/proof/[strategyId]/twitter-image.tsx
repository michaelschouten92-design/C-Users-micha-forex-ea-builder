/**
 * Twitter image — delegates to the OpenGraph image so twitter:image is explicitly set.
 * Turbopack requires route config exports (runtime, etc.) to be direct declarations.
 */
export { default } from "./opengraph-image";

export const runtime = "edge";
export const alt = "AlgoStudio Verified Strategy Proof";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
