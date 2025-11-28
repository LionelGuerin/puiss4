import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  HttpStatus,
  HttpException,
  Param,
} from '@nestjs/common';
import { GameService } from './game.service';
import type { RequestWithPlayer } from './interfaces/game.interface';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';

// DTOs
import { StartGameDto } from './dto/start-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

// Modèles (Nécessaires pour le typage dans le HTML de debug)
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
  async start(@Body() dto: StartGameDto, @Req() req: RequestWithPlayer) {
    const playerId = req.playerId || uuidv4();
    // Toute la logique de création/join est déléguée au service
    return this.gameService.startGame(playerId, dto.name);
  }

  // ----------------------------------------------------------------------
  // ROUTE POST /move
  // ----------------------------------------------------------------------
  @Post('move')
  async move(@Body() dto: MakeMoveDto, @Req() req: RequestWithPlayer) {
    const playerId = req.playerId;
    if (!playerId) {
      throw new HttpException(
        { error: 'Player ID missing' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      // Le service gère les vérifications (Room, Tour, Victoire)
      await this.gameService.makeMove(playerId, dto.roomId, dto.column);
      return { success: true };
    } catch (err: any) {
      // On laisse passer les exceptions HTTP NestJS (BadRequest, NotFound...)
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
  async getMe(@Req() req: RequestWithPlayer) {
    const playerId = req.playerId;
    if (!playerId)
      throw new HttpException(
        { error: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );

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

    // Votre HTML exact
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
