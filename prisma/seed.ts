import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a role ADMIN
  await prisma.role.create({
    data: {
      name: "ADMIN",
    },
  });

  // Add SUPERADMIN role
  const superAdminRole = await prisma.role.create({
    data: {
      name: "SUPERADMIN",
    },
  });

  // Seed the User table
  const adminUser = await prisma.user.create({
    data: {
      username: "Drospect",
      email: "info@drospect.ai",
      password: await bcrypt.hash("TeamDrospect!", 10),
      firstName: "Drospect",
      lastName: "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Seed the UserRole table
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  await prisma.wallet.create({
    data: {
      userId: adminUser.id,
      credits: 0, // Initialize with 0 credits
    },
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
