"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MetricCounterProps {
  /** Target number to count up to */
  value: number;
  /** Suffix appended after the number (e.g., "+", "%", "ms") */
  suffix?: string;
  /** Prefix before the number (e.g., "$", "€") */
  prefix?: string;
  /** Label displayed below the number */
  label: string;
  /** Animation duration in ms. Default 1500 */
  duration?: number;
}

export function MetricCounter({
  value,
  suffix = "",
  prefix = "",
  label,
  duration = 1500,
}: MetricCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const reducedMotion = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (reducedMotion.current) {
      setCount(value);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl md:text-3xl font-bold text-[#FAFAFA] tabular-nums">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-[#71717A] uppercase tracking-wide">{label}</p>
    </div>
  );
}
