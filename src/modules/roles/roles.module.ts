import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CaslAbilityFactory } from 'src/common/casl/casl-ability.factory';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService,CaslAbilityFactory],
    exports: [RolesService],

})
export class RolesModule {}
