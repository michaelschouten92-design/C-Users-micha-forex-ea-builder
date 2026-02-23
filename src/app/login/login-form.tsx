"use client";

import { signIn } from "next-auth/react";
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";

function LoginFormInner({
  hasGoogle,
  captchaSiteKey,
  referralCode,
}: {
  hasGoogle: boolean;
  captchaSiteKey: string | null;
  referralCode: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
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
        message: "Verification link expired. Sign in and request a new one from your dashboard.",
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
    if (!captchaSiteKey || !captchaContainerRef.current) return;
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
  }, [captchaSiteKey]);

  useEffect(() => {
    renderCaptcha();
  }, [renderCaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation with field-level errors
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Must be at least 8 characters with an uppercase letter, lowercase letter, and a number";
    }

    if (isRegistration && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      isRegistration: isRegistration.toString(),
      captchaToken: captchaToken || "",
      referralCode: isRegistration ? referralCode : "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      const ERROR_MESSAGES: Record<string, string> = {
        account_exists: "Unable to create account. Please try signing in instead.",
        invalid_credentials: "Invalid email or password.",
        password_too_short: "Password must be at least 8 characters.",
        rate_limited: "Too many attempts. Please try again later.",
      };
      const code = (result as unknown as Record<string, string>).code;
      setError(
        ERROR_MESSAGES[code] ||
          "Something went wrong. Please try again or contact support@algo-studio.com for help."
      );
    } else {
      router.push("/app");
      router.refresh();
    }
  }

  async function handleOAuthSignIn(provider: "google") {
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

      {/* OAuth Buttons */}
      {hasGoogle && (
        <>
          <div className="space-y-3">
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
              {oauthLoading === "google" ? "Connecting..." : "Continue with Google"}
            </button>
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
              Email<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={`mt-1 block w-full px-4 py-3 bg-[#1E293B] border rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 ${fieldErrors.email ? "border-[#EF4444]" : "border-[rgba(79,70,229,0.3)]"}`}
              placeholder="you@email.com"
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-[#EF4444]">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-[#CBD5E1]">
                Password<span className="text-red-400 ml-0.5">*</span>
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`mt-1 block w-full px-4 py-3 pr-10 bg-[#1E293B] border rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 ${fieldErrors.password ? "border-[#EF4444]" : "border-[rgba(79,70,229,0.3)]"}`}
                placeholder="Min 8 chars, upper, lower & digit"
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
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-[#EF4444]">
                {fieldErrors.password}
              </p>
            )}
            {isRegistration && !fieldErrors.password && (
              <p className="text-xs text-[#94A3B8] mt-1">
                Must be at least 8 characters with an uppercase letter, a lowercase letter, and a
                number. Free plan: 1 project, 1 export/month.
              </p>
            )}
          </div>

          {isRegistration && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#CBD5E1]">
                Confirm Password<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={
                  fieldErrors.confirmPassword ? "confirm-password-error" : undefined
                }
                className={`mt-1 block w-full px-4 py-3 bg-[#1E293B] border rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200 ${fieldErrors.confirmPassword ? "border-[#EF4444]" : "border-[rgba(79,70,229,0.3)]"}`}
                placeholder="Repeat your password"
              />
              {fieldErrors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-xs text-[#EF4444]">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Turnstile CAPTCHA */}
          {captchaSiteKey && (
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
          {loading
            ? isRegistration
              ? "Creating account..."
              : "Signing in..."
            : isRegistration
              ? "Create Account"
              : "Sign In"}
        </button>
      </form>

      {!isRegistration && (
        <p className="text-sm text-center text-[#94A3B8]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#22D3EE] hover:underline font-medium">
            Sign up for free
          </Link>
        </p>
      )}

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
  captchaSiteKey,
  referralCode,
}: {
  hasGoogle: boolean;
  captchaSiteKey: string | null;
  referralCode: string;
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
          captchaSiteKey={captchaSiteKey}
          referralCode={referralCode}
        />
      </Suspense>
    </div>
  );
}
