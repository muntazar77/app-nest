// src/modules/employees/employees.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string,dto: CreateEmployeeDto) {
    // ensure user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId ,orgId},
    });
    if (!user) throw new BadRequestException('User not found');

    // ensure user not already has employee
    const existing = await this.prisma.employee.findUnique({
      where: { userId: dto.userId, orgId },
    });
    if (existing)
      throw new BadRequestException('Employee already exists for this user');

    const dep = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, isActive: true, orgId },
    });
    if (!dep) throw new BadRequestException('Department not found');

    return this.prisma.employee.create({
      data: {
        userId: dto.userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        departmentId: dto.departmentId,
        orgId,
      },
      include: {
        user: { select: { id: true, email: true } },
        department: true,
      },
    });
  }

  async findAll(orgId: string, { page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where: { isActive: true, orgId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.employee.count({ where: { isActive: true, orgId } }),
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

  async findOne(orgId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, isActive: true, orgId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async update(orgId: string, id: string, dto: UpdateEmployeeDto) {
    // optionally prevent userId change:
    // if (dto.userId) throw new BadRequestException("userId can't be changed");

    await this.findOne(orgId, id);

    return this.prisma.employee.update({
      where: { id, orgId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);

    return this.prisma.employee.update({
      where: { id, orgId },
      data: { isActive: false },
    });
  }
}
