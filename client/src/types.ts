// src/types.ts

export type CellValue = "YELLOW" | "RED" | null;
export type Board = CellValue[][];

export type GameStatus = "WAITING" | "IN_PROGRESS" | "ENDED";
export type PlayerColor = "YELLOW" | "RED";

export interface Player {
  id: string;
  name: string;
  color?: PlayerColor;
  roomId?: string;
}

export interface Room {
  id: string;
  turn: PlayerColor;
  status: GameStatus;
  winner?: PlayerColor | null;
  board: Board;
}

export interface MoveRequest {
  roomId: string;
  column: number;
}

export interface MoveResponse {
  board: Board;
  turn: PlayerColor;
  status: GameStatus;
  winner?: PlayerColor | null;
  error?: string;
}

export interface StartGameResponse {
  color: PlayerColor;
  roomId: string;
}

export interface BoardUpdatePayload {
  id: string;
  board: Board;
  turn: PlayerColor;
  status: GameStatus;
  winner?: PlayerColor | null;
}

export interface PDFReadyPayload {
  roomId: string;
}

export interface PDFStatusResponse {
  exists: boolean;
}