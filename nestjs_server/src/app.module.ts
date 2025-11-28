import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <--- IMPORTS
import { SequelizeModule } from '@nestjs/sequelize';

// Modules
import { GameModule } from './game/game.module';
import { PdfModule } from './pdf/pdf.module';

// Modèles
import { Room } from './game/models/room.model';
import { Player } from './game/models/player.model';
import { Cell } from './game/models/cell.model';

@Module({
  imports: [
    // 1. ConfigModule (Déjà là)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. Base de données ASYNCHRONE
    // On change forRoot en forRootAsync
    SequelizeModule.forRootAsync({
      imports: [ConfigModule], // On importe ConfigModule pour l'utiliser ici
      inject: [ConfigService], // On injecte le service
      useFactory: (configService: ConfigService) => ({
        dialect: 'sqlite',
        storage: 'database.sqlite',
        models: [Room, Player, Cell],
        autoLoadModels: true,
        logging: false,
        synchronize: configService.get<string>('DEV_MODE') === 'true',
      }),
    }),

    // 3. Modules Métier
    GameModule,
    PdfModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
