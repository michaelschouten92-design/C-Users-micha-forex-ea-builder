import { features } from "@/lib/env";
import { getCaptchaSiteKey } from "@/lib/turnstile";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <LoginForm hasGoogle={features.googleAuth} captchaSiteKey={getCaptchaSiteKey()} />;
}
