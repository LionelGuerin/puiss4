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

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  async start(@Body() body: { name: string }, @Req() req: RequestWithPlayer) {
    const { name } = body;
    const playerId = req.playerId || uuidv4(); // Récupère du middleware ou génère

    if (!name || name.trim() === '') {
      throw new HttpException(
        { error: 'Name required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 1. Gestion du Joueur (Création ou Mise à jour)
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

    // 2. Gestion de l'ancienne room (Nettoyage)
    if (player.roomId) {
      const oldRoom = await this.gameService.findRoom(player.roomId);
      player.roomId = null;
      player.color = null;
      await player.save();

      // Assertion de type pour status car DB string vs Enum strict
      if (oldRoom && (oldRoom.status as GameStatus) === GameStatus.ENDED) {
        await this.gameService.destroyRoom(oldRoom.id);
      }
    }

    // 3. Logique de Matchmaking (Trouver une room avec 1 joueur)
    const roomEntry = await this.gameService.findRoomWithOnePlayer();
    const roomWithOnePlayerId = roomEntry?.roomId || null;

    let room: Room | null = null;
    if (roomWithOnePlayerId) {
      room = await this.gameService.findRoom(roomWithOnePlayerId);
    }

    if (!room) {
      // CAS 1 : Créer une nouvelle room (WAITING)
      const roomId = uuidv4();
      room = await this.gameService.createRoom({
        id: roomId,
        turn: PlayerColor.YELLOW,
        status: GameStatus.WAITING,
        winnerPlayerId: null, // TypeScript accepte null ici maintenant
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
      // CAS 2 : Rejoindre une room existante (Jumelage)
      const otherPlayer = await this.gameService.findPlayerInRoom(room.id);

      // Assigner la couleur opposée
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

  @Post('move')
  async move(
    @Body() body: { roomId: string; column: number },
    @Req() req: RequestWithPlayer,
  ) {
    try {
      const { roomId, column } = body;
      const playerId = req.playerId; // Type ici : string | undefined

      // 1. SÉCURITÉ TYPESCRIPT CRUCIALE
      // On vérifie immédiatement que l'ID est présent.
      // Cela transforme le type de playerId de 'string | undefined' à 'string' pour la suite.
      if (!playerId) {
        throw new HttpException(
          { error: 'Player ID missing' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 2. Récupération des données via le Service
      // TypeScript accepte maintenant playerId car il est garanti "string"
      const player = await this.gameService.findPlayer(playerId);
      const room = await this.gameService.findRoom(roomId);
      console.log('Debug Move:', { playerId, roomId, column });
      // 3. Validations Métier (Strictement ISO avec ton code Express)
      console.log('Player:', player, 'Room:', room);
      // Vérif Joueur et Room
      if (!player || !player.roomId || player.roomId !== roomId) {
        throw new HttpException(
          { error: 'Not in room' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Vérif Existence Room
      if (!room) {
        throw new HttpException(
          { error: 'Room not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Vérif Status (On cast 'as GameStatus' car Sequelize renvoie une string brute)
      if ((room.status as GameStatus) === GameStatus.ENDED) {
        throw new HttpException({ error: 'Ended' }, HttpStatus.BAD_REQUEST);
      }

      // Vérif Tour
      if (player.color !== room.turn) {
        throw new HttpException(
          { error: 'Not your turn' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. Exécution de la logique de jeu
      // Cette méthode dans le service gère la gravité, la victoire, la sauvegarde DB et le WebSocket.
      await this.gameService.processMove(room, player, column);

      return { success: true };
    } catch (err: unknown) {
      // 'unknown' est plus propre que 'any' en TS strict
      console.error('Move error', err);

      // 1. SÉCURITÉ : On vérifie si c'est bien une instance d'Error avant de lire .message
      if (err instanceof Error && err.message === 'Column full') {
        throw new HttpException(
          { error: 'Column full' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Si c'est déjà une HttpException (levée par nos validations plus haut), on la laisse passer
      if (err instanceof HttpException) {
        throw err;
      }

      // 3. Cas par défaut (Erreur serveur inconnue)
      throw new HttpException(
        { error: 'Server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset')
  async reset() {
    try {
      await this.gameService.resetAll();
      return { success: true, message: 'Database reset complete' };
    } catch (err) {
      console.error(err);
      throw new HttpException(
        { error: 'Database reset failed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('debug/html')
  async debugHtml(@Res() res: Response) {
    // data contient { players: Player[], rooms: Room[], cells: Cell[] }
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

  @Get('me') // GET /me
  async getMe(@Req() req: RequestWithPlayer) {
    // La propriété playerId est maintenant garantie par le PlayerMiddleware
    const playerId = req.playerId;

    // Sécurité: Si le middleware a raté, on renvoie une erreur
    if (!playerId) {
      throw new HttpException(
        { error: 'Player ID missing' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // On utilise le find de notre GameService
    const p = await this.gameService.findPlayer(playerId);

    if (!p) {
      // Le joueur n'existe pas encore dans la base de données (première visite)
      return {
        id: playerId,
        exists: false,
      };
    }

    // Le joueur existe
    return {
      id: p.id,
      color: p.color,
      roomId: p.roomId,
      name: p.name,
      exists: true,
    };
  }

  @Get('room/:id') // GET /room/:id
  async getRoomState(@Param('id') id: string) {
    try {
      const roomData = await this.gameService.getRoomIso(id);

      if (!roomData) {
        // Remplacement du return res.status(404).json({...}) d'Express
        throw new HttpException(
          { error: 'Room not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Remplacement du res.json({...}) d'Express
      return roomData;
    } catch (err) {
      console.error(err);
      // Remplacement du res.status(500).json({...}) d'Express
      throw new HttpException(
        { error: 'Server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
