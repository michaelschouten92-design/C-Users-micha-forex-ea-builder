export default function ProjectLoading() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-80 bg-[#1A0626] border-r border-[rgba(79,70,229,0.2)] p-4 space-y-4 shrink-0">
        {/* Back button */}
        <div className="h-8 w-24 bg-[#1E1E3A] rounded animate-pulse" />
        {/* Project name */}
        <div className="h-6 w-48 bg-[#1E1E3A] rounded animate-pulse" />
        {/* Settings sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 pt-4 border-t border-[rgba(79,70,229,0.1)]">
            <div className="h-4 w-28 bg-[#1E1E3A] rounded animate-pulse" />
            <div className="h-8 w-full bg-[#1E1E3A] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Canvas skeleton */}
      <div className="flex-1 flex items-center justify-center bg-[#0A0118]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#94A3B8] text-sm">Loading project...</p>
        </div>
      </div>
    </div>
  );
}
