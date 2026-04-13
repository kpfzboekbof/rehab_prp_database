"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  passwordChangeSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation/user";
import { requireRole } from "@/server/rbac";

/**
 * User management rules:
 *
 * - ADMIN only; every action calls requireRole(['ADMIN']).
 * - Users are NEVER hard-deleted — TreatmentRecord / Patient have
 *   foreign keys into User. Deactivation uses `active = false`.
 * - An admin cannot deactivate themselves and cannot demote themselves
 *   to STAFF (prevents lockout).
 * - Passwords are bcrypt-hashed via src/lib/password.ts.
 */

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readCreateInput(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    passwordConfirm: formData.get("passwordConfirm")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
  };
}

function readUpdateInput(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
  };
}

export async function createUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = userCreateSchema.safeParse(readCreateInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const passwordHash = await hashPassword(data.password);

  try {
    await db.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `Email「${data.email}」已被使用` };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);

  const parsed = userUpdateSchema.safeParse(readUpdateInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  // Self-demotion lockout prevention.
  if (session.user.id === id && data.role !== Role.ADMIN) {
    return { ok: false, error: "不可將自己降級為護理師，請先請其他管理者調整" };
  }

  const existing = await db.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到使用者" };
  }

  try {
    await db.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `Email「${data.email}」已被其他使用者使用` };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
  redirect("/admin/users");
}

export async function changeUserPassword(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = passwordChangeSchema.safeParse({
    password: formData.get("password")?.toString() ?? "",
    passwordConfirm: formData.get("passwordConfirm")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }

  const existing = await db.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到使用者" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({
    where: { id },
    data: { passwordHash },
  });

  revalidatePath(`/admin/users/${id}/edit`);
  return { ok: true };
}

export async function toggleUserActive(id: string): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);

  if (session.user.id === id) {
    return { ok: false, error: "不可停用自己的帳號" };
  }

  const existing = await db.user.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到使用者" };
  }

  await db.user.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
  return { ok: true };
}
