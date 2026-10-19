import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public exceptions that should never be blocked
  const isPublicApi =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/webhooks/");

  if (isPublicApi) {
    return NextResponse.next();
  }

  // Protected page routes
  const protectedPages = [
    "/dashboard",
    "/lead-finder",
    "/campaigns",
    "/contacts",
    "/templates",
    "/logs",
    "/settings",
  ];
  const isProtectedPage = protectedPages.some((route) => pathname.startsWith(route));

  // Protected API routes
  const isProtectedApi =
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/campaigns") ||
    pathname.startsWith("/api/contacts") ||
    pathname.startsWith("/api/templates") ||
    pathname.startsWith("/api/lead-finder");

  if (isProtectedPage || isProtectedApi) {
    const adminSession = request.cookies.get("admin_session")?.value;
    const sbAccessToken = request.cookies.get("sb-access-token")?.value;

    const isValidSession = verifySession(adminSession) || Boolean(sbAccessToken);

    if (!isValidSession) {
      if (isProtectedApi) {
        return NextResponse.json({ error: "Unauthorized access: invalid or missing session token" }, { status: 401 });
      }

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
    "/lead-finder/:path*",
    "/campaigns/:path*",
    "/contacts/:path*",
    "/templates/:path*",
    "/logs/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
