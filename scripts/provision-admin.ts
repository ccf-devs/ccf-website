import { PrismaClient, AdminRole } from "@prisma/client";
import { normalizeAdminEmail } from "../lib/auth/adapter";

const prisma = new PrismaClient();

async function main() {
  const emailInput = process.argv[2] || "developers.ccf@gmail.com";
  const nameInput = process.argv[3] || "Rohith Y";
  const roleInput = (process.argv[4] || "IT_ADMIN").toUpperCase();

  if (!emailInput || !nameInput) {
    throw new Error("Usage: npx tsx scripts/provision-admin.ts <email> <name> [IT_ADMIN|CCF_ADMIN]");
  }

  let role: AdminRole;
  if (roleInput === "IT_ADMIN") {
    role = AdminRole.IT_ADMIN;
  } else if (roleInput === "CCF_ADMIN") {
    role = AdminRole.CCF_ADMIN;
  } else {
    throw new Error(`Invalid role '${roleInput}'. Role must be IT_ADMIN or CCF_ADMIN.`);
  }

  const normalizedEmail = normalizeAdminEmail(emailInput);

  console.log(`[PROVISION] Connecting to database via Prisma client...`);
  console.log(`[PROVISION] Target email: ${normalizedEmail}`);
  console.log(`[PROVISION] Target name: ${nameInput}`);
  console.log(`[PROVISION] Target role: ${role}`);

  const admin = await prisma.adminUser.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      name: nameInput,
      role,
      active: true,
    },
    update: {
      name: nameInput,
      role,
      active: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`[PROVISION] AdminUser successfully provisioned:`);
  console.log(`- ID: ${admin.id}`);
  console.log(`- Email: ${admin.email}`);
  console.log(`- Name: ${admin.name}`);
  console.log(`- Role: ${admin.role}`);
  console.log(`- Active: ${admin.active}`);
  console.log(`- CreatedAt: ${admin.createdAt.toISOString()}`);
}

main()
  .catch((err) => {
    console.error("[PROVISION] Failed to provision admin user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
