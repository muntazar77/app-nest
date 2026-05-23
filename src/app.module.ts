import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { CaslAbilityFactory } from './common/casl/casl-ability.factory';
import { PoliciesGuard } from './common/guards/policies.guard';
import { APP_GUARD } from '@nestjs/core';


@Module({
  imports: [UsersModule, PrismaModule, AuthModule, PostsModule],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory, {
    provide: 'APP_GUARD',
    useClass: PoliciesGuard,
  }],
})
export class AppModule {}
