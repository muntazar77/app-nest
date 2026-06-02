import { Module } from '@nestjs/common';

import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

import { CaslAbilityFactory } from './common/casl/casl-ability.factory';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AuthModule,
    PermissionsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: '.env', // optional
    }),
    PermissionsModule,
    RolesModule,
    EmployeesModule,
    DepartmentsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60 seconds
        limit: 10, // 10 requests per minute per IP
      },
    ]),
    // Logging with pino
    LoggerModule.forRoot({
      pinoHttp: {
        // في التطوير: شكل جميل
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,

        // يضيف request id تلقائياً
        genReqId: (req, res) => {
          // لو عندك reverse proxy لاحقاً ممكن تستخدم header مثل x-request-id
          return req.id;
        },
      },
    }),
  ],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory],
})
export class AppModule {}
