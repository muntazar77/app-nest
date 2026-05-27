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
import { PoliciesGuard } from 'src/common/guards/policies.guard';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can('manage', 'all'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  create(@Body() bodyData: any) {
    return this.usersService.create(bodyData);
  }
  // @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() bodyData: any) {
    return this.usersService.update(id, bodyData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':userId/roles/:roleId')
  assignRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.usersService.assignRole(userId, roleId);
  }

  @Delete(':userId/roles/:roleId')
  unassignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Req() req: any,
  ) {
    return this.usersService.unassignRole(userId, roleId, req.user?.id);
  }

  @Get(':userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.usersService.getUserRoles(userId);
  }
}
