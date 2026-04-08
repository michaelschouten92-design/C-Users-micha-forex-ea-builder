import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Show gradient border effect */
  gradientBorder?: boolean;
  /** Additional padding override */
  padding?: string;
}

export function GlassCard({
  children,
  className = "",
  gradientBorder = false,
  padding = "p-6",
}: GlassCardProps) {
  if (gradientBorder) {
    return (
      <div className={`border-gradient ${className}`}>
        <div
          className={`relative rounded-[13px] bg-[rgba(17,17,20,0.8)] backdrop-blur-xl ${padding}`}
        >
          {children}
        </div>
      </div>
    );
  }

  return <div className={`glass-card ${padding} ${className}`}>{children}</div>;
}
