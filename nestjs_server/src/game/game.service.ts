import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Room } from './models/room.model';
import { Player } from './models/player.model';
import { Cell } from './models/cell.model';
import { v4 as uuidv4 } from 'uuid';
import { PlayerColor, GameStatus } from './interfaces/game.interface';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Room) private roomModel: typeof Room,
    @InjectModel(Player) private playerModel: typeof Player,
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

  private async makeBoard(roomId: string): Promise<(PlayerColor | null)[][]> {
    const cells = await this.cellModel.findAll({ where: { roomId } });
    // console.log(`Cells fetched for room ${roomId}:`, cells);
    // Initialise le tableau (Lignes 0-5, Cols 0-6)
    const board: (PlayerColor | null)[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null),
    );

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

      board[r][c] = cell.color as PlayerColor;
    });

    return board;
  }

  async createGame() {
    // 1. Générer les IDs
    const roomId = uuidv4();
    const player1Id = uuidv4();
    const player2Id = uuidv4();

    // 2. Créer la Room
    await this.roomModel.create({
      id: roomId,
      turn: PlayerColor.RED, // Les rouges commencent toujours
      status: GameStatus.IN_PROGRESS,
    });

    // 3. Créer les Joueurs
    // Joueur 1 (Rouge)
    await this.playerModel.create({
      id: player1Id,
      name: 'Player Red', // Tu pourras rendre ça dynamique plus tard
      color: PlayerColor.RED,
      roomId: roomId,
    });

    // Joueur 2 (Jaune)
    await this.playerModel.create({
      id: player2Id,
      name: 'Player Yellow',
      color: PlayerColor.YELLOW,
      roomId: roomId,
    });

    // 4. On renvoie l'objet formaté (réutilisation de ta méthode existante !)
    return this.getRoomIso(roomId);
  }

  // On prend l'ID de la room et la colonne jouée (0 à 6)
  async playMove(roomId: string, col: number) {
    // 1. Récupérer la room pour vérifier le tour et le statut
    const room = await this.roomModel.findByPk(roomId);
    if (!room) throw new NotFoundException('Room not found');
    if ((room.status as GameStatus) !== GameStatus.IN_PROGRESS) {
      throw new Error('Game is over');
    }

    // 2. CALCUL DE LA GRAVITÉ
    // On compte combien de cellules existent déjà dans cette colonne pour cette room
    const tokensInColumn = await this.cellModel.count({
      where: { roomId: roomId, col: col },
    });

    if (tokensInColumn >= 6) {
      throw new Error('Column is full'); // Ou HttpException
    }

    // Si 0 jetons, on veut la ligne 5 (bas). Si 1 jeton, ligne 4.
    const row = 5 - tokensInColumn;
    const currentColor = room.turn as PlayerColor;

    // 3. CRÉATION DU JETON (CELL)
    await this.cellModel.create({
      row: row,
      col: col,
      color: currentColor, // La couleur est celle du tour actuel
      roomId: roomId,
    });

    // 4. VERIFIER LA VICTOIRE (On le fera à l'étape suivante)
    const board = await this.makeBoard(roomId);

    // 2. On vérifie si ce coup est gagnant
    const isWinner = this.checkWin(board, row, col, currentColor);

    let nextTurn = currentColor;
    let newStatus = GameStatus.IN_PROGRESS;
    let winnerId: string | null = null;

    if (isWinner) {
      newStatus = GameStatus.ENDED;
      // Il faut trouver l'ID du joueur pour stocker le gagnant dans la Room
      const winnerPlayer = await this.playerModel.findOne({
        where: { roomId: roomId, color: currentColor },
      });
      winnerId = winnerPlayer ? winnerPlayer.id : null;
    } else {
      // S'il n'y a pas de gagnant, on change de tour
      nextTurn =
        currentColor === PlayerColor.RED ? PlayerColor.YELLOW : PlayerColor.RED;
      // TODO: Gérer le match nul (si le tableau est plein)
    }

    // Mise à jour de la room (status, tour, et gagnant si applicable)
    await room.update({
      turn: nextTurn,
      status: newStatus,
      winner: winnerId, // La colonne winner dans ta DB (qui stocke l'ID)
    });

    // Renvoyer l'état du jeu mis à jour
    return this.getRoomIso(roomId);
  }

  private checkWin(
    board: (PlayerColor | null)[][],
    r: number,
    c: number,
    color: PlayerColor,
  ): boolean {
    const R = 6; // Nombre de lignes
    const C = 7; // Nombre de colonnes
    const directions = [
      [0, 1], // Horizontale (droite)
      [1, 0], // Verticale (bas)
      [1, 1], // Diagonale bas-droite
      [1, -1], // Diagonale bas-gauche
    ];

    for (const [dr, dc] of directions) {
      // Pour chaque direction, on compte les jetons alignés dans les deux sens (positif et négatif)
      let count = 1; // La pièce jouée compte pour 1

      // Vérification dans le sens POSITIF (ex: Droite, Bas, Bas-Droite)
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color) {
          count++;
        } else {
          break;
        }
      }

      // Vérification dans le sens NÉGATIF (ex: Gauche, Haut, Haut-Gauche)
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        // On vérifie les limites et la couleur
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 4) {
        return true; // Victoire trouvée !
      }
    }

    return false;
  }
}
