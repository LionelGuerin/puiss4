import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Récupération du service de config pour lire le PORT et l'URL FRONTEND
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        console.error('ERREUR DE VALIDATION DÉTECTÉE :');
        console.error(JSON.stringify(errors, null, 2));
        return new BadRequestException(errors);
      },
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  // Utilisation de la variable d'env pour CORS
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
void bootstrap();
