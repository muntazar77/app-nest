import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    //first check if email is already in use
    const existUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existUser) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.passwordHash, 12);

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user,
    };
  }

  async login(dto: LoginDto) {
    // في MVP: identifier = email
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.passwordHash, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return { accessToken };
  }
}