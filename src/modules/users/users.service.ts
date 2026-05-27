import { Injectable,ForbiddenException,NotFoundException,BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';

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

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
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
