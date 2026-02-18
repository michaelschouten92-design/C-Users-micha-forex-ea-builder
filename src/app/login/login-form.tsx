"use client";

import { signIn } from "next-auth/react";
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";

function LoginFormInner({
  hasGoogle,
  hasGithub,
  hasDiscord,
  captchaSiteKey,
}: {
  hasGoogle: boolean;
  hasGithub: boolean;
  hasDiscord: boolean;
  captchaSiteKey: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [isRegistration, setIsRegistration] = useState(searchParams.get("mode") === "register");
  const banner = useMemo<{ type: "success" | "error"; message: string } | null>(() => {
    if (searchParams.get("verified") === "true")
      return { type: "success", message: "Email verified successfully! You can now sign in." };
    const errParam = searchParams.get("error");
    if (errParam === "token_expired")
      return {
        type: "error",
        message: "Verification link expired. Please request a new one in settings.",
      };
    if (errParam === "invalid_token")
      return { type: "error", message: "Invalid verification link. Please request a new one." };
    if (errParam === "rate_limited")
      return { type: "error", message: "Too many attempts. Please try again later." };
    if (searchParams.get("expired") === "true")
      return { type: "error", message: "Your session has expired. Please sign in again." };
    return null;
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaWidgetId = useRef<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  const renderCaptcha = useCallback(() => {
    if (!captchaSiteKey || !isRegistration || !captchaContainerRef.current) return;
    if (typeof window === "undefined" || !(window as unknown as Record<string, unknown>).turnstile)
      return;

    // Reset existing widget
    if (captchaWidgetId.current !== null) {
      (window as unknown as { turnstile: { remove: (id: string) => void } }).turnstile.remove(
        captchaWidgetId.current
      );
      captchaWidgetId.current = null;
    }

    captchaWidgetId.current = (
      window as unknown as {
        turnstile: { render: (el: HTMLElement, opts: Record<string, unknown>) => string };
      }
    ).turnstile.render(captchaContainerRef.current, {
      sitekey: captchaSiteKey,
      callback: (token: string) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(null),
      theme: "dark",
    });
  }, [captchaSiteKey, isRegistration]);

  useEffect(() => {
    renderCaptcha();
  }, [renderCaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (isRegistration && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      isRegistration: isRegistration.toString(),
      captchaToken: captchaToken || "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      const ERROR_MESSAGES: Record<string, string> = {
        account_exists: "An account with this email already exists. Please sign in instead.",
        invalid_credentials: "Invalid email or password.",
        password_too_short: "Password must be at least 8 characters.",
        rate_limited: "Too many attempts. Please try again later.",
      };
      const code = (result as unknown as Record<string, string>).code;
      setError(ERROR_MESSAGES[code] || "Something went wrong. Please try again.");
    } else {
      router.push("/app");
      router.refresh();
    }
  }

  async function handleOAuthSignIn(provider: "google" | "github" | "discord") {
    setOauthLoading(provider);
    setError("");

    await signIn(provider, {
      callbackUrl: "/app",
    });
  }

  return (
    <div className="max-w-md w-full space-y-8 p-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div>
        <Link
          href="/"
          className="block text-center text-3xl font-bold text-white hover:text-[#A78BFA] transition-colors"
        >
          AlgoStudio
        </Link>
        <p className="mt-2 text-center text-sm text-[#94A3B8]">
          {isRegistration ? "Create a new account" : "Sign in to your account"}
        </p>
      </div>

      {/* OAuth Buttons - rendered immediately based on server-side feature flags */}
      {(hasGoogle || hasGithub || hasDiscord) && (
        <>
          <div className="space-y-3">
            {hasGoogle && (
              <button
                type="button"
                onClick={() => handleOAuthSignIn("google")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Google"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === "google" ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>
            )}

            {hasGithub && (
              <button
                type="button"
                onClick={() => handleOAuthSignIn("github")}
                disabled={oauthLoading !== null}
                aria-label="Continue with GitHub"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === "github" ? (
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                Continue with GitHub
              </button>
            )}

            {hasDiscord && (
              <button
                type="button"
                onClick={() => handleOAuthSignIn("discord")}
                disabled={oauthLoading !== null}
                aria-label="Continue with Discord"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === "discord" ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                Continue with Discord
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(79,70,229,0.3)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A0626] text-[#64748B]">or continue with email</span>
            </div>
          </div>
        </>
      )}

      {/* Toggle buttons */}
      <div className="flex rounded-lg bg-[#1E293B] p-1">
        <button
          type="button"
          onClick={() => setIsRegistration(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            !isRegistration ? "bg-[#4F46E5] text-white" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsRegistration(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            isRegistration ? "bg-[#4F46E5] text-white" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Register
        </button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {banner && (
          <div
            role="alert"
            className={`p-3 rounded-lg text-sm border ${
              banner.type === "success"
                ? "bg-[rgba(34,211,238,0.1)] border-[rgba(34,211,238,0.3)] text-[#22D3EE]"
                : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"
            }`}
          >
            {banner.message}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-sm"
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-[#CBD5E1]">
                Password
              </label>
              {!isRegistration && (
                <Link href="/forgot-password" className="text-sm text-[#22D3EE] hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isRegistration ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 pr-10 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-[#64748B] hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {isRegistration && (
              <p className="text-[10px] text-[#64748B] mt-1">Must be at least 8 characters</p>
            )}
          </div>

          {isRegistration && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#CBD5E1]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
                placeholder="Repeat your password"
              />
            </div>
          )}

          {/* Turnstile CAPTCHA for registration */}
          {isRegistration && captchaSiteKey && (
            <>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                onLoad={renderCaptcha}
              />
              <div ref={captchaContainerRef} className="flex justify-center" />
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1A0626] focus:ring-[#22D3EE] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
        >
          {loading ? "Loading..." : isRegistration ? "Create Account" : "Sign In"}
        </button>
      </form>

      {isRegistration && (
        <p className="text-xs text-center text-[#64748B]">
          By registering, you agree to our{" "}
          <a
            href="/terms"
            target="_blank"
            className="text-[#A78BFA] hover:text-[#C4B5FD] underline"
          >
            terms of service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            target="_blank"
            className="text-[#A78BFA] hover:text-[#C4B5FD] underline"
          >
            privacy policy
          </a>
          .
        </p>
      )}
    </div>
  );
}

export function LoginForm({
  hasGoogle,
  hasGithub,
  hasDiscord,
  captchaSiteKey,
}: {
  hasGoogle: boolean;
  hasGithub: boolean;
  hasDiscord: boolean;
  captchaSiteKey: string | null;
}) {
  return (
    <div id="main-content" className="min-h-screen flex items-center justify-center">
      <Suspense
        fallback={
          <div className="max-w-md w-full p-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-[#1E293B] rounded w-1/2 mx-auto" />
              <div className="h-4 bg-[#1E293B] rounded w-2/3 mx-auto" />
            </div>
          </div>
        }
      >
        <LoginFormInner
          hasGoogle={hasGoogle}
          hasGithub={hasGithub}
          hasDiscord={hasDiscord}
          captchaSiteKey={captchaSiteKey}
        />
      </Suspense>
    </div>
  );
}
