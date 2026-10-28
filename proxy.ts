import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes except /admin/auth/*
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/admin/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Reject inactive administrators
    if (token.active === false) {
      const loginUrl = new URL("/admin/auth/login", req.url);
      loginUrl.searchParams.set("error", "inactive");
      return NextResponse.redirect(loginUrl);
    }

    // Redirect restricted enrollment sessions away from full admin routes to bootstrap setup
    if (token.isRestrictedEnrollment === true) {
      const enrollUrl = new URL("/admin/auth/bootstrap", req.url);
      return NextResponse.redirect(enrollUrl);
    }
  }

  return NextResponse.next({
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
