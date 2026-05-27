import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/telegram — silent-вход через Telegram Mini App */
  @Post('telegram')
  loginTelegram(@Body('initData') initData: string) {
    return this.auth.loginWithTelegram(initData ?? '');
  }

  /** POST /api/auth/register — регистрация через логин + пароль */
  @Post('register')
  register(
    @Body('loginUsername') loginUsername: string,
    @Body('password') password: string,
    @Body('displayName') displayName: string,
  ) {
    return this.auth.register(loginUsername, password, displayName);
  }

  /** POST /api/auth/login — вход через логин + пароль */
  @Post('login')
  loginPassword(
    @Body('loginUsername') loginUsername: string,
    @Body('password') password: string,
  ) {
    return this.auth.loginWithPassword(loginUsername, password);
  }

  /** GET /api/auth/me — проверка токена + получение профиля */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.auth.getProfile(user.id);
  }
}
