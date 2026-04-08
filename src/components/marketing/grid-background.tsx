import type { ReactNode } from "react";

interface GridBackgroundProps {
  children: ReactNode;
  className?: string;
  /** Show a radial gradient glow on top of the grid */
  glow?: boolean;
}

/**
 * Subtle dot-grid background pattern with optional radial glow.
 * Used for hero sections and feature areas to add visual depth.
 */
export function GridBackground({ children, className = "", glow = false }: GridBackgroundProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Dot grid pattern */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" aria-hidden="true" />
      {/* Optional radial glow */}
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "var(--gradient-radial-glow)" }}
          aria-hidden="true"
        />
      )}
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
