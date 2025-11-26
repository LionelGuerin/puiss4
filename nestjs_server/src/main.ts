import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // NOUVELLE CONFIGURATION CORS (Cruciale pour les cookies)
  app.enableCors({
    origin: 'http://localhost:5173', // <--- Remplace par l'URL de ton FRONTEND (ex: 3001, 8080)
    credentials: true, // <--- OBLIGATOIRE pour accepter les cookies
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(4000);
}
void bootstrap();
