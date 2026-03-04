import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppInternalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, role: true },
  });

  const isAdmin =
    user?.role === "ADMIN" ||
    (user?.email != null && user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase());

  if (!isAdmin) notFound();

  return <>{children}</>;
}
