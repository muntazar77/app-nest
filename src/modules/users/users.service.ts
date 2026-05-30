import { Injectable,ForbiddenException,NotFoundException,BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    
    const res = this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
    return res;
  }

async findAll({ page = 1, limit = 20 }: PaginationDto) {
  const skip = (page - 1) * limit;

  const where = { isActive: true };

  const [items, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // لا ترجع passwordHash أبدًا
      },
    }),
    this.prisma.user.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

  findOne(id: string) {
    return this.prisma.user.findFirst({
      where: { id , isActive: true },
    });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id , isActive: true },
      data: data,
    });
  }

 async remove(id: string) {
  // اختياري: لا تسمح بحذف admin نفسه أو آخر admin
  return this.prisma.user.update({
    where: { id },
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
