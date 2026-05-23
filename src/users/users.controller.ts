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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckPolicies } from '../common/casl/check-policies.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() bodyData: any) {
    return this.usersService.create(bodyData);
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
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

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
  me(@Req() req: any) {
    // Only allowed if user has read:User permission
    return req.user;
  }
}
