import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import {
  PlayerColor,
  GameStatus,
  GamePayload,
} from './interfaces/game.interface';
import { GameGateway } from './game.gateway';
import { v4 as uuidv4 } from 'uuid';
import * as amqp from 'amqplib';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectModel(Room) private roomModel: typeof Room,
    @InjectModel(Player) private playerModel: typeof Player,
    @InjectModel(Cell) private cellModel: typeof Cell,
    @Inject(Sequelize) private sequelize: Sequelize,
    private gameGateway: GameGateway,
  ) {}

  // =================================================================
  // MÉTHODES PUBLIQUES DE JEU (APPELÉES PAR LE CONTROLEUR)
  // =================================================================

  /**
   * Gère toute la logique de connexion/création de partie
   */
  async startGame(playerId: string, playerName: string) {
    // 1. Récupération ou création du joueur
    let player = await this.playerModel.findByPk(playerId);
    if (!player) {
      player = await this.playerModel.create({
        id: playerId,
        name: playerName,
        color: null,
        roomId: null,
      });
    } else {
      player.name = playerName;
      await player.save();
    }

    // 2. Nettoyage si le joueur était déjà dans une partie finie
    if (player.roomId) {
      const oldRoom = await this.roomModel.findByPk(player.roomId);
      player.roomId = null;
      player.color = null;
      await player.save();

      if (oldRoom && (oldRoom.status as GameStatus) === GameStatus.ENDED) {
        await this.roomModel.destroy({ where: { id: oldRoom.id } });
      }
    }

    // 3. Matchmaking : Chercher une partie avec 1 seul joueur
    const roomEntry = await this.findRoomWithOnePlayer();
    const existingRoomId = roomEntry?.roomId;

    let room: Room | null = null;
    if (existingRoomId) {
      room = await this.roomModel.findByPk(existingRoomId);
    }

    if (!room) {
      // CAS A : Créer une nouvelle Room
      const newRoomId = uuidv4();
      room = await this.roomModel.create({
        id: newRoomId,
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
      // CAS B : Rejoindre la Room existante
      const opponent = await this.playerModel.findOne({
        where: { roomId: room.id },
      });
      const myColor =
        opponent && opponent.color === PlayerColor.YELLOW
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

  /**
   * Gère la logique d'un coup joué
   */
  async makeMove(playerId: string, roomId: string, column: number) {
    const player = await this.playerModel.findByPk(playerId);
    if (!player || player.roomId !== roomId) {
      throw new BadRequestException('Not in room');
    }

    const room = await this.roomModel.findByPk(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if ((room.status as GameStatus) === GameStatus.ENDED) {
      throw new BadRequestException('Ended');
    }
    if (player.color !== room.turn) {
      throw new BadRequestException('Not your turn');
    }

    // Exécution du coup (Logique interne)
    return this.processMoveLogic(room, player, column);
  }

  /**
   * Récupère l'état complet de la room (ISO)
   */
  async getRoomIso(roomId: string): Promise<GamePayload | null> {
    const room = await this.roomModel.findByPk(roomId, {
      include: [
        {
          model: this.playerModel,
          as: 'winnerPlayer',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!room) return null;

    const board = await this.makeBoard(room.id);

    return {
      id: room.id,
      turn: room.turn as PlayerColor,
      status: room.status as GameStatus,
      winner: room.winnerPlayer ? room.winnerPlayer.name : null,
      board,
    };
  }

  /**
   * Réinitialise toute la base de données
   */
  async resetAll() {
    await this.cellModel.destroy({ where: {} });
    await this.roomModel.destroy({ where: {} });
    await this.playerModel.destroy({ where: {} });
  }

  /**
   * Récupère un joueur (Simple wrapper)
   */
  async getPlayer(playerId: string) {
    return this.playerModel.findByPk(playerId);
  }

  // =================================================================
  // LOGIQUE INTERNE (PRIVATE / HELPER)
  // =================================================================

  private async findRoomWithOnePlayer(): Promise<{
    roomId: string;
    playerCount: number;
  } | null> {
    const result = await this.playerModel.findOne({
      attributes: [
        'roomId',
        [
          this.sequelize.fn('COUNT', this.sequelize.col('roomId')),
          'playerCount',
        ],
      ],
      where: { roomId: { [Op.not]: null } },
      group: ['roomId'],
      having: this.sequelize.literal('COUNT(roomId) = 1'),
      raw: true,
    });
    return result as unknown as { roomId: string; playerCount: number } | null;
  }

  private async processMoveLogic(room: Room, player: Player, column: number) {
    // 1. Jouer le jeton
    const pos = await this.dropInColumn(
      room.id,
      column,
      player.color as PlayerColor,
    );
    if (!pos) throw new BadRequestException('Column full'); // NestJS Exception directe

    // 2. Vérifier victoire
    const board = await this.makeBoard(room.id);
    const won = this.checkWinner(
      board,
      pos.row,
      pos.col,
      player.color as PlayerColor,
    );

    // 3. Mise à jour Room
    if (won) {
      room.status = GameStatus.ENDED;
      room.winnerPlayerId = player.id;
      this.notifyGameEnded(room.id).catch((err) => this.logger.error(err));
    } else {
      room.turn =
        (room.turn as PlayerColor) === PlayerColor.YELLOW
          ? PlayerColor.RED
          : PlayerColor.YELLOW;
      room.status = GameStatus.PLAYING;
    }
    await room.save();

    // 4. Notification
    const payload: GamePayload = {
      id: room.id,
      board,
      turn: room.turn as PlayerColor,
      status: room.status as GameStatus,
      winner: room.winnerPlayerId ? player.name : null,
    };

    // WebSocket Emit
    this.gameGateway.emitBoardUpdate(room.id, payload);

    return { success: true };
  }

  private async makeBoard(roomId: string): Promise<(PlayerColor | null)[][]> {
    const cells = await this.cellModel.findAll({ where: { roomId } });
    const board: (PlayerColor | null)[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null),
    );

    cells.forEach((cell) => {
      if (cell.row >= 0 && cell.row < 6 && cell.col >= 0 && cell.col < 7) {
        board[cell.row][cell.col] = cell.color as PlayerColor;
      }
    });
    return board;
  }

  private async dropInColumn(
    roomId: string,
    column: number,
    color: PlayerColor,
  ) {
    const tokensInColumn = await this.cellModel.count({
      where: { roomId, col: column },
    });
    if (tokensInColumn >= 6) return null;

    const row = 5 - tokensInColumn;
    const cell = await this.cellModel.create({
      row,
      col: column,
      color,
      roomId,
    });
    return { row: cell.row, col: cell.col };
  }

  private checkWinner(
    board: (PlayerColor | null)[][],
    r: number,
    c: number,
    color: PlayerColor,
  ): boolean {
    const R = 6;
    const C = 7;
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (
          nr >= 0 &&
          nr < R &&
          nc >= 0 &&
          nc < C &&
          board[nr][nc] !== null &&
          board[nr][nc] === color
        )
          count++;
        else break;
      }
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (
          nr >= 0 &&
          nr < R &&
          nc >= 0 &&
          nc < C &&
          board[nr][nc] !== null &&
          board[nr][nc] === color
        )
          count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  }

  async notifyGameEnded(roomId: string): Promise<void> {
    const AMQP_URL = 'amqp://localhost';
    const QUEUE_NAME = 'game_ended';
    try {
      const conn = await amqp.connect(AMQP_URL);
      const ch = await conn.createChannel();
      await ch.assertQueue(QUEUE_NAME, { durable: true });
      ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ roomId })), {
        persistent: true,
      });
      this.logger.log(`[AMQP] Message for Room ${roomId} sent`);
      await ch.close();
      await conn.close();
    } catch (error) {
      this.logger.error(`[AMQP] Error`, error);
    }
  }

  // Debug Helper
  async getAllData() {
    return {
      players: await this.playerModel.findAll({ raw: true }),
      rooms: await this.roomModel.findAll({ raw: true }),
      cells: await this.cellModel.findAll({ raw: true }),
    };
  }
}
