import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let session: { user: { id: string; email?: string | null }; expires?: string } | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[app/page] auth() threw:", err);
  }

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  // Command Center is the primary dashboard — redirect to it
  redirect("/app/live");
}
