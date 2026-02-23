import { cookies } from "next/headers";
import { features } from "@/lib/env";
import { getCaptchaSiteKey } from "@/lib/turnstile";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const referralCode = cookieStore.get("referral_code")?.value || "";
  return (
    <LoginForm
      hasGoogle={features.googleAuth}
      captchaSiteKey={getCaptchaSiteKey()}
      referralCode={referralCode}
    />
  );
}
