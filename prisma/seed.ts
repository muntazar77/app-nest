import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) process.exit(1);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1) Ensure permissions (upsert by unique action+subject)
  const perms = [
    { action: 'manage', subject: 'all', title: 'Full access' },
    { action: 'read', subject: 'User', title: 'Read users' },
    { action: 'create', subject: 'User', title: 'Create users' },
    { action: 'update', subject: 'User', title: 'Update users' },
    { action: 'delete', subject: 'User', title: 'Delete users' },
    { action: 'read', subject: 'Role', title: 'Read roles' },
    { action: 'manage', subject: 'Role', title: 'Manage roles' },
    { action: 'read', subject: 'Permission', title: 'Read permissions' },
    { action: 'manage', subject: 'Permission', title: 'Manage permissions' },
  ] as const;

  const created: Awaited<ReturnType<typeof prisma.permission.upsert>>[] = [];
  for (const p of perms) {
    const perm = await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: { title: p.title ?? null },
      create: { action: p.action, subject: p.subject, title: p.title ?? null },
    });
    created.push(perm);
  }

  // 2) Ensure admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { title: 'Administrator', isSystem: true },
    create: { name: 'admin', title: 'Administrator', isSystem: true },
  });

  // 3) Ensure manage:all attached to admin
  const manageAll = created.find((x) => x.action === 'manage' && x.subject === 'all');
  if (!manageAll) throw new Error('manage:all permission missing');

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: manageAll.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: manageAll.id },
  });

  // 4) Ensure admin user + assign admin role
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {}, // optional: don't overwrite password automatically
    create: { email: 'admin@example.com', passwordHash },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  await prisma.employee.upsert({
  where: { userId: adminUser.id },
  update: { isActive: true, firstName: 'Admin', lastName: 'User' },
  create: { userId: adminUser.id, firstName: 'Admin', lastName: 'User', isActive: true },
});

  console.log('Seed OK: admin role + manage:all + admin user ensured');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());