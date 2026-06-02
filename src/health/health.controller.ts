// this file is used to catch all unhandled exceptions and return a consistent error response format
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    try {
      // DB ping (أي query بسيطة)
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        db: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}