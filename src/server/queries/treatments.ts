import { db } from "@/lib/db";

export async function listTreatmentsByPatient(patientId: string) {
  return db.treatmentRecord.findMany({
    where: { patientId },
    orderBy: { treatmentDate: "desc" },
    include: {
      product: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });
}

export async function getTreatment(id: string) {
  return db.treatmentRecord.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, unitPrice: true, active: true } },
      doctor: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, name: true, chartNumber: true } },
    },
  });
}
