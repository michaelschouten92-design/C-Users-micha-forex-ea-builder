import { cookies } from "next/headers";
import { features } from "@/lib/env";
import { getCaptchaSiteKey } from "@/lib/turnstile";
import { RegisterPageClient } from "./register-client";

export default async function RegisterPage() {
  // Middleware writes the referral cookie as httpOnly so document.cookie can
  // never see it from the client. Read it server-side and pass it down so
  // /register attribution actually works for credentials sign-ups.
  const cookieStore = await cookies();
  const referralCode = cookieStore.get("referral_code")?.value || "";
  return (
    <RegisterPageClient
      hasGoogle={features.googleAuth}
      captchaSiteKey={getCaptchaSiteKey()}
      referralCode={referralCode}
    />
  );
}
