import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { CaslAbilityFactory } from 'src/common/casl/casl-ability.factory';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionsService } from '../permissions/permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
  providers: [EmployeesService,CaslAbilityFactory],
  
})
export class EmployeesModule {}
