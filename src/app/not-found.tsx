import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0A1A] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-[#4F46E5] mb-4">404</p>
        <h1 className="text-2xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-[#94A3B8] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}
