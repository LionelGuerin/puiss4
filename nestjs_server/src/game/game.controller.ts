import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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

  @Post() // POST /room
  async createNewGame() {
    return this.gameService.createGame();
  }

  @Post(':id/move')
  async move(@Param('id') id: string, @Body('col', ParseIntPipe) col: number) {
    try {
      return await this.gameService.playMove(id, col);
    } catch (e) {
      // Vérification du type pour satisfaire TypeScript
      let errorMessage: string;

      // Si c'est une instance standard d'Error, on prend son message.
      if (e instanceof Error) {
        errorMessage = e.message;
      } else {
        // Sinon, on le convertit en chaîne de caractères
        errorMessage = String(e);
      }

      // On utilise la chaîne de caractères validée
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
