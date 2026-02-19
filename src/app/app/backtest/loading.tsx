export default function BacktestLoading() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="h-5 w-28 bg-[#1E293B] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[#1E293B] rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse hidden sm:block" />
              <div className="h-4 w-16 bg-[#1E293B] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-40 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-4 w-80 bg-[#1E293B] rounded animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4">
          <div className="h-5 w-36 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-10 w-full bg-[#1E293B] rounded-lg animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 bg-[#1E293B] rounded-lg animate-pulse" />
            <div className="h-10 bg-[#1E293B] rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-full bg-[#1E293B] rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-[#1E293B] rounded-lg animate-pulse" />
        </div>

        {/* Results skeleton */}
        <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 space-y-4">
          <div className="h-5 w-32 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-48 bg-[#1E293B] rounded-lg animate-pulse" />
        </div>

        {/* Help card skeleton */}
        <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 space-y-4">
          <div className="h-5 w-64 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-4 w-full bg-[#1E293B] rounded animate-pulse" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 bg-[#1E293B] rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse" />
                  <div className="h-3 w-full bg-[#1E293B] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
