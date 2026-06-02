import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  // Apply rate limiting to the login endpoint
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Limit to 5 requests per minute for this endpoint
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.auth.getMe(user.id, user.orgId);
  }
}
