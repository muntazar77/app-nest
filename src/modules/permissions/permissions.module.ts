import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CaslAbilityFactory } from 'src/common/casl/casl-ability.factory';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService,CaslAbilityFactory],
   exports: [PermissionsService],
 })
export class PermissionsModule {}
