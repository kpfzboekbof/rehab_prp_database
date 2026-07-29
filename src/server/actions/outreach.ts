"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { OutreachReason } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/server/rbac";

/**
 * Log an outreach / marketing contact event for a patient. Any
 * clinical role (DOCTOR / STAFF / ADMIN) can record outreach — in
 * practice nurses do the calling.
 *
 * Called from the outreach list pages via a `useTransition`-driven
 * client button. The action revalidates all three outreach list
 * paths so whichever page the user is on refreshes with the new
 * "已聯絡" state.
 */
export async function markOutreachContacted(
  patientId: string,
  reason: OutreachReason,
  notes: string | null,
): Promise<void> {
  const session = await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const trimmedNotes = notes && notes.trim() !== "" ? notes.trim() : null;

  await db.outreachContact.create({
    data: {
      patientId,
      reason,
      contactedById: session.user.id,
      notes: trimmedNotes,
    },
  });

  revalidatePath("/outreach");
  revalidatePath("/outreach/dormant");
  revalidatePath("/outreach/package-finished");
  revalidatePath("/outreach/no-show");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  // `revalidatePath` does NOT bust `unstable_cache`. Without this the
  // dashboard / analytics "待聯絡" card keeps serving the pre-contact count
  // for up to 5 minutes. `updateTag` is the Next 16 server-action primitive
  // for read-your-own-writes (see AGENTS.md).
  updateTag("outreach-counts");
}

/**
 * Undo an outreach contact log (for typos / mis-clicks). Only the
 * user who recorded it, or an ADMIN, can unmark.
 */
export async function unmarkOutreachContacted(contactId: string): Promise<void> {
  const session = await requireRole(["DOCTOR", "STAFF", "ADMIN"]);

  const row = await db.outreachContact.findUnique({
    where: { id: contactId },
    select: { id: true, contactedById: true },
  });
  if (!row) return;

  if (session.user.role !== "ADMIN" && row.contactedById !== session.user.id) {
    return; // silently ignore — only owner or admin can undo
  }

  await db.outreachContact.delete({ where: { id: contactId } });

  revalidatePath("/outreach");
  revalidatePath("/outreach/dormant");
  revalidatePath("/outreach/package-finished");
  revalidatePath("/outreach/no-show");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  // `revalidatePath` does NOT bust `unstable_cache`. Without this the
  // dashboard / analytics "待聯絡" card keeps serving the pre-contact count
  // for up to 5 minutes. `updateTag` is the Next 16 server-action primitive
  // for read-your-own-writes (see AGENTS.md).
  updateTag("outreach-counts");
}
