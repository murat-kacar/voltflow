import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./lib/rate-limiter";

/**
 * Next.js Middleware for Route Protection & Rate Limiting
 * Satisfies AGENTS.md Rules:
 * - 3.C (AAA & Modern Security - Server-side route guarding via HttpOnly cookie)
 * - 3.I (Idempotency, Rate Limiting & Execution Guards at the boundary)
 */

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/settings", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Apply Rate Limiting to Auth API Routes at the edge/boundary
  if (pathname.startsWith("/api/auth")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateResult = checkRateLimit(`auth_${ip}`, 30, 60000);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Hız sınırı aşıldı. Lütfen bir süre sonra tekrar deneyin.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateResult.resetMs / 1000).toString(),
          },
        },
      );
    }
  }

  // 2. Declarative Route Guard for Protected Pages
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    // Better-Auth session token is stored in HttpOnly cookie
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ||
      request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionCookie?.value) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("auth_required", "true");
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (.svg, .png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
