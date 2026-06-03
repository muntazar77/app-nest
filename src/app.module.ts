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
import { OrgModule } from './modules/org/org.module';

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
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l', singleLine: true },
          }
        : undefined,

    // سجّل فقط الطلبات التي statusCode >= 400
    autoLogging: {
      // pino-http typings expect ignore to accept only the request object.
      // use a single-arg signature and access the response via a non-standard property
      // that some frameworks attach, falling back safely.
      ignore: (req) => {
        const res = (req as any).res ?? (req as any).raw?.res;
        return !(res && res.statusCode >= 400);
      },
    },

    // هذا يحدد level للطلبات التي سيتم تسجيلها (4xx/5xx)
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      return 'warn'; // كل 4xx
    },

    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },

    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true,
    },
  },
}),
    OrgModule
  ],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory],
})
export class AppModule {}
