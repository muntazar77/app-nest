import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  async register(dto: RegisterDto) {
    const org = await this.prisma.organization.findFirst({
      where: { slug: dto.orgSlug, isActive: true },
      select: { id: true, slug: true, name: true },
    });

    if (!org) {
      // لا نطبع password — فقط orgSlug/email
      this.logger.warn(
        { orgSlug: dto.orgSlug, email: dto.email },
        'Register failed: org not found',
      );
      throw new BadRequestException('Organization not found');
    }

    const existUser = await this.prisma.user.findFirst({
      where: { orgId: org.id, email: dto.email, isActive: true },
      select: { id: true },
    });

    if (existUser) {
      this.logger.warn(
        { orgId: org.id, orgSlug: org.slug, email: dto.email },
        'Register failed: email already in use',
      );
      throw new BadRequestException('Email already in use');
    }

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

    this.logger.info(
      { orgId: user.orgId, userId: user.id, email: user.email },
      'User registered',
    );

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
    });

    return { accessToken, user, org };
  }

  async login(dto: LoginDto) {
    // ملاحظة: لا تميز في اللوج بين "user not found" و "wrong password" كثيراً
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
        org: { slug: dto.orgSlug, isActive: true },
      },
      select: { id: true, email: true, orgId: true, passwordHash: true },
    });

    if (!user) {
      // لا تكشف تفاصيل كثيرة
      this.logger.warn(
        { orgSlug: dto.orgSlug, email: dto.email },
        'Login failed: invalid credentials',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);

    if (!ok) {
      this.logger.warn(
        { orgId: user.orgId, userId: user.id, email: user.email },
        'Login failed: invalid credentials',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.info(
      { orgId: user.orgId, userId: user.id, email: user.email },
      'User logged in',
    );

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
                  select: {
                    permission: {
                      select: {
                        id: true,
                        action: true,
                        subject: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const roles = user.userRoles.map((ur) => ur.role);
    const permissions = roles.flatMap((r) =>
      r.rolePermissions.map((rp) => rp.permission),
    );

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


 

  async setPassword(dto: SetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const invite = await this.prisma.userInvite.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, orgId: true, email: true },
    });

    if (!invite) throw new BadRequestException('Invalid or expired token');

    const email = invite.email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({
      where: { orgId_email: { orgId: invite.orgId, email } },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        orgId: invite.orgId,
        email,
        passwordHash,
        isActive: true,
      },
      select: { id: true, orgId: true, email: true, createdAt: true },
    });

    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    this.logger.info({ orgId: user.orgId, userId: user.id }, 'User activated via invite');

    // Optional: auto-login
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
    });

    return { user, accessToken };
  }
}

