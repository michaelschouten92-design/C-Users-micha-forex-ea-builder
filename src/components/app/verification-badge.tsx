"use client";

export type VerificationLevel = "L1" | "L2" | "L3";

interface VerificationBadgeProps {
  level: VerificationLevel;
  className?: string;
}

const LEVEL_CONFIG = {
  L1: {
    label: "Ledger Verified",
    color: "#3B82F6",
    description: "Hash chain integrity verified",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  L2: {
    label: "Broker Corroborated",
    color: "#10B981",
    description: "Broker data matches reported performance",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  L3: {
    label: "Notarized",
    color: "#F59E0B",
    description: "Third-party notarized verification",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
} as const;

export function VerificationBadge({ level, className = "" }: VerificationBadgeProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${config.color}10`,
        color: config.color,
        borderColor: `${config.color}20`,
      }}
      title={config.description}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/**
 * Determine the highest verification level based on available data.
 */
export function getVerificationLevel(params: {
  chainVerified: boolean;
  brokerVerified: boolean;
  notarized?: boolean;
}): VerificationLevel | null {
  if (params.notarized) return "L3";
  if (params.brokerVerified) return "L2";
  if (params.chainVerified) return "L1";
  return null;
}
