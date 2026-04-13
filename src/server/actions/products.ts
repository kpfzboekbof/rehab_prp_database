"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { productInputSchema } from "@/lib/validation/product";
import { requireRole } from "@/server/rbac";

export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    unitPrice: formData.get("unitPrice")?.toString() ?? "",
    packageSize: formData.get("packageSize")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };
}

function resolvePackageSize(value: number | "" | undefined): number | null {
  if (value === "" || value === undefined) return null;
  return value;
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = productInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  try {
    await db.pRPProduct.create({
      data: {
        name: data.name,
        unitPrice: data.unitPrice,
        packageSize: resolvePackageSize(data.packageSize),
        notes: data.notes ? data.notes : null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `品項名稱「${data.name}」已存在` };
    }
    throw err;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const parsed = productInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const existing = await db.pRPProduct.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到品項" };
  }

  try {
    await db.pRPProduct.update({
      where: { id },
      data: {
        name: data.name,
        unitPrice: data.unitPrice,
        packageSize: resolvePackageSize(data.packageSize),
        notes: data.notes ? data.notes : null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `品項名稱「${data.name}」已被其他品項使用` };
    }
    throw err;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/**
 * Flip the `active` flag on a product. Called from a simple button form
 * on the edit page — no useActionState, just a server action bound to
 * the button.
 */
export async function toggleProductActive(id: string): Promise<void> {
  await requireRole(["ADMIN"]);

  const existing = await db.pRPProduct.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!existing) return;

  await db.pRPProduct.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
}

/**
 * Hard-delete a product — only allowed if the product has NEVER been
 * used in a treatment record. If any treatment references this product
 * we refuse and tell the caller to deactivate instead; deleting would
 * either violate the FK constraint or (worse, if we cascade) destroy
 * historical revenue records that need to be retained.
 */
export async function deleteProduct(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const existing = await db.pRPProduct.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { treatments: true } },
    },
  });
  if (!existing) {
    return { ok: false, error: "找不到品項" };
  }

  if (existing._count.treatments > 0) {
    return {
      ok: false,
      error: `此品項已被 ${existing._count.treatments} 筆治療紀錄使用，無法刪除。請改用「停用」以避免新建紀錄時選到此品項。`,
    };
  }

  try {
    await db.pRPProduct.delete({ where: { id } });
  } catch (err) {
    // Defensive: if a race condition created a treatment between our
    // count check and the delete, Prisma will throw a FK error (P2003).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return {
        ok: false,
        error: "此品項剛剛被用於新的治療紀錄，無法刪除。請改用「停用」。",
      };
    }
    throw err;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
