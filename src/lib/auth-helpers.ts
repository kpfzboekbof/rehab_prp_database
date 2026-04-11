import { auth } from "@/auth";

/**
 * Thin wrapper around Auth.js `auth()` for use in server components that
 * only want to read the current user without enforcing a redirect.
 * Use `@/server/rbac` helpers when you need to enforce access.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
