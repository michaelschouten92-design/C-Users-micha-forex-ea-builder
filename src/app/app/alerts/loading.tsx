export default function AlertsLoading() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <nav className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="h-5 w-32 bg-[#1E293B] rounded animate-pulse" />
            <div className="h-4 w-28 bg-[#1E293B] rounded animate-pulse" />
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="h-8 w-24 bg-[#1E293B] rounded animate-pulse mb-6" />
        <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-4 mb-6">
          <div className="h-4 w-40 bg-[#1E293B] rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-[#1E293B] rounded-lg animate-pulse" />
            <div className="h-10 bg-[#1E293B] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-4"
            >
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[#1E293B] rounded w-2/3" />
                <div className="h-3 bg-[#1E293B] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
