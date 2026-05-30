import {
  Req,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';
import { PoliciesGuard } from '../../common/guards/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  @CheckPolicies((ability) => ability.can('create', 'User'))

  @Post()
  create(@Body() bodyData: any) {
    return this.usersService.create(bodyData);
  }
  // @UseGuards(JwtAuthGuard)
  @CheckPolicies((ability) => ability.can('read', 'User'))

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @CheckPolicies((ability) => ability.can('read', 'User'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @CheckPolicies((ability) => ability.can('update', 'User'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() bodyData: any) {
    return this.usersService.update(id, bodyData);
  }

  @CheckPolicies((ability) => ability.can('delete', 'User'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @CheckPolicies((ability) => ability.can('update', 'User'))
  @Post(':userId/roles/:roleId')
  assignRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.usersService.assignRole(userId, roleId);
  }

  @CheckPolicies((ability) => ability.can('update', 'User'))
  @Delete(':userId/roles/:roleId')
  unassignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Req() req: any,
  ) {
    return this.usersService.unassignRole(userId, roleId, req.user?.id);
  }

  @CheckPolicies((ability) => ability.can('read', 'User'))
  @Get(':userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.usersService.getUserRoles(userId);
  }
}
