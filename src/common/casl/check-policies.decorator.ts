// import { SetMetadata } from '@nestjs/common';
// import { AppAbility } from './casl-ability.factory';

// export type PolicyHandler = (ability: AppAbility) => boolean;

// export const CHECK_POLICIES_KEY = 'check_policy';

// export const CheckPolicies = (...handlers: PolicyHandler[]) =>
//   SetMetadata(CHECK_POLICIES_KEY, handlers);



import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './casl-ability.factory';

export type PolicyHandler = (ability: AppAbility) => boolean;

export const CHECK_POLICIES_KEY = 'check_policies_and';
export const CHECK_ANY_POLICIES_KEY = 'check_policies_or';

// AND: all must pass
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

// OR: any can pass
export const CheckAnyPolicy = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_ANY_POLICIES_KEY, handlers);