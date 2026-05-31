// src/modules/employees/employees.controller.ts
import {
  Body,
  Controller,
  Delete,
  Query,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../../common/guards/policies.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @CheckPolicies((ability) => ability.can('create', 'Employee'))
  @Post()
  create(@CurrentUser() user: any,@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.orgId, dto);
  }

  @CheckPolicies((ability) => ability.can('read', 'Employee'))
  @Get()
  findAll(@CurrentUser() user: any,@Query() q: PaginationDto) {
    return this.employeesService.findAll(user.orgId, q);
  }

  @CheckPolicies((ability) => ability.can('read', 'Employee'))
  @Get(':id')
  findOne(@CurrentUser() user: any,@Param('id') id: string) {
    return this.employeesService.findOne(user.orgId, id);
  }

  @CheckPolicies((ability) => ability.can('update', 'Employee'))
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(user.orgId, id, dto);
  }

  @CheckPolicies((ability) => ability.can('delete', 'Employee'))
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.remove(user.orgId, id);
  }
}
