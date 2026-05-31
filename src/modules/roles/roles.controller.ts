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
  Query,
  Req
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CheckPolicies } from 'src/common/casl/check-policies.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from 'src/common/guards/policies.guard';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can('read', 'all'))
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
   create(@CurrentUser() user: any,  @Body() dto: CreateRoleDto) {
    return this.rolesService.create(user.orgId, dto);
  }

  

    @Get()
    findAll(@Query() q: PaginationDto,@CurrentUser() user: any,) {
        return this.rolesService.findAll(user.orgId, q);
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
