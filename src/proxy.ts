import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Site-wide user-level gate.
 *
 * Next.js 16 renamed `middleware` → `proxy`. See
 * node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 *
 * This proxy is a UX guardrail: it blocks unauthenticated users from
 * reaching app pages / API routes and blocks non-ADMIN users from the
 * /admin area. The real security boundary lives in server actions and
 * page layouts via `requireRole()` in `src/server/rbac.ts`.
 *
 * We check the Auth.js v5 session cookie name here. Auth.js uses
 * `authjs.session-token` (or `__Secure-authjs.session-token` behind
 * HTTPS). This is a presence check — it does NOT verify the JWT, which
 * is fine because every downstream page/action re-validates via `auth()`.
 */

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  // API requests get JSON 401 so SWR/fetch clients can handle it cleanly.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // Page requests: redirect to /login and remember where the user came from.
  const loginUrl = new URL("/login", request.url);
  const from = pathname + request.nextUrl.search;
  if (from && from !== "/") {
    loginUrl.searchParams.set("from", from);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match everything EXCEPT:
  //   - /login                    (the login page itself)
  //   - /api/auth/*               (Auth.js handlers must be reachable unauthenticated)
  //   - /_next/static, /_next/image (build assets)
  //   - /favicon.ico              (icon)
  //   - any file with an extension (images, fonts, etc.)
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
  ],
};
