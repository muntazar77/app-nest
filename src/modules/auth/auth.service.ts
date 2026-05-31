import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const org = await this.prisma.organization.findFirst({
      where: { slug: dto.orgSlug, isActive: true },
      select: { id: true, slug: true, name: true },
    });
    if (!org) throw new BadRequestException('Organization not found');

    // unique within org
    const existUser = await this.prisma.user.findFirst({
      where: { orgId: org.id, email: dto.email, isActive: true },
      select: { id: true },
    });
    if (existUser) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        orgId: org.id,
        email: dto.email,
        passwordHash,
        isActive: true,
      },
      select: { id: true, email: true, orgId: true, createdAt: true },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
    });

    return {
      accessToken,
      user,
      org,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
        org: { slug: dto.orgSlug, isActive: true },
      },
      select: { id: true, email: true, orgId: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
    });

    return { accessToken };
  }


  async getMe(userId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId, isActive: true },
      select: {
        id: true,
        email: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        org: { select: { id: true, slug: true, name: true, isActive: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            department: { select: { id: true, name: true, title: true } },
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                title: true,
                rolePermissions: {
                  select: { permission: { select: { id: true, action: true, subject: true, title: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const roles = user.userRoles.map((ur) => ur.role);
    const permissions = roles.flatMap((r) => r.rolePermissions.map((rp) => rp.permission));

    return {
      user: {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      org: user.org,
      employee: user.employee,
      roles: roles.map((r) => ({ id: r.id, name: r.name, title: r.title })),
      permissions,
    };
  }
}