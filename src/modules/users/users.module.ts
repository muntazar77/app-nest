import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CaslAbilityFactory } from '../../common/casl/casl-ability.factory';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService ,CaslAbilityFactory],
})
export class UsersModule {}
