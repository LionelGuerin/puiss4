import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Room) private roomModel: typeof Room,
    @InjectModel(Cell) private cellModel: typeof Cell,
  ) {}

  // Cette méthode remplace ta logique Express
  async getRoomIso(id: string) {
    // 1. Récupération DB (identique à ton code Express)
    const room = await this.roomModel.findByPk(id, {
      include: [
        {
          model: Player,
          as: 'winner', // Assure-toi que l'alias correspond à ton setup Sequelize
          attributes: ['id', 'name', 'color'],
        },
      ],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // 2. Appel de la logique de transformation
    const board = await this.makeBoard(room.id);

    // 3. Retour au format EXACT attendu par React
    return {
      id: room.id,
      turn: room.turn,
      status: room.status,
      winner: room.winner ? room.winner.name : null, // On renvoie le nom comme avant
      board: board,
    };
  }

  private async makeBoard(roomId: string): Promise<string[][]> {
    const cells = await this.cellModel.findAll({ where: { roomId } });
    // console.log(`Cells fetched for room ${roomId}:`, cells);
    // Initialise le tableau (Lignes 0-5, Cols 0-6)
    const board = Array(6)
      .fill(null)
      .map(() => Array(7).fill(null));

    cells.forEach((cell) => {
      // 1. Sécurisation des types (au cas où SQLite renvoie des strings)
      // console.log(
      //   `Processing: Row ${cell.row}, Col ${cell.col}, Color ${cell.color}`,
      // );
      const r = Number(cell.row);
      const c = Number(cell.col);

      // 2. DEBUG : Si ça plante, tu verras la dernière valeur affichée
      // console.log(`Tentative insertion : Row ${r}, Col ${c}, Color ${cell.color}`);

      // 3. Vérification de sécurité
      if (!board[r]) {
        // console.error(          `❌ CRASH ÉVITÉ : La ligne ${r} n'existe pas dans le board (Max 5) !`,        );
        return; // On saute cette cellule corrompue
      }

      board[r][c] = cell.color;
    });

    return board;
  }
}
