import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string,dto: CreateDepartmentDto) {
    // منع تكرار الاسم بطريقة واضحة
    const name = dto.name.trim().toLowerCase();
    const exists = await this.prisma.department.findUnique({
      where: { orgId_department_name: { orgId, name } },
    });
    if (exists) throw new BadRequestException('Department name already exists');

    return this.prisma.department.create({
      data: {
        name,
        title: dto.title ?? null,
        org: { connect: { id: orgId } },
      },
    });
  }

  async findAll(orgId: string, { page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const where = { isActive: true, orgId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(orgId: string, id: string) {
    const dep = await this.prisma.department.findFirst({
      where: { id, isActive: true, orgId },
    });
    if (!dep) throw new NotFoundException('Department not found');
    return dep;
  }

  async update(orgId: string, id: string, dto: UpdateDepartmentDto) {
    const current = await this.findOne(orgId, id);

    // لو بتسمح بتغيير name: لازم تتحقق من unique
    if (dto.name) {
      const name = dto.name.trim().toLowerCase();
      const conflict = await this.prisma.department.findUnique({
        where: { orgId_department_name: { orgId: current.orgId, name } },
      });
      if (conflict && conflict.id !== id) throw new BadRequestException('Department name already exists');

      dto.name = name;
    }

    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name, title: dto.title },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}