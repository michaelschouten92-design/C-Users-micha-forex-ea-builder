interface SkeletonTextProps {
  width?: string;
  className?: string;
}

export function SkeletonText({
  width = "w-full",
  className = "",
}: SkeletonTextProps): React.ReactNode {
  return <div className={`h-3 ${width} bg-[#1E293B] rounded animate-pulse ${className}`} />;
}

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps): React.ReactNode {
  return (
    <div
      className={`bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4 ${className}`}
    >
      <div className="h-5 w-3/4 bg-[#1E293B] rounded animate-pulse" />
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-3 bg-[#1E293B] rounded animate-pulse ${i === lines - 1 ? "w-1/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

interface SkeletonMetricProps {
  className?: string;
}

export function SkeletonMetric({ className = "" }: SkeletonMetricProps): React.ReactNode {
  return (
    <div className={`bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg p-4 ${className}`}>
      <div className="h-2 w-16 bg-[#1E293B] rounded animate-pulse mb-2" />
      <div className="h-5 w-20 bg-[#1E293B] rounded animate-pulse" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: SkeletonTableProps): React.ReactNode {
  return (
    <div
      className={`bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-[rgba(79,70,229,0.15)]">
        {Array.from({ length: columns }, (_, i) => (
          <div
            key={i}
            className={`h-3 bg-[#1E293B] rounded animate-pulse ${i === 0 ? "w-1/3" : "w-1/6"}`}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 p-4 border-b border-[rgba(79,70,229,0.08)] last:border-b-0"
        >
          {Array.from({ length: columns }, (_, colIdx) => (
            <div
              key={colIdx}
              className={`h-3 bg-[#1E293B] rounded animate-pulse ${colIdx === 0 ? "w-1/3" : "w-1/6"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
