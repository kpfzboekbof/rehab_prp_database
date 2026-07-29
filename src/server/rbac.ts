import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";

/**
 * Security boundary for server components, server actions, and route handlers.
 *
 * The Next.js proxy is only a UX guardrail — it checks cookie presence, not
 * JWT validity, and does not understand role scopes. Every mutation and every
 * privileged read MUST call one of these helpers at its top.
 */

/**
 * Request-scoped memo of `auth()`.
 *
 * Every authed request calls `requireSession()` at least twice — once in
 * `src/app/(app)/layout.tsx` to build the shell, then again in the page
 * itself (and a third time in any server action the page invokes). Each
 * call re-reads the cookie and re-decrypts + re-verifies the Auth.js JWE,
 * which is pure CPU we pay for on every navigation.
 *
 * React's `cache()` dedupes within a single request render pass, so the
 * JWT is decrypted once no matter how many layers ask for it. This does
 * NOT weaken the security boundary: the memo lives and dies with one
 * request, so a different user's request never observes another's session.
 */
const getSession = cache(async () => auth());

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    // For page requests this redirects to the dashboard with a flash;
    // for server actions it surfaces as a thrown NEXT_REDIRECT which
    // the caller can surface as a toast.
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
