import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set. Set it in .env before running the seed.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Clean up existing data (dev only)
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // Create permissions
  const permissions = [
    { action: 'manage', subject: 'all' },
    { action: 'read', subject: 'User' },
    { action: 'create', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'delete', subject: 'User' },
  ];
  const createdPermissions = [] as { id: string; action: string; subject: string }[];
  for (const p of permissions) {
    const perm = await prisma.permission.create({ data: p });
    createdPermissions.push(perm);
  }

  // Create admin role
  const adminRole = await prisma.role.create({
    data: { name: 'admin', title: 'Administrator', isSystem: true },
  });

  // Attach manage:all to admin
  const manageAll = createdPermissions.find((x) => x.action === 'manage' && x.subject === 'all');
  if (manageAll) {
    await prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: manageAll.id } });
  }

  // Create users
  const adminUser = await prisma.user.create({
    data: { email: 'admin@example.com', passwordHash },
  });
  const regularUser = await prisma.user.create({
    data: { email: 'user@example.com', passwordHash },
  });

  // Assign admin role to admin user (key for RBAC)
  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

  console.log('Seed completed: created users, roles, permissions.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });