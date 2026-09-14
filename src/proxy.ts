import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected paths
  const protectedRoutes = ["/dashboard", "/campaigns", "/contacts", "/templates", "/logs", "/settings"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const adminSession = request.cookies.get("admin_session")?.value;
    const sbAccessToken = request.cookies.get("sb-access-token")?.value;

    // If neither standard admin_session nor Supabase token exists, redirect to login
    if (!adminSession && !sbAccessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/campaigns/:path*",
    "/contacts/:path*",
    "/templates/:path*",
    "/logs/:path*",
    "/settings/:path*",
  ],
};
