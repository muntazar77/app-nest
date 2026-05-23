import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Set it in .env before running the seed.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // clean up existing data (safe for development)
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // create permissions
  const permissions = [
    { action: "manage", subject: "all" },
    { action: "read", subject: "User" },
    { action: "create", subject: "User" },
    { action: "update", subject: "User" },
    { action: "delete", subject: "User" },
  ];

  const createdPermissions = [] as { id: string; action: string; subject: string }[];
  for (const p of permissions) {
    const perm = await prisma.permission.create({ data: p });
    createdPermissions.push(perm as any);
  }

  // create roles
  const adminRole = await prisma.role.create({ data: { name: "admin", title: "Administrator", isSystem: true } });

  // attach manage all to admin
  const manageAll = createdPermissions.find((x) => x.action === "manage" && x.subject === "all");
  if (manageAll) {
    await prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: manageAll.id } });
  }

  // create users
  const adminUser = await prisma.user.create({ data: { email: "admin@example.com", password: passwordHash, role: "ADMIN" } });
  const regularUser = await prisma.user.create({ data: { email: "user@example.com", password: passwordHash, role: "USER" } });

  // assign admin role to admin user
  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

  // create posts
  await prisma.post.createMany({
    data: [
      { title: "Welcome", content: "Welcome to the app", authorId: adminUser.id },
      { title: "Hello", content: "Hello world", authorId: regularUser.id },
    ],
  });

  console.log("Seed completed: created users, roles, permissions, and posts.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });