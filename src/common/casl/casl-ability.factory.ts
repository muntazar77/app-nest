import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType } from '@casl/ability';
import { Actions, Subjects } from './casl.types';

export type AppAbility = Ability<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string): Promise<AppAbility> {
    // Get all permissions for user's roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    const { can, build } = new AbilityBuilder<AppAbility>(Ability as AbilityClass<AppAbility>);

    if (!user) {
      return build();
    }

    const permissionsSet = new Set<string>();

    user.userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        const { action, subject } = rp.permission;
        const key = `${action}:${subject}`;
        if (!permissionsSet.has(key)) {
          permissionsSet.add(key);
          can(action as Actions, subject as Subjects);
        }
      });
    });

    // optionally: if user is admin, give manage:all
    // (already handled above if 'manage:all' permission is present)

    return build({
      detectSubjectType: (item: unknown) =>
        (item as { constructor: ExtractSubjectType<Subjects> }).constructor,
    });
  }
}