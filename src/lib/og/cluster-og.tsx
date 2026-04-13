/**
 * Shared OG image renderer for the programmatic SEO clusters
 * (/features, /prop-firms, /alternatives).
 *
 * Each cluster's opengraph-image.tsx passes in a title + label and gets back
 * a 1200x630 ImageResponse with the brand background and accent styling
 * consistent with the root /opengraph-image.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

interface ClusterOGProps {
  /** Headline text (feature/firm/competitor name). */
  title: string;
  /**
   * Small label above the title (e.g., "Feature", "Prop Firm Guide",
   * "Alternative Comparison"). Rendered in accent purple.
   */
  label: string;
  /**
   * Optional tagline rendered below the title. Kept short (≤100 chars) or
   * truncated visually by layout.
   */
  tagline?: string;
}

export function renderClusterOG({ title, label, tagline }: ClusterOGProps): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px 96px",
        background: "linear-gradient(135deg, #0D0117 0%, #1A0626 50%, #0D0117 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Decorative gradient orbs (same as root OG) */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-120px",
          width: "460px",
          height: "460px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.32) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-140px",
          left: "-140px",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Top row — brand mark + label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          Algo Studio
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#A78BFA",
            textTransform: "uppercase",
            letterSpacing: "3px",
            padding: "8px 16px",
            border: "1px solid rgba(167,139,250,0.35)",
            borderRadius: "8px",
            display: "flex",
          }}
        >
          {label}
        </div>
      </div>

      {/* Main title block */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "1000px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: title.length > 48 ? "64px" : "80px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          {title}
        </div>
        {tagline && (
          <div
            style={{
              fontSize: "28px",
              color: "#CBD5E1",
              fontWeight: 500,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            {tagline}
          </div>
        )}
      </div>

      {/* Bottom — accent bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "48px",
            height: "4px",
            background: "linear-gradient(90deg, #6366F1 0%, #A78BFA 100%)",
            borderRadius: "2px",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: "20px",
            color: "#94A3B8",
            fontWeight: 500,
            display: "flex",
          }}
        >
          algo-studio.com
        </div>
      </div>
    </div>,
    { ...OG_SIZE }
  );
}
