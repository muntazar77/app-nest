import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { CaslAbilityFactory } from 'src/common/casl/casl-ability.factory';

@Module({
  controllers: [OrgController],
  providers: [OrgService,CaslAbilityFactory],
})
export class OrgModule {}
