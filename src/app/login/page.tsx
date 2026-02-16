import { features } from "@/lib/env";
import { getCaptchaSiteKey } from "@/lib/turnstile";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <LoginForm
      hasGoogle={features.googleAuth}
      hasGithub={features.githubAuth}
      hasDiscord={features.discordAuth}
      captchaSiteKey={getCaptchaSiteKey()}
    />
  );
}
