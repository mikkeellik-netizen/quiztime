import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const publicDir = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicDir, 'index.html');

  // 1. Статика (js / css / картинки). index:false — '/' отдаём через SPA-fallback ниже.
  app.useStaticAssets(publicDir, {
    index: false,
    setHeaders: (res: any, filePath: string) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (/\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  // 2. SPA-fallback: любой GET, кроме /api/* и /socket.io/*, отдаёт index.html.
  //    Регулярка исключает REST-эндпоинты и Socket.IO polling.
  const server = app.getHttpAdapter().getInstance();
  server.get(/^\/(?!api(\/|$))(?!socket\.io(\/|$)).*/, (_req: any, res: any, next: any) => {
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
