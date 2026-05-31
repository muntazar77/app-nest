import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Add it to your environment before seeding.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PERMISSIONS = [
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

type PermissionKey = `${(typeof PERMISSIONS)[number]['action']}:${(typeof PERMISSIONS)[number]['subject']}`;

type SeedConfig = {
  seedFake: boolean;
  orgCount: number;
  usersPerOrg: number;
  departmentsPerOrg: number;
};

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function orgSpec(index: number) {
  if (index === 0) {
    return { slug: 'acme', name: 'Acme Inc.' };
  }

  return {
    slug: `org-${index + 1}`,
    name: `Organization ${index + 1}`,
  };
}

async function upsertPermissions() {
  const permissionMap = new Map<PermissionKey, string>();

  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: { title: p.title ?? null },
      create: { action: p.action, subject: p.subject, title: p.title ?? null },
    });

    permissionMap.set(`${p.action}:${p.subject}` as PermissionKey, perm.id);
  }

  return permissionMap;
}

async function setRolePermissions(roleId: string, permissionIds: string[]) {
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  });
}

function getConfig(): SeedConfig {
  return {
    seedFake: process.env.SEED_FAKE !== '0',
    orgCount: envInt('SEED_ORG_COUNT', 2),
    usersPerOrg: envInt('SEED_USERS_PER_ORG', 5),
    departmentsPerOrg: envInt('SEED_DEPARTMENTS_PER_ORG', 3),
  };
}

async function main() {
  const config = getConfig();
  const passwordHash = await bcrypt.hash('password123', 10);
  const permissionMap = await upsertPermissions();

  const manageAll = permissionMap.get('manage:all');
  if (!manageAll) throw new Error('manage:all permission missing');

  const orgSummaries: Array<{ slug: string; users: number; departments: number; roles: number }> = [];

  for (let orgIndex = 0; orgIndex < config.orgCount; orgIndex++) {
    const spec = orgSpec(orgIndex);

    const org = await prisma.organization.upsert({
      where: { slug: spec.slug },
      update: { name: spec.name, isActive: true },
      create: { slug: spec.slug, name: spec.name, isActive: true },
    });

    const roleProfiles: Array<{
      name: string;
      title: string;
      isSystem: boolean;
      permissions: PermissionKey[];
    }> = [
      {
        name: 'admin',
        title: 'Administrator',
        isSystem: true,
        permissions: ['manage:all'],
      },
      {
        name: 'manager',
        title: 'Manager',
        isSystem: false,
        permissions: [
          'read:User',
          'read:Employee',
          'create:Employee',
          'update:Employee',
          'read:Department',
          'create:Department',
          'update:Department',
        ],
      },
      {
        name: 'viewer',
        title: 'Viewer',
        isSystem: false,
        permissions: ['read:User', 'read:Employee', 'read:Department'],
      },
    ];

    const rolesByName = new Map<string, string>();
    for (const roleProfile of roleProfiles) {
      const role = await prisma.role.upsert({
        where: {
          orgId_role_name: {
            orgId: org.id,
            name: normalize(roleProfile.name),
          },
        },
        update: {
          title: roleProfile.title,
          isSystem: roleProfile.isSystem,
        },
        create: {
          orgId: org.id,
          name: normalize(roleProfile.name),
          title: roleProfile.title,
          isSystem: roleProfile.isSystem,
        },
      });

      const permissionIds = roleProfile.permissions.map((key) => {
        const id = permissionMap.get(key);
        if (!id) throw new Error(`Missing permission for ${key}`);
        return id;
      });

      await setRolePermissions(role.id, permissionIds);
      rolesByName.set(roleProfile.name, role.id);
    }

    const departments = [] as Array<{ id: string; name: string }>;
    for (let i = 0; i < config.departmentsPerOrg; i++) {
      const departmentName = i === 0 ? 'general' : `department-${i}`;
      const departmentTitle = i === 0 ? 'General' : faker.commerce.department();

      const dep = await prisma.department.upsert({
        where: {
          orgId_department_name: {
            orgId: org.id,
            name: normalize(departmentName),
          },
        },
        update: {
          title: departmentTitle,
          isActive: true,
        },
        create: {
          orgId: org.id,
          name: normalize(departmentName),
          title: departmentTitle,
          isActive: true,
        },
      });

      departments.push({ id: dep.id, name: dep.name });
    }

    const defaultDepartment = departments[0];
    if (!defaultDepartment) throw new Error(`No departments generated for org ${org.slug}`);

    const adminEmail = `admin@${org.slug}.test`;
    const adminUser = await prisma.user.upsert({
      where: {
        orgId_email: {
          orgId: org.id,
          email: adminEmail,
        },
      },
      update: {
        isActive: true,
        passwordHash,
      },
      create: {
        orgId: org.id,
        email: adminEmail,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.employee.upsert({
      where: { userId: adminUser.id },
      update: {
        orgId: org.id,
        departmentId: defaultDepartment.id,
        isActive: true,
        firstName: 'Admin',
        lastName: 'User',
        phone: null,
      },
      create: {
        orgId: org.id,
        userId: adminUser.id,
        departmentId: defaultDepartment.id,
        isActive: true,
        firstName: 'Admin',
        lastName: 'User',
        phone: null,
      },
    });

    const adminRoleId = rolesByName.get('admin');
    if (!adminRoleId) throw new Error(`Admin role missing for org ${org.slug}`);

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    });

    if (config.seedFake) {
      const poolRoleIds = [rolesByName.get('manager'), rolesByName.get('viewer')].filter(
        (id): id is string => Boolean(id),
      );
      if (poolRoleIds.length === 0) {
        throw new Error(`No non-admin roles available for org ${org.slug}`);
      }

      for (let i = 0; i < config.usersPerOrg; i++) {
        const email = `user${i + 1}@${org.slug}.test`;
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const user = await prisma.user.upsert({
          where: {
            orgId_email: {
              orgId: org.id,
              email: normalize(email),
            },
          },
          update: {
            isActive: true,
            passwordHash,
          },
          create: {
            orgId: org.id,
            email: normalize(email),
            passwordHash,
            isActive: true,
          },
        });

        const department = departments[i % departments.length];
        await prisma.employee.upsert({
          where: { userId: user.id },
          update: {
            orgId: org.id,
            departmentId: department.id,
            firstName,
            lastName,
            phone: faker.phone.number(),
            isActive: true,
          },
          create: {
            orgId: org.id,
            userId: user.id,
            departmentId: department.id,
            firstName,
            lastName,
            phone: faker.phone.number(),
            isActive: true,
          },
        });

        const pickedRole = poolRoleIds[i % poolRoleIds.length];
        await prisma.userRole.deleteMany({ where: { userId: user.id } });
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: pickedRole,
          },
        });
      }
    }

    const [usersCount, departmentsCount, rolesCount] = await prisma.$transaction([
      prisma.user.count({ where: { orgId: org.id } }),
      prisma.department.count({ where: { orgId: org.id } }),
      prisma.role.count({ where: { orgId: org.id } }),
    ]);

    orgSummaries.push({
      slug: org.slug,
      users: usersCount,
      departments: departmentsCount,
      roles: rolesCount,
    });
  }

  console.log('Seed config:', config);
  for (const item of orgSummaries) {
    console.log(
      `Seed OK (org=${item.slug}) users=${item.users} departments=${item.departments} roles=${item.roles}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });