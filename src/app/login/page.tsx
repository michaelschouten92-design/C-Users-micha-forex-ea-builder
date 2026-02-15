import { features } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <LoginForm
      hasGoogle={features.googleAuth}
      hasGithub={features.githubAuth}
      hasDiscord={features.discordAuth}
    />
  );
}
