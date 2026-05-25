// import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { CaslAbilityFactory, AppAbility } from '../casl/casl-ability.factory';
// import { CHECK_POLICIES_KEY, PolicyHandler } from '../casl/check-policies.decorator';

// @Injectable()
// export class PoliciesGuard implements CanActivate {
//   constructor(
//     private reflector: Reflector,
//     private caslAbilityFactory: CaslAbilityFactory,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const handlers =
//       this.reflector.get<PolicyHandler[]>(
//         CHECK_POLICIES_KEY,
//         context.getHandler(),
//       ) || [];

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;
//     if (!user || !user.id) return false;

//     const ability = await this.caslAbilityFactory.createForUser(user.id);

//     return handlers.every(handler => handler(ability));
//   }
// }








import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import {
  CHECK_ANY_POLICIES_KEY,
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from '../casl/check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const andHandlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        [context.getHandler(), context.getClass()],
      ) || [];

    const orHandlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(
        CHECK_ANY_POLICIES_KEY,
        [context.getHandler(), context.getClass()],
      ) || [];

    if (andHandlers.length === 0 && orHandlers.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return false;

    const ability = await this.caslAbilityFactory.createForUser(user.id);

    const andOk = andHandlers.length === 0 || andHandlers.every((h) => h(ability));
    const orOk = orHandlers.length === 0 || orHandlers.some((h) => h(ability));

    return andOk && orOk;
  }
}









// How you use them in controllers
// Example 1 — AND (strict)
// ts

// @UseGuards(JwtAuthGuard, PoliciesGuard)
// @CheckPolicies(
//   (ability) => ability.can('read', 'User'),
//   (ability) => ability.can('read', 'Role'),
// )
// @Get('admin')
// adminArea() {}

// Example 2 — OR (flexible)
// ts

// @UseGuards(JwtAuthGuard, PoliciesGuard)
// @CheckAnyPolicy(
//   (ability) => ability.can('manage', 'all'),
//   (ability) => ability.can('read', 'User'),
// )
// @Get('support')
// supportArea() {}

// Example 3 — Combine AND + OR

// You can do:

//     must be able to read User (AND)
//     and must be (admin OR HR)

// ts

// @UseGuards(JwtAuthGuard, PoliciesGuard)
// @CheckPolicies((ability) => ability.can('read', 'User'))
// @CheckAnyPolicy(
//   (ability) => ability.can('manage', 'all'),
//   (ability) => ability.can('read', 'Role'),
// )
// @Get('mixed')
// mixedRule() {}
