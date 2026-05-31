import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
}