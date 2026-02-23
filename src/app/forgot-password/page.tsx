"use client";

import { useState } from "react";
import Link from "next/link";
import { getCsrfHeaders } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-4 sm:p-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div>
          <h2 className="text-center text-3xl font-bold text-white">Reset Password</h2>
          <p className="mt-2 text-center text-sm text-[#94A3B8]">
            {submitted
              ? "Check your email for a reset link"
              : "Enter your email to receive a reset link"}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.3)] text-[#22D3EE] p-4 rounded-lg text-sm text-center">
              If an account with this email exists, we&apos;ve sent a password reset link. Please
              check your inbox and spam folder. The link expires in 24 hours.
            </div>
            <Link
              href="/login"
              className="block w-full text-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] transition-all duration-200"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#CBD5E1]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                placeholder="you@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1A0626] focus:ring-[#22D3EE] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-[#64748B]">
              Remembered your password?{" "}
              <Link href="/login" className="text-[#22D3EE] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
