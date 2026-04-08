export default function OnboardingLoading() {
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
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <div className="text-center mb-8">
          <div className="h-7 w-56 bg-[#1E293B] rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-72 bg-[#1E293B] rounded animate-pulse mx-auto" />
        </div>
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-8 h-8 bg-[#1E293B] rounded-full animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#1E293B] rounded w-1/4" />
            <div className="h-6 bg-[#1E293B] rounded w-2/3" />
            <div className="h-3 bg-[#1E293B] rounded w-1/2" />
          </div>
        </div>
      </main>
    </div>
  );
}
