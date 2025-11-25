import amqp from "amqplib";
import {
  Cell
} from "../models/Cell.js";

export async function makeBoard(roomId) {
  const cells = await Cell.findAll({
    where: {
      roomId
    },
    raw: true
  });
  const board = Array.from({
    length: 6
  }, () => Array(7).fill(null));
  cells.forEach(c => (board[c.row][c.col] = c.color));
  return board;
}

export async function dropInColumn(roomId, column, color) {
  const cell = await Cell.findOne({
    where: {
      roomId,
      col: column
    },
    order: [
      ["row", "ASC"]
    ]
  });
  const row = cell ? cell.row - 1 : 5;
  if (row < 0) return null;
  await Cell.create({
    roomId,
    row,
    col: column,
    color
  });
  return {
    row,
    col: column
  };
}

function checkDirection(board, startRow, startCol, color, dr, dc) {
  let count = 1;
  const rows = board.length;
  const cols = board[0].length;

  let r = startRow + dr;
  let c = startCol + dc;
  while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === color) {
    count++;
    r += dr;
    c += dc;
  }

  r = startRow - dr;
  c = startCol - dc;
  while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === color) {
    count++;
    r -= dr;
    c -= dc;
  }
  return count >= 4;
}

export async function checkWinner(board, row, col, color) {
  const dirs = [
    [0, 1], // horizontale
    [1, 0], // verticale
    [1, 1], // diagonale descendante (\)
    [1, -1] // diagonale montante (/)
  ];

  const checks = dirs.map(([dr, dc]) =>
    new Promise(resolve => {
      const result = checkDirection(board, row, col, color, dr, dc);
      resolve(result);
    })
  );

  const results = await Promise.all(checks);

  return results.some(r => r === true);
}

export async function notifyGameEnded(roomId) {
  const conn = await amqp.connect("amqp://localhost");
  const ch = await conn.createChannel();
  await ch.assertQueue("game_ended", {
    durable: true
  });
  ch.sendToQueue("game_ended", Buffer.from(JSON.stringify({
    roomId
  })), {
    persistent: true
  });
  await ch.close();
  await conn.close();
}