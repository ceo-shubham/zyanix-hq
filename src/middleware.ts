import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieHeader, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/client/:path*",
    "/set-password",
    "/login",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieHeader = req.headers.get("cookie");
  const token = getSessionFromCookieHeader(cookieHeader);
  const session = token ? await verifySessionToken(token) : null;

  // ── /set-password ──────────────────────────────────────────────────────────
  if (pathname === "/set-password") {
    // Must have a mustChangePassword session to be here
    if (!session || !session.mustChangePassword) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // ── If session says must change password → only allow /set-password ────────
  if (session?.mustChangePassword) {
    return NextResponse.redirect(new URL("/set-password", req.url));
  }

  // ── /login ─────────────────────────────────────────────────────────────────
  if (pathname === "/login" && session) {
    const dest =
      session.role === "admin" ? "/admin" :
      session.role === "client" ? "/client" :
      "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Not logged in → send to login
  if (pathname !== "/login" && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Role guards ─────────────────────────────────────────────────────────────
  if (session) {
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      return NextResponse.redirect(
        new URL(session.role === "client" ? "/client" : "/dashboard", req.url)
      );
    }
    if (pathname.startsWith("/dashboard") && session.role === "client") {
      return NextResponse.redirect(new URL("/client", req.url));
    }
    if (pathname.startsWith("/client") && session.role !== "client" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}
