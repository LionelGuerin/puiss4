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
import { PlayerColor, GameStatus } from './interfaces/game.interface';
import type { RequestWithPlayer } from './interfaces/game.interface';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';

// IMPORTS DTO
import { StartGameDto } from './dto/start-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ----------------------------------------------------------------------
  // ROUTE POST /start
  // ----------------------------------------------------------------------
  @Post('start')
  // On utilise le DTO ici. NestJS validera automatiquement le body avant d'entrer dans la fonction.
  async start(@Body() dto: StartGameDto, @Req() req: RequestWithPlayer) {
    const { name } = dto; // Les données sont garanties valides ici
    const playerId = req.playerId || uuidv4();

    // 1. Gestion du Joueur
    let player = await this.gameService.findPlayer(playerId);

    if (!player) {
      player = await this.gameService.createPlayer({
        id: playerId,
        name,
        color: null,
        roomId: null,
      });
    } else {
      player.name = name;
      await player.save();
    }

    // 2. Nettoyage ancienne room
    if (player.roomId) {
      const oldRoom = await this.gameService.findRoom(player.roomId);
      player.roomId = null;
      player.color = null;
      await player.save();

      if (oldRoom && (oldRoom.status as GameStatus) === GameStatus.ENDED) {
        await this.gameService.destroyRoom(oldRoom.id);
      }
    }

    // 3. Matchmaking
    const roomEntry = await this.gameService.findRoomWithOnePlayer();
    const roomWithOnePlayerId = roomEntry?.roomId || null;

    let room: Room | null = null;
    if (roomWithOnePlayerId) {
      room = await this.gameService.findRoom(roomWithOnePlayerId);
    }

    if (!room) {
      // Création
      const roomId = uuidv4();
      room = await this.gameService.createRoom({
        id: roomId,
        turn: PlayerColor.YELLOW,
        status: GameStatus.WAITING,
        winnerPlayerId: null,
      });

      player.roomId = room.id;
      player.color = PlayerColor.YELLOW;
      await player.save();

      return {
        roomId: room.id,
        color: PlayerColor.YELLOW,
        turn: PlayerColor.YELLOW,
        status: GameStatus.WAITING,
      };
    } else {
      // Rejoindre
      const otherPlayer = await this.gameService.findPlayerInRoom(room.id);
      const myColor =
        otherPlayer && otherPlayer.color === PlayerColor.YELLOW
          ? PlayerColor.RED
          : PlayerColor.YELLOW;

      player.roomId = room.id;
      player.color = myColor;
      await player.save();

      room.status = GameStatus.PLAYING;
      await room.save();

      return {
        roomId: room.id,
        color: player.color,
      };
    }
  }

  // ----------------------------------------------------------------------
  // ROUTE POST /move
  // ----------------------------------------------------------------------
  @Post('move')
  async move(@Body() dto: MakeMoveDto, @Req() req: RequestWithPlayer) {
    try {
      const { roomId, column } = dto; // Typé et validé !
      const playerId = req.playerId;

      if (!playerId) {
        throw new HttpException(
          { error: 'Player ID missing' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const player = await this.gameService.findPlayer(playerId);
      if (!player || !player.roomId || player.roomId !== roomId) {
        throw new HttpException(
          { error: 'Not in room' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const room = await this.gameService.findRoom(roomId);
      if (!room) {
        throw new HttpException(
          { error: 'Room not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      if ((room.status as GameStatus) === GameStatus.ENDED) {
        throw new HttpException({ error: 'Ended' }, HttpStatus.BAD_REQUEST);
      }
      if (player.color !== room.turn) {
        throw new HttpException(
          { error: 'Not your turn' },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.gameService.processMove(room, player, column);

      return { success: true };
    } catch (err: unknown) {
      console.error('Move error', err);
      if (err instanceof Error && err.message === 'Column full') {
        throw new HttpException(
          { error: 'Column full' },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
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
    try {
      await this.gameService.resetAll();
      return { success: true, message: 'Database reset complete' };
    } catch (err) {
      console.error('Reset error', err);
      throw new HttpException(
        { error: 'Database reset failed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

    const p = await this.gameService.findPlayer(playerId);
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
    // Note: Pour récupérer l'ID, on utilise @Param('id') id: string
    // J'ai corrigé ci-dessous pour inclure Param
    try {
      const roomData = await this.gameService.getRoomIso(id);
      if (!roomData)
        throw new HttpException(
          { error: 'Room not found' },
          HttpStatus.NOT_FOUND,
        );
      return roomData;
    } catch (err) {
      console.error('Get room error', err);
      throw new HttpException(
        { error: 'Server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------------------------------------------------------------
  // ROUTE GET /debug/html
  // ----------------------------------------------------------------------
  @Get('debug/html')
  async debugHtml(@Res() res: Response) {
    const data = await this.gameService.getAllData();
    // ... (Ton code HTML ici, inchangé pour la lisibilité)
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
