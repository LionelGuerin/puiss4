import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize'; // <--- IMPORTANT
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';

@Module({
  imports: [
    // C'est ici qu'on active les modèles pour ce module
    SequelizeModule.forFeature([Room, Player, Cell]),
  ],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
