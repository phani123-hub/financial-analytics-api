import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Mirrors `enum Role` in prisma/schema.prisma (avoids importing enums before `prisma generate`). */
const Role = {
  VIEWER: "VIEWER",
  ANALYST: "ANALYST",
  ADMIN: "ADMIN",
} as const;

/** Mirrors `enum UserStatus` */
const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

/** Mirrors `enum RecordType` */
const RecordType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

async function main() {
  const [adminPass, analystPass, viewerPass] = await Promise.all([
    bcrypt.hash("Admin@123", 10),
    bcrypt.hash("Analyst@123", 10),
    bcrypt.hash("Viewer@123", 10),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
    create: {
      email: "admin@example.com",
      password: adminPass,
      name: "Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, email: true },
  });

  const analyst = await prisma.user.upsert({
    where: { email: "analyst@example.com" },
    update: {
      name: "Analyst",
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
    create: {
      email: "analyst@example.com",
      password: analystPass,
      name: "Analyst",
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, email: true },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {
      name: "Viewer",
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
    create: {
      email: "viewer@example.com",
      password: viewerPass,
      name: "Viewer",
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, email: true },
  });

  const baseDate = new Date();
  const daysAgo = (n: number) => new Date(baseDate.getTime() - n * 24 * 60 * 60 * 1000);

  await prisma.financialRecord.createMany({
    data: [
      {
        amount: 5000.0,
        type: RecordType.INCOME,
        category: "Salary",
        date: daysAgo(25),
        description: "Monthly salary",
        createdById: admin.id,
      },
      {
        amount: 1200.5,
        type: RecordType.EXPENSE,
        category: "Rent",
        date: daysAgo(20),
        description: "Apartment rent",
        createdById: admin.id,
      },
      {
        amount: 250.75,
        type: RecordType.EXPENSE,
        category: "Groceries",
        date: daysAgo(12),
        description: "Weekly groceries",
        createdById: admin.id,
      },
      {
        amount: 300.0,
        type: RecordType.INCOME,
        category: "Freelance",
        date: daysAgo(8),
        description: "Side project payment",
        createdById: admin.id,
      },
      {
        amount: 89.99,
        type: RecordType.EXPENSE,
        category: "Utilities",
        date: daysAgo(5),
        description: "Electricity bill",
        createdById: admin.id,
      },
      {
        amount: 45.0,
        type: RecordType.EXPENSE,
        category: "Transport",
        date: daysAgo(2),
        description: "Fuel",
        createdById: admin.id,
      },
    ],
  });

  console.log("Seeded users:", admin.email, analyst.email, viewer.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
