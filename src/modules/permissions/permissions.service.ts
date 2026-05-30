import { BadRequestException, Injectable, NotFoundException,ForbiddenException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}


  // findAll() {
  //   return this.prisma.permission.findMany({
  //     orderBy: [{ subject: 'asc' }, { action: 'asc' }],
  //   });
  // }

  async findAll({ page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        skip,
        take: limit,
        orderBy: [{ subject: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.permission.count(),
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
    throw new ForbiddenException("You can't delete manage:all");
  }
  return this.prisma.permission.delete({ where: { id } });
}
}
