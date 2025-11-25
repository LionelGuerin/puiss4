import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io'; // <--- Importer l'adaptateur

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ajoutez cette ligne pour utiliser Socket.IO comme moteur WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(4000);
}
bootstrap();
