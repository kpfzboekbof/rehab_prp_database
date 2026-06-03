"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { dateFromAge } from "@/lib/date";
import { patientInputSchema } from "@/lib/validation/patient";
import { requireRole } from "@/server/rbac";

/**
 * Server action result convention across this project:
 *   - On success, the action calls `redirect()` and never returns
 *     (redirect() throws NEXT_REDIRECT which Next.js handles).
 *   - On failure, the action returns `{ ok: false, error }` so the
 *     client form can show an inline error via `useActionState`.
 */
export type ActionState = { ok: false; error: string } | { ok: true } | null;

function readInput(formData: FormData) {
  return {
    chartNumber: formData.get("chartNumber")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    gender: formData.get("gender")?.toString() ?? "",
    age: formData.get("age")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    address: formData.get("address")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };
}

export async function createPatient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(["DOCTOR", "ADMIN"]);

  const parsed = patientInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  let createdId: string;
  try {
    const patient = await db.patient.create({
      data: {
        chartNumber: data.chartNumber,
        name: data.name,
        gender: data.gender,
        birthDate: dateFromAge(data.age),
        phone: data.phone ? data.phone : null,
        address: data.address ? data.address : null,
        notes: data.notes ? data.notes : null,
        createdById: session.user.id,
      },
      select: { id: true },
    });
    createdId = patient.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `病歷號「${data.chartNumber}」已存在` };
    }
    throw err;
  }

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  // Flow straight into "add a treatment" for the patient we just created —
  // creating a patient is almost always the first step before recording their
  // first PRP treatment, so skipping the detail page saves a tap.
  redirect(`/patients/${createdId}/treatments/new`);
}

export async function updatePatient(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["DOCTOR", "ADMIN"]);

  const parsed = patientInputSchema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤" };
  }
  const data = parsed.data;

  const existing = await db.patient.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "找不到病人資料" };
  }

  try {
    await db.patient.update({
      where: { id },
      data: {
        chartNumber: data.chartNumber,
        name: data.name,
        gender: data.gender,
        birthDate: dateFromAge(data.age),
        phone: data.phone ? data.phone : null,
        address: data.address ? data.address : null,
        notes: data.notes ? data.notes : null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `病歷號「${data.chartNumber}」已被其他病人使用` };
    }
    throw err;
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  redirect(`/patients/${id}`);
}

/**
 * Soft-delete. Hard-delete is NEVER allowed — Taiwan 醫療法 requires
 * 7-year retention of medical records. DOCTOR / ADMIN only; STAFF
 * cannot delete patients.
 */
export async function softDeletePatient(id: string): Promise<void> {
  await requireRole(["DOCTOR", "ADMIN"]);

  await db.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect("/patients");
}
