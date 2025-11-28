import { Request } from 'express';

// 1. Enums pour éviter les fautes de frappe
export enum PlayerColor {
  RED = 'RED',
  YELLOW = 'YELLOW',
}

export enum GameStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING', // ISO avec ton code Express
  ENDED = 'ENDED',
}

// 2. Extension de l'objet Request pour TypeScript (middleware auth)
export interface RequestWithPlayer extends Request {
  playerId?: string;
}

// 3. Payload envoyé via WebSocket + API room/:id
export interface GamePayload {
  id: string;
  board: (PlayerColor | null)[][];
  turn: PlayerColor;
  status: GameStatus;
  winner: string | null;
}
