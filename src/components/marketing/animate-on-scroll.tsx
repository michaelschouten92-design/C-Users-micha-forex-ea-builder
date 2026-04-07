"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Animation direction: default "up", or "left"/"right" for horizontal slides */
  direction?: "up" | "left" | "right";
  /** Stagger delay index (1-4) for sequential animations within a group */
  delay?: 1 | 2 | 3 | 4;
  /** IntersectionObserver threshold (0-1). Default 0.15 */
  threshold?: number;
}

export function AnimateOnScroll({
  children,
  className = "",
  direction = "up",
  delay,
  threshold = 0.15,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const dirClass = direction === "left" ? "slide-left" : direction === "right" ? "slide-right" : "";
  const delayClass = delay ? `delay-${delay}` : "";

  return (
    <div ref={ref} className={`animate-on-scroll ${dirClass} ${delayClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
