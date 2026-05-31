import { Injectable,ForbiddenException,NotFoundException,BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}


  async create(orgId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({
      where: { orgId_email: { orgId, email } },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: { orgId, email, passwordHash, isActive: true },
      select: { id: true, orgId: true, email: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async findAll(orgId: string, { page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;

    const where = { orgId, isActive: true };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId, isActive: true },
      select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(orgId: string, id: string, dto: UpdateUserDto) {
    // safe update: ensure same org + active
    const found = await this.prisma.user.findFirst({
      where: { id, orgId, isActive: true },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('User not found');

    // optional: support updating email
    let email: string | undefined = undefined;
    if (dto.email) email = dto.email.trim().toLowerCase();

    // optional: support updating password
    let passwordHash: string | undefined = undefined;
    if (dto.password) passwordHash = await bcrypt.hash(dto.password, 12);

    // if email changed, check unique within org
    if (email) {
      const conflict = await this.prisma.user.findUnique({
        where: { orgId_email: { orgId, email } },
        select: { id: true },
      });
      if (conflict && conflict.id !== id) throw new BadRequestException('Email already in use');
    }

    return this.prisma.user.update({
      where: { id },
      data: { email, passwordHash },
      select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }




 async remove(orgId: string, id: string) {
  // اختياري: لا تسمح بحذف admin نفسه أو آخر admin
  return this.prisma.user.update({
    where: { id, orgId },
    data: { isActive: false },
  });
}




  async assignRole(userId: string, roleId: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!role) throw new NotFoundException('Role not found');

    try {
      return await this.prisma.userRole.create({
        data: { userId, roleId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('User already has this role');
      }
      throw e;
    }
  }

  async unassignRole(userId: string, roleId: string, currentUserId?: string) {
    // optional: Schutz gegen self-lockout
    if (currentUserId && currentUserId === userId) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (role?.name === 'admin' || role?.isSystem) {
        throw new ForbiddenException("You can't remove your own admin/system role");
      }
    }

    // ensure relation exists -> nicer errors
    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!existing) throw new NotFoundException('UserRole not found');

    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
