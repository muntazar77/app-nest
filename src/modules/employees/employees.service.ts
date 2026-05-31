// src/modules/employees/employees.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    // ensure user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('User not found');

    // ensure user not already has employee
    const existing = await this.prisma.employee.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new BadRequestException('Employee already exists for this user');

    const dep = await this.prisma.department.findFirst({
  where: { id: dto.departmentId, isActive: true },
});
if (!dep) throw new BadRequestException('Department not found');

    return this.prisma.employee.create({
      data: {
        userId: dto.userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        departmentId: dto.departmentId,
      },
      include: { user: { select: { id: true, email: true } },
      department: true, },
    });
  }

async findAll({ page = 1, limit = 20 }: PaginationDto) {
  const skip = (page - 1) * limit;

  const [items, total] = await this.prisma.$transaction([
    this.prisma.employee.findMany({
      where: { isActive: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } },
    }),
    this.prisma.employee.count({ where: { isActive: true } }),
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
    const emp = await this.prisma.employee.findFirst({
      where: { id, isActive: true },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    // optionally prevent userId change:
    // if (dto.userId) throw new BadRequestException("userId can't be changed");

    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }
}