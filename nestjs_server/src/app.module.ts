import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GameModule } from './game/game.module';
import { Room } from './game/models/room.model';
import { Player } from './game/models/player.model';
import { Cell } from './game/models/cell.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'sqlite', // <--- IMPORTANT : sqlite
      storage: 'database.sqlite', // Le nom du fichier qui sera créé à la racine
      models: [Room, Player, Cell], // Tes modèles
      autoLoadModels: true,
      synchronize: true, // Met à TRUE pour le dev, ça créera les tables automatiquement
    }),
    GameModule,
  ],
})
export class AppModule {}
