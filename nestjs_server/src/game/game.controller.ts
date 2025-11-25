import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from './game.service';

// ATTENTION : Si ton Express était sur "/room/:id", ici on met 'room'
@Controller('room')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':id')
  async getRoom(@Param('id') id: string) {
    // On appelle le service qui renvoie déjà le JSON formaté pour React
    return this.gameService.getRoomIso(id);
  }
}
