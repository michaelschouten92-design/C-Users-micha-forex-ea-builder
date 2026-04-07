"use client";

import { MetricCounter } from "./metric-counter";

const METRICS = [
  { value: 99.9, suffix: "%", label: "Uptime", duration: 1200 },
  { value: 24, suffix: "/7", label: "Monitoring", duration: 800 },
  { value: 30, suffix: "+", label: "Countries", duration: 1000 },
  { value: 5, suffix: "min", label: "Setup time", duration: 600 },
] as const;

export function SocialProofBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-8 md:gap-16 py-8 ${className}`}>
      {METRICS.map((m) => (
        <MetricCounter
          key={m.label}
          value={m.value}
          suffix={m.suffix}
          label={m.label}
          duration={m.duration}
        />
      ))}
    </div>
  );
}
