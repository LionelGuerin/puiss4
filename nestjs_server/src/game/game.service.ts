import { Injectable, Inject, Logger } from '@nestjs/common';
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
  // MÉTHODES PUBLIQUES (WRAPPERS DB) - Pour le Contrôleur
  // =================================================================

  async findPlayer(id: string) {
    // Si la recherche ne donne rien, Sequelize renvoie null
    return this.playerModel.findByPk(id);
  }

  async findRoom(id: string) {
    return this.roomModel.findByPk(id);
  }

  async createPlayer(data: Partial<Player>) {
    return this.playerModel.create(data);
  }

  async createRoom(data: Partial<Room>) {
    return this.roomModel.create(data);
  }

  // Wrapper pour findOne avec conditions (utilisé pour le jumelage)
  async findPlayerInRoom(roomId: string) {
    return this.playerModel.findOne({ where: { roomId } });
  }

  // Wrappers de destruction
  async destroyRoom(roomId: string) {
    return this.roomModel.destroy({ where: { id: roomId } });
  }
  async resetAll() {
    await this.cellModel.destroy({ where: {} });
    await this.roomModel.destroy({ where: {} });
    await this.playerModel.destroy({ where: {} });
  }

  // Wrapper pour debug
  async getAllData() {
    return {
      players: await this.playerModel.findAll({ raw: true }),
      rooms: await this.roomModel.findAll({ raw: true }),
      cells: await this.cellModel.findAll({ raw: true }),
    };
  }

  // =================================================================
  // LOGIQUE DE JEU (MIGRATION EXPRESS)
  // =================================================================

  /** Logique complexe de recherche d'une room avec 1 seul joueur */
  async findRoomWithOnePlayer(): Promise<{
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
    // Casting nécessaire car Sequelize raw retourne un type générique
    return result as unknown as { roomId: string; playerCount: number } | null;
  }

  /** Convertit les cellules DB en tableau 2D 6x7 */
  async makeBoard(roomId: string): Promise<(PlayerColor | null)[][]> {
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

  /** Gère la gravité et l'insertion du jeton */
  async dropInColumn(roomId: string, column: number, color: PlayerColor) {
    const tokensInColumn = await this.cellModel.count({
      where: { roomId, col: column },
    });

    if (tokensInColumn >= 6) return null; // Colonne pleine

    const row = 5 - tokensInColumn; // Gravité: 5 = bas, 0 = haut

    const cell = await this.cellModel.create({
      row,
      col: column,
      color,
      roomId,
    });

    return { row: cell.row, col: cell.col };
  }

  /** Algorithme de victoire (4 directions) */
  checkWinner(
    board: (PlayerColor | null)[][],
    r: number,
    c: number,
    color: PlayerColor,
  ): boolean {
    const R = 6;
    const C = 7;
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diag Bas-Droite
      [1, -1], // Diag Bas-Gauche
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      // Sens positif
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color)
          count++;
        else break;
      }
      // Sens négatif
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color)
          count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  }

  /** Orchestre le coup, la victoire et la notification WebSocket */
  async processMove(room: Room, player: Player, column: number) {
    // 1. Jouer le coup
    const pos = await this.dropInColumn(
      room.id,
      column,
      player.color as PlayerColor,
    );
    if (!pos) throw new Error('Column full');

    // 2. Analyser le plateau
    const board = await this.makeBoard(room.id);
    const won = this.checkWinner(
      board,
      pos.row,
      pos.col,
      player.color as PlayerColor,
    );

    // 3. Mettre à jour la Room
    if (won) {
      room.status = GameStatus.ENDED;
      room.winnerPlayerId = player.id; // On stocke l'ID
      // Note: notifyGameEnded était juste un log ou un emit dans Express
      this.logger.log(`Game ${room.id} ended. Winner: ${player.name}`);
    } else {
      room.turn =
        (room.turn as PlayerColor) === PlayerColor.YELLOW
          ? PlayerColor.RED
          : PlayerColor.YELLOW;
      room.status = GameStatus.PLAYING;
    }
    await room.save();

    // 4. Préparer le payload
    const payload: GamePayload = {
      roomId: room.id,
      board,
      turn: room.turn as PlayerColor,
      status: room.status as GameStatus,
      // Express envoyait 'player.name' si gagnant, sinon null
      winner: room.winnerPlayerId ? player.name : null,
    };

    // 5. Notifier via Gateway
    this.gameGateway.emitBoardUpdate(room.id, payload);

    return payload;
  }
}
