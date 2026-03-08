export default function AdminLoading() {
  return (
    <div className="min-h-screen">
      <nav className="bg-[#111114]/80 backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="h-5 w-32 bg-[#18181B] rounded animate-pulse" />
            <div className="h-4 w-28 bg-[#18181B] rounded animate-pulse" />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div className="h-8 w-40 bg-[#18181B] rounded animate-pulse mb-6" />
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 bg-[#18181B] rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4"
            >
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[#18181B] rounded w-2/3" />
                <div className="h-6 bg-[#18181B] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
