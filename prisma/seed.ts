import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
    { action: 'create', subject: 'Role', title: 'Create roles' },
    { action: 'update', subject: 'Role', title: 'Update roles' },
    { action: 'delete', subject: 'Role', title: 'Delete roles' },

    { action: 'read', subject: 'Permission', title: 'Read permissions' },
    { action: 'create', subject: 'Permission', title: 'Create permissions' },
    { action: 'update', subject: 'Permission', title: 'Update permissions' },
    { action: 'delete', subject: 'Permission', title: 'Delete permissions' },

    { action: 'read', subject: 'Employee', title: 'Read employees' },
    { action: 'create', subject: 'Employee', title: 'Create employees' },
    { action: 'update', subject: 'Employee', title: 'Update employees' },
    { action: 'delete', subject: 'Employee', title: 'Delete employees' },

    { action: 'read', subject: 'Department', title: 'Read departments' },
    { action: 'create', subject: 'Department', title: 'Create departments' },
    { action: 'update', subject: 'Department', title: 'Update departments' },
    { action: 'delete', subject: 'Department', title: 'Delete departments' },
  ] as const;

  const createdPerms: Awaited<ReturnType<typeof prisma.permission.upsert>>[] = [];

  for (const p of perms) {
    const perm = await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: { title: p.title ?? null },
      create: { action: p.action, subject: p.subject, title: p.title ?? null },
    });
    createdPerms.push(perm);
  }

  // 2) Ensure admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { title: 'Administrator', isSystem: true },
    create: { name: 'admin', title: 'Administrator', isSystem: true },
  });

  // 3) Ensure manage:all attached to admin role
  const manageAll = createdPerms.find((x) => x.action === 'manage' && x.subject === 'all');
  if (!manageAll) throw new Error('manage:all permission missing');

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: manageAll.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: manageAll.id },
  });

  // 4) Ensure default department
  const generalDepartment = await prisma.department.upsert({
    where: { name: 'general' },
    update: { isActive: true, title: 'General' },
    create: { name: 'general', title: 'General', isActive: true },
  });

  // 5) Ensure admin user + assign admin role
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isActive: true }, // do not overwrite password automatically
    create: { email: 'admin@example.com', passwordHash, isActive: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // 6) Ensure regular user (non-admin)
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { isActive: true },
    create: { email: 'user@example.com', passwordHash, isActive: true },
  });

  // 7) Ensure employees exist and ALWAYS have departmentId
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {
      isActive: true,
      firstName: 'Admin',
      lastName: 'User',
      departmentId: generalDepartment.id,
    },
    create: {
      userId: adminUser.id,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      departmentId: generalDepartment.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: regularUser.id },
    update: {
      isActive: true,
      firstName: 'Regular',
      lastName: 'User',
      departmentId: generalDepartment.id,
    },
    create: {
      userId: regularUser.id,
      firstName: 'Regular',
      lastName: 'User',
      isActive: true,
      departmentId: generalDepartment.id,
    },
  });

  // 8) Backfill any existing employee rows missing departmentId (if you ever ran older schema)
  // Use explicit filter to match null departmentId to satisfy Prisma typings
  // await prisma.employee.updateMany({
  //   where: { departmentId: null },
  //   data: { departmentId: generalDepartment.id },
  // });

  console.log('Seed OK: permissions + admin role + users + default department + employees ensured');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });