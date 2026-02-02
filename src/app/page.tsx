import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <main className="text-center space-y-8 px-4">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            AlgoStudio
          </h1>
          <p className="text-sm text-[#A78BFA] font-medium tracking-widest uppercase">
            Algorithm Trading Studio
          </p>
        </div>
        <p className="text-lg text-[#CBD5E1] max-w-md">
          Build your own MetaTrader 5 Expert Advisors without writing code.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#4F46E5] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        >
          Get Started
        </Link>
      </main>
    </div>
  );
}
