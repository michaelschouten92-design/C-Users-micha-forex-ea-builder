export default function CommunityLoading() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="h-5 w-28 bg-[#1E293B] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#1E293B] rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse hidden sm:block" />
              <div className="h-4 w-16 bg-[#1E293B] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-56 bg-[#1E293B] rounded animate-pulse" />
          <div className="h-4 w-96 bg-[#1E293B] rounded animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 space-y-4"
            >
              <div className="h-5 w-3/4 bg-[#1E293B] rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-[#1E293B] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-[#1E293B] rounded animate-pulse" />
              </div>
              <div className="pt-4 border-t border-[rgba(79,70,229,0.15)]">
                <div className="flex justify-between mb-3">
                  <div className="h-3 w-24 bg-[#1E293B] rounded animate-pulse" />
                  <div className="h-3 w-20 bg-[#1E293B] rounded animate-pulse" />
                </div>
                <div className="h-9 w-full bg-[#1E293B] rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
