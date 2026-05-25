import { Module } from '@nestjs/common';

import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { ConfigModule } from '@nestjs/config';

import { CaslAbilityFactory } from './common/casl/casl-ability.factory';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AuthModule,
    PostsModule,
    PermissionsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: '.env', // optional
    }),
    PermissionsModule,
  ],
  controllers: [],
  providers: [PrismaService, CaslAbilityFactory],
})
export class AppModule {}
// , {
//     provide: 'APP_GUARD',
//     useClass: PoliciesGuard,
//   }
