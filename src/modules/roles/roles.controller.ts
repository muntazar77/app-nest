import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CheckPolicies } from 'src/common/casl/check-policies.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from 'src/common/guards/policies.guard';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can('read', 'all'))
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  // @Post(':roleId/permissions/:permissionId')
  // attachPermission(
  //   @Param('roleId') roleId: string,
  //   @Param('permissionId') permissionId: string,
  // ) {
  //   return this.rolesService.attachPermission(roleId, permissionId);
  // }

  // @Delete(':roleId/permissions/:permissionId')
  // detachPermission(
  //   @Param('roleId') roleId: string,
  //   @Param('permissionId') permissionId: string,
  // ) {
  //   return this.rolesService.detachPermission(roleId, permissionId);
  // }

  @Put(':roleId/permissions')
  setPermissions(
    @Param('roleId') roleId: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rolesService.setPermissions(roleId, dto.permissionIds);
  }
}
