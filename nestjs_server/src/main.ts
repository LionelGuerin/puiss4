import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common'; // <--- IMPORT
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Activation de la validation automatique pour tous les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Retire automatiquement les propriétés non décorées (sécurité)
      forbidNonWhitelisted: true, // Renvoie une erreur si on envoie des champs inconnus
      transform: true, // Transforme automatiquement les payloads en instances de DTO
      transformOptions: {
        enableImplicitConversion: true, // <--- Permet de convertir "3" en 3 automatiquement
      },
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  app.enableCors({
    origin: '*', // <--- Remplace par l'URL de ton FRONTEND (ex: 3001, 8080)
    credentials: true, // <--- OBLIGATOIRE pour accepter les cookies
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(4000);
}
void bootstrap();
