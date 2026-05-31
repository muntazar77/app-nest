import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateRoleDto) {
    const name = dto.name.trim().toLowerCase();

    const exists = await this.prisma.role.findUnique({
      where: { orgId_role_name: { orgId, name } },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Role name already exists');

    return this.prisma.role.create({
      data: { orgId, name, title: dto.title ?? null, isSystem: false },
    });
  }
 
  async findAll(orgId: string, { page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where: { orgId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where: { orgId } }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: { include: { user: { select: { id: true, email: true } } } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    try {
      return await this.prisma.role.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new BadRequestException('Role name already exists');
      throw e;
    }
  }
  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem === true || role.name === 'admin') {
      throw new ForbiddenException("You can't delete system roles");
    }
    return this.prisma.role.delete({ where: { id } });
  }

  // --- RolePermission management ---
  // async attachPermission(roleId: string, permissionId: string) {
  //   // ensure both exist (better errors)
  //   const [role, perm] = await Promise.all([
  //     this.prisma.role.findUnique({ where: { id: roleId } }),
  //     this.prisma.permission.findUnique({ where: { id: permissionId } }),
  //   ]);
  //   if (!role) throw new NotFoundException('Role not found');
  //   if (!perm) throw new NotFoundException('Permission not found');

  //   try {
  //     return await this.prisma.rolePermission.create({
  //       data: { roleId, permissionId },
  //     });
  //   } catch (e: any) {
  //     if (e?.code === 'P2002') throw new BadRequestException('Permission already attached to role');
  //     throw e;
  //   }
  // }

  // async detachPermission(roleId: string, permissionId: string) {
  //   return this.prisma.rolePermission.delete({
  //     where: { roleId_permissionId: { roleId, permissionId } },
  //   });
  // }

  // roles.service.ts

  async setPermissions(roleId: string, permissionIds: string[]) {
    const ids = [...new Set(permissionIds)]; // remove duplicates

    // check role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found');

    // find manage:all permission (required for admin/system)
    const manageAll = await this.prisma.permission.findUnique({
      where: { action_subject: { action: 'manage', subject: 'all' } }, // uses your @@unique([action, subject])
      select: { id: true },
    });
    if (!manageAll) {
      throw new BadRequestException(
        'System misconfigured: manage:all permission not found',
      );
    }

    // protect admin/system role from losing manage:all
    if (role.name === 'admin' || role.isSystem) {
      if (!ids.includes(manageAll.id)) {
        throw new ForbiddenException(
          "You can't remove manage:all from admin/system role",
        );
      }
    }

    // check all permissions exist
    const found = await this.prisma.permission.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('One or more permissionIds are invalid');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (ids.length > 0) {
        await tx.rolePermission.createMany({
          data: ids.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
    });

    return this.findOne(roleId);
  }
}
