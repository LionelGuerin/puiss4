// src/game/interfaces/game.interface.ts

// 1. Les Couleurs des joueurs
export enum PlayerColor {
  RED = 'RED',
  YELLOW = 'YELLOW',
}

// 2. Les Statuts possibles de la partie
export enum GameStatus {
  WAITING = 'WAITING', // En attente (si tu gères un lobby plus tard)
  IN_PROGRESS = 'PLAYING', // Partie en cours
  ENDED = 'ENDED', // Partie finie
}

// 3. Le contrat de réponse pour ton Front React (DTO)
export interface GameResponse {
  id: string;
  turn: PlayerColor;
  status: GameStatus;
  winner: string | null;
  board: (PlayerColor | null)[][];
}
