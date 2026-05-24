import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { ConfigModule } from '@nestjs/config';

import { CaslAbilityFactory } from './common/casl/casl-ability.factory';
import { PoliciesGuard } from './common/guards/policies.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AuthModule,
    PostsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: '.env', // optional
    }),
  ],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory],
})
export class AppModule {}
// , {
//     provide: 'APP_GUARD',
//     useClass: PoliciesGuard,
//   }
