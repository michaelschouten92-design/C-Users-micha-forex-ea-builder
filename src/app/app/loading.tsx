export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Trading Studio
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse hidden sm:block" />
              <div className="h-6 w-12 bg-[rgba(79,70,229,0.2)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats skeleton */}
        <div className="mb-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-[#1E293B] rounded animate-pulse" />
                <div className="h-6 w-10 bg-[#1E293B] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-36 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-10 w-32 bg-[#1E293B] rounded-lg animate-pulse" />
        </div>

        {/* Project cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4"
            >
              <div className="h-5 w-3/4 bg-[#1E293B] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[#1E293B] rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-[#1E293B] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
