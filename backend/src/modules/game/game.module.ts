import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'default-dev-secret-change-in-prod',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [GameGateway, GameService],
})
export class GameModule {}
