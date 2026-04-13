import { db } from "@/lib/db";

/**
 * All users for the admin user list. Explicitly never returns
 * passwordHash — callers that need it (e.g. Auth.js credentials
 * verification) go through `db.user.findUnique` directly.
 */
export async function listUsers() {
  return db.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          treatments: true,
          createdPatients: true,
        },
      },
    },
  });
}

export async function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          treatments: true,
          createdPatients: true,
        },
      },
    },
  });
}
