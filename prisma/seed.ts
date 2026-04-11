import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@clinic.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme";
  const adminName = process.env.SEED_ADMIN_NAME || "管理員";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`[seed] admin user ready: ${admin.email}`);

  const products = [
    { name: "Regen Lab BCT", unitPrice: 12000 },
    { name: "Regen Lab BCT-HA", unitPrice: 15000 },
    { name: "ACP (Arthrex)", unitPrice: 10000 },
    { name: "Magellan", unitPrice: 18000 },
  ];
  for (const p of products) {
    const product = await prisma.pRPProduct.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
    console.log(`[seed] product ready: ${product.name} @ ${product.unitPrice}`);
  }

  // Default commission rate so that treatments created by the seeded admin
  // (handy for smoke tests) always have a non-zero commission calculation.
  const existingRate = await prisma.doctorCommissionRate.findFirst({
    where: { doctorId: admin.id, effectiveTo: null },
  });
  if (!existingRate) {
    await prisma.doctorCommissionRate.create({
      data: {
        doctorId: admin.id,
        rate: 0.35,
        effectiveFrom: new Date("2020-01-01"),
        note: "Seeded default rate",
      },
    });
    console.log("[seed] default commission rate ready: 35%");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
