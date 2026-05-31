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
  ],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory],
})
export class AppModule {}
// , {
//     provide: 'APP_GUARD',
//     useClass: PoliciesGuard,
//   }
