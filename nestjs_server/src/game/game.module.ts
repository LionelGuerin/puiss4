import { SequelizeModule } from '@nestjs/sequelize';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';
import { PlayerMiddleware } from './middlewares/player.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({
  imports: [SequelizeModule.forFeature([Room, Player, Cell])],
  controllers: [GameController],
  providers: [GameService, GameGateway],
})
export class GameModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Applique PlayerMiddleware à toutes les routes (*) de ce module.
    // Il sera exécuté avant GameController.
    consumer.apply(PlayerMiddleware).forRoutes('*');
  }
}
