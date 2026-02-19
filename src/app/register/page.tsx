import { features } from "@/lib/env";
import { getCaptchaSiteKey } from "@/lib/turnstile";
import { RegisterPageClient } from "./register-client";

export default function RegisterPage() {
  return (
    <RegisterPageClient hasGoogle={features.googleAuth} captchaSiteKey={getCaptchaSiteKey()} />
  );
}
