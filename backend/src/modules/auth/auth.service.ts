import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export interface AuthUser {
  id: string;
  displayName: string;
  username: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Password auth ────────────────────────────────────────────────────────

  async register(
    loginUsername: string,
    password: string,
    displayName: string,
  ): Promise<{ accessToken: string; user: AuthUser }> {
    if (!loginUsername?.trim()) throw new BadRequestException('Логин не может быть пустым');
    if (!password || password.length < 4) throw new BadRequestException('Пароль минимум 4 символа');
    if (!displayName?.trim()) throw new BadRequestException('Имя не может быть пустым');

    const existing = await this.prisma.user.findUnique({
      where: { loginUsername: loginUsername.trim().toLowerCase() },
    });
    if (existing) throw new ConflictException('Такой логин уже занят');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        loginUsername: loginUsername.trim().toLowerCase(),
        passwordHash,
        displayName: displayName.trim(),
      },
    });

    const accessToken = this.jwt.sign({ sub: user.id });
    return { accessToken, user: { id: user.id, displayName: user.displayName, username: user.username } };
  }

  async loginWithPassword(
    loginUsername: string,
    password: string,
  ): Promise<{ accessToken: string; user: AuthUser }> {
    if (!loginUsername?.trim() || !password) {
      throw new UnauthorizedException('Введи логин и пароль');
    }

    const user = await this.prisma.user.findUnique({
      where: { loginUsername: loginUsername.trim().toLowerCase() },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Неверный логин или пароль');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный логин или пароль');

    const accessToken = this.jwt.sign({ sub: user.id });
    return { accessToken, user: { id: user.id, displayName: user.displayName, username: user.username } };
  }

  // ─── Telegram auth ────────────────────────────────────────────────────────

  async loginWithTelegram(initData: string): Promise<{ accessToken: string; user: AuthUser }> {
    const dbUser = await this.verifyAndUpsert(initData);
    const accessToken = this.jwt.sign({ sub: dbUser.id });
    return {
      accessToken,
      user: { id: dbUser.id, displayName: dbUser.displayName, username: dbUser.username },
    };
  }

  private async verifyAndUpsert(initData: string) {
    // Dev bypass — только вне production
    if (process.env.NODE_ENV !== 'production' && (!initData || initData === 'dev')) {
      return this.prisma.user.upsert({
        where: { telegramId: 1n },
        update: {},
        create: {
          telegramId: 1n,
          loginUsername: null,
          username: 'dev_user',
          displayName: 'Dev User',
        },
      });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new UnauthorizedException('Missing hash in initData');
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const botToken = process.env.BOT_TOKEN ?? '';

    if (botToken) {
      // Validate HMAC only if BOT_TOKEN is set
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (expectedHash !== hash) {
        throw new UnauthorizedException('Invalid Telegram initData signature');
      }
    }
    // If BOT_TOKEN is not set — skip HMAC check (dev/test mode)

    const userJson = params.get('user');
    if (!userJson) throw new UnauthorizedException('No user field in initData');
    const tg = JSON.parse(userJson);

    const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || 'User';

    return this.prisma.user.upsert({
      where: { telegramId: BigInt(tg.id) },
      update: { username: tg.username ?? null, displayName },
      create: {
        telegramId: BigInt(tg.id),
        username: tg.username ?? null,
        displayName,
      },
    });
  }
}
