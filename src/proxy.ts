import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isOnApp = req.nextUrl.pathname.startsWith("/app");
  const isOnLogin = req.nextUrl.pathname === "/login";

  // Redirect unauthenticated users from /app to /login
  if (isOnApp && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users from /login to /app
  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
