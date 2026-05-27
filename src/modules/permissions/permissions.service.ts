import { BadRequestException, Injectable, NotFoundException,ForbiddenException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}


  findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
    });
  }

  async findOne(id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }


  async create(dto: CreatePermissionDto) {
    try {
      return await this.prisma.permission.create({ data: dto });
    } catch (e: any) {
      // Unique constraint: action + subject
      if (e?.code === 'P2002') {
        throw new BadRequestException('Permission already exists for this action + subject');
      }
      throw e;
    }
  }


  async update(id: string, dto: UpdatePermissionDto) {
    await this.findOne(id);
    try {
      return await this.prisma.permission.update({
        where: { id },
        data: dto,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Permission already exists for this action + subject');
      }
      throw e;
    }
  }

async remove(id: string) {
  const perm = await this.findOne(id);

  if (perm.action === 'manage' && perm.subject === 'all') {
    throw new ForbiddenException('manage:all permission cannot be deleted');
  }

  return this.prisma.permission.delete({ where: { id } });
}
}
