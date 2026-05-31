import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    // منع تكرار الاسم بطريقة واضحة
    dto.name.trim().toLowerCase();
    const exists = await this.prisma.department.findUnique({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Department name already exists');

    return this.prisma.department.create({
      data: { name: dto.name, title: dto.title ?? null },
    });
  }

  async findAll({ page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const where = { isActive: true };

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

  async findOne(id: string) {
    const dep = await this.prisma.department.findFirst({
      where: { id, isActive: true },
    });
    if (!dep) throw new NotFoundException('Department not found');
    return dep;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    // لو بتسمح بتغيير name: لازم تتحقق من unique
    if (dto.name) {
      const conflict = await this.prisma.department.findUnique({ where: { name: dto.name } });
      if (conflict && conflict.id !== id) throw new BadRequestException('Department name already exists');
    }

    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name, title: dto.title },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}