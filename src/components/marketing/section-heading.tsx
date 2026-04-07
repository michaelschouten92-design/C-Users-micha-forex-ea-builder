import type { ReactNode } from "react";

interface SectionHeadingProps {
  /** Small label above the heading (eyebrow text) */
  eyebrow?: string;
  /** Main heading content */
  children: ReactNode;
  /** Optional description below the heading */
  description?: string;
  /** Text alignment */
  align?: "center" | "left";
  /** Additional className */
  className?: string;
}

export function SectionHeading({
  eyebrow,
  children,
  description,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-3xl ${alignClass} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#A1A1AA] mb-4">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[24px] md:text-[36px] font-bold tracking-tight leading-[1.2] text-[#FAFAFA]">
        {children}
      </h2>
      {description && (
        <p className="mt-4 text-base text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
}
