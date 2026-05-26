import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  // Раздаём React SPA из папки public/ (копируется Dockerfile)
  const publicDir = path.join(process.cwd(), 'public');
  app.useStaticAssets(publicDir, {
    setHeaders: (res: any, filePath: string) => {
      if (filePath.endsWith('.html')) {
        // HTML никогда не кэшируем — иначе старый index.html грузит старый бандл
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (/\.(js|css)$/.test(filePath)) {
        // Хэшированные ассеты можно кэшировать бесконечно
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
