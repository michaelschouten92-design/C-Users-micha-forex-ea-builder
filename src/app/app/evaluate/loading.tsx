export default function EvaluateLoading() {
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
        <div className="h-8 w-48 bg-[#1E293B] rounded animate-pulse mb-6" />
        <div className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)] p-8">
          <div className="animate-pulse space-y-4 text-center">
            <div className="w-16 h-16 mx-auto bg-[#1E293B] rounded-xl" />
            <div className="h-4 bg-[#1E293B] rounded w-1/3 mx-auto" />
            <div className="h-3 bg-[#1E293B] rounded w-1/2 mx-auto" />
          </div>
        </div>
      </main>
    </div>
  );
}
