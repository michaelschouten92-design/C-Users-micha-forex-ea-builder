export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Nav skeleton */}
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="h-6 w-28 bg-[#1E1E3A] rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-4 w-40 bg-[#1E1E3A] rounded animate-pulse hidden sm:block" />
              <div className="h-6 w-14 bg-[#1E1E3A] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Subscription panel skeleton */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-[#1E1E3A] rounded animate-pulse" />
              <div className="h-4 w-48 bg-[#1E1E3A] rounded animate-pulse" />
            </div>
            <div className="h-9 w-24 bg-[#1E1E3A] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-40 bg-[#1E1E3A] rounded animate-pulse" />
          <div className="h-10 w-32 bg-[#1E1E3A] rounded-lg animate-pulse" />
        </div>

        {/* Project cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6"
            >
              <div className="space-y-3">
                <div className="h-5 w-3/4 bg-[#1E1E3A] rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-[#1E1E3A] rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-[#1E1E3A] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
