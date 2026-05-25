import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
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

  async loginWithTelegram(initData: string): Promise<{ accessToken: string; user: AuthUser }> {
    const dbUser = await this.verifyAndUpsert(initData);
    const accessToken = this.jwt.sign({ sub: dbUser.id });
    return {
      accessToken,
      user: { id: dbUser.id, displayName: dbUser.displayName, username: dbUser.username },
    };
  }

  private async verifyAndUpsert(initData: string) {
    // Dev bypass — работает только когда NODE_ENV !== production
    if (process.env.NODE_ENV !== 'production' && (!initData || initData === 'dev')) {
      return this.prisma.user.upsert({
        where: { telegramId: 1n },
        update: {},
        create: { telegramId: 1n, username: 'dev_user', displayName: 'Dev User' },
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

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN ?? '')
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const userJson = params.get('user');
    if (!userJson) throw new UnauthorizedException('No user field in initData');
    const tg = JSON.parse(userJson);

    const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || 'User';

    return this.prisma.user.upsert({
      where: { telegramId: BigInt(tg.id) },
      update: { username: tg.username ?? null, displayName },
      create: { telegramId: BigInt(tg.id), username: tg.username ?? null, displayName },
    });
  }
}
