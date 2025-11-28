import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  HttpStatus,
  HttpException,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { GameService } from './game.service';

// DTOs
import { StartGameDto } from './dto/start-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

// Outils Architecture (Guard & Decorator)
import { PlayerGuard } from './guards/player.guard';
import { PlayerId } from './decorators/player-id.decorator';

// Modèles (Pour le HTML de debug)
import { Player } from './models/player.model';
import { Room } from './models/room.model';
import { Cell } from './models/cell.model';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ----------------------------------------------------------------------
  // ROUTE POST /start
  // ----------------------------------------------------------------------
  @Post('start')
  // Pas de PlayerGuard ici car c'est la seule route accessible sans ID (création)
  async start(
    @Body() dto: StartGameDto,
    @PlayerId() playerId: string | undefined,
  ) {
    // Si pas d'ID (nouveau joueur), on en génère un
    const id = playerId || uuidv4();
    return this.gameService.startGame(id, dto.name);
  }

  // ----------------------------------------------------------------------
  // ROUTE POST /move
  // ----------------------------------------------------------------------
  @Post('move')
  @UseGuards(PlayerGuard) // Bloque automatiquement si pas d'ID
  async move(@Body() dto: MakeMoveDto, @PlayerId() playerId: string) {
    try {
      // playerId est garanti d'être une string grâce au Guard
      await this.gameService.makeMove(playerId, dto.roomId, dto.column);
      return { success: true };
    } catch (err: any) {
      console.log('❌ ERREUR MOVE:', err);
      console.log('📥 DTO REÇU:', dto);
      console.log('👤 JOUEUR:', playerId);
      // On laisse passer les exceptions HTTP NestJS (BadRequest, NotFound...)
      // levées par le Service
      if (err instanceof HttpException) throw err;

      console.error(err);
      throw new HttpException(
        { error: 'Server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------------------------------------------------------------
  // ROUTE POST /reset
  // ----------------------------------------------------------------------
  @Post('reset')
  async reset() {
    await this.gameService.resetAll();
    return { success: true, message: 'Database reset complete' };
  }

  // ----------------------------------------------------------------------
  // ROUTE GET /me
  // ----------------------------------------------------------------------
  @Get('me')
  @UseGuards(PlayerGuard)
  async getMe(@PlayerId() playerId: string) {
    const p = await this.gameService.getPlayer(playerId);

    if (!p) return { id: playerId, exists: false };

    return {
      id: p.id,
      color: p.color,
      roomId: p.roomId,
      name: p.name,
      exists: true,
    };
  }

  // ----------------------------------------------------------------------
  // ROUTE GET /room/:id
  // ----------------------------------------------------------------------
  @Get('room/:id')
  async getRoomState(@Param('id') id: string) {
    const roomData = await this.gameService.getRoomIso(id);
    if (!roomData) {
      throw new HttpException(
        { error: 'Room not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return roomData;
  }

  // ----------------------------------------------------------------------
  // ROUTE GET /debug/html
  // ----------------------------------------------------------------------
  @Get('debug/html')
  async debugHtml(@Res() res: Response) {
    const data = await this.gameService.getAllData();

    const html = `
     <html>
        <head>
          <title>Debug Puissance 4</title>
          <style>
            body { font-family:sans-serif; padding:20px; }
            table { border-collapse: collapse; margin-bottom:20px; }
            th,td { border:1px solid #333; padding:5px; text-align:center; }
            th { background:#eee; }
          </style>
        </head>
        <body>
          <h1>Debug Puissance 4 (NestJS)</h1>
          
          <h2>Players</h2>
          <table>
            <tr><th>id</th><th>name</th><th>color</th><th>roomId</th></tr>
            ${data.players.map((p: Player) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.color || ''}</td><td>${p.roomId || ''}</td></tr>`).join('')}
          </table>
          
          <h2>Rooms</h2>
          <table>
            <tr><th>id</th><th>turn</th><th>status</th><th>winner</th></tr>
            ${data.rooms.map((r: Room) => `<tr><td>${r.id}</td><td>${r.turn || ''}</td><td>${r.status}</td><td>${r.winnerPlayerId || ''}</td></tr>`).join('')}
          </table>
          
          <h2>Cells</h2>
          <table>
            <tr><th>roomId</th><th>row</th><th>col</th><th>color</th></tr>
            ${data.cells.map((c: Cell) => `<tr><td>${c.roomId}</td><td>${c.row}</td><td>${c.col}</td><td>${c.color}</td></tr>`).join('')}
          </table>
        </body>
      </html>
    `;
    res.send(html);
  }
}
