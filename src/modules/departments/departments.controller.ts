import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from 'src/common/guards/policies.guard';
import { CheckPolicies } from 'src/common/casl/check-policies.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @CheckPolicies((ability) => ability.can('create', 'Department'))
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.orgId, dto);
  }

  @CheckPolicies((ability) => ability.can('read', 'Department'))
  @Get()
  findAll(@CurrentUser() user: any,@Query() q: PaginationDto) {
    return this.departmentsService.findAll(user.orgId, q);
  }

  @CheckPolicies((ability) => ability.can('read', 'Department'))
  @Get(':id')
  findOne(@CurrentUser() user: any,@Param('id') id: string) {
    return this.departmentsService.findOne(user.orgId, id);
  }

  @CheckPolicies((ability) => ability.can('update', 'Department'))
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(user.orgId, id, dto);
  }

  @CheckPolicies((ability) => ability.can('delete', 'Department'))
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.departmentsService.remove(user.orgId, id);
  }
}