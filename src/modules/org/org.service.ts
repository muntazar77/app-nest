import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { createHash, randomBytes } from 'crypto';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrgService.name);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async invite(orgId: string, createdByUserId: string, dto: InviteUserDto) {
    const email = dto.email.trim().toLowerCase();

    const userExists = await this.prisma.user.findUnique({
      where: { orgId_email: { orgId, email } },
      select: { id: true },
    });
    if (userExists) throw new BadRequestException('User already exists');

    // revoke previous unused invites for same email
    await this.prisma.userInvite.updateMany({
      where: { orgId, email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const inviteToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(inviteToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.userInvite.create({
      data: {
        orgId,
        email,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdByUserId,
      },
    });

    this.logger.info({ orgId, createdByUserId, email }, 'User invited');

    return { inviteToken, expiresAt };
  }
}