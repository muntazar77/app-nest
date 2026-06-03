import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from 'src/common/guards/policies.guard';
import { CheckPolicies } from 'src/common/casl/check-policies.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { OrgService } from './org.service';
import { InviteUserDto } from './dto/invite-user.dto';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('org/users')
export class OrgController {
  constructor(private readonly orgUsers: OrgService) {}

  @CheckPolicies((ability) => ability.can('create', 'User'))
  @Post('invite')
  invite(@CurrentUser() user: any, @Body() dto: InviteUserDto) {
    return this.orgUsers.invite(user.orgId, user.id, dto);
  }
}