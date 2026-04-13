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
    notes: formData.get("notes")?.toString() ?? "",
  };
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
 *
 * We NEVER hard-delete products because TreatmentRecord has a foreign
 * key and we need price history to remain readable forever.
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
