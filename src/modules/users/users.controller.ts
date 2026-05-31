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
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';
import { PoliciesGuard } from '../../common/guards/policies.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @CheckPolicies((ability) => ability.can('create', 'User'))
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.orgId, dto);
  }

  @CheckPolicies((ability) => ability.can('read', 'User'))
  @Get()
  findAll(@CurrentUser() user: any, @Query() q: PaginationDto) {
    return this.usersService.findAll(user.orgId, q);
  }

  @CheckPolicies((ability) => ability.can('read', 'User'))
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findOne(user.orgId, id);
  }


  
 
  @CheckPolicies((ability) => ability.can('update', 'User'))
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.orgId, id, dto);
  }

  @CheckPolicies((ability) => ability.can('delete', 'User'))
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.remove(user.orgId, id);
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
