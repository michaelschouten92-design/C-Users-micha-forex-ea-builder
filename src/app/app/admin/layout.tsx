import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "./components/admin-sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen bg-[#09090B]">
      <AdminSidebar />
      <div className="pl-56">
        <main className="max-w-7xl mx-auto py-8 px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
