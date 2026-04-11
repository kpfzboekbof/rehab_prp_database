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

export async function requireSession() {
  const session = await auth();
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
  const session = await auth();
  return session?.user ?? null;
}
