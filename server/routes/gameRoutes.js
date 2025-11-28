import express from "express";
import { Player } from "../models/Player.js";
import { Room } from "../models/Room.js";
import { Cell } from "../models/Cell.js";
import { makeBoard, dropInColumn, checkWinner, notifyGameEnded } from "../services/gameService.js";
import { Op, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export default function (io) {
  const router = express.Router();

  router.post("/start", async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === "")
      return res.status(400).json({
        error: "Name required"
      });

    let player = await Player.findByPk(req.playerId);
    if (!player)
      player = await Player.create({
        id: req.playerId,
        name,
        color: null,
        roomId: null
      });
    else {
      player.name = name;
      await player.save();
    }

    if (player.roomId) {
      const old = await Room.findByPk(player.roomId);
      player.roomId = null;
      player.color = null;
      await player.save();
      if (old && old.status === "ENDED") {
        await Room.destroy({
          where: {
            id: old.id
          }
        });
      }
    }

    const roomEntry = await Player.findOne({
      attributes: ["roomId", [Sequelize.fn("COUNT", Sequelize.col("roomId")), "playerCount"]],
      where: {
        roomId: {
          [Op.not]: null
        }
      },
      group: ["roomId"],
      having: Sequelize.literal("COUNT(roomId) = 1"),
      raw: true
    });
    const roomWithOnePlayerId = (roomEntry && roomEntry.roomId) || null;

    let room;
    if (roomWithOnePlayerId) room = await Room.findByPk(roomWithOnePlayerId);

    if (!room) {
      const roomId = uuidv4();
      room = await Room.create({
        id: roomId,
        turn: "YELLOW",
        status: "WAITING",
        winnerPlayerId: null
      });
      player.roomId = room.id;
      player.color = "YELLOW";
      await player.save();
      return res.json({
        roomId: room.id,
        color: "YELLOW",
        turn: "YELLOW",
        status: "WAITING"
      });
    } else {
      const otherPlayer = await Player.findOne({
        where: {
          roomId: room.id
        }
      });
      player.roomId = room.id;
      player.color = otherPlayer && otherPlayer.color === "YELLOW" ? "RED" : "YELLOW";
      room.status = "PLAYING";
      await player.save();
      await room.save();
      return res.json({
        roomId: room.id,
        color: player.color
      });
    }
  });

  router.post("/move", async (req, res) => {
    try {
      const { roomId, column } = req.body;
      const player = await Player.findByPk(req.playerId);
      if (!player || !player.roomId || player.roomId !== roomId)
        return res.status(400).json({
          error: "Not in room"
        });
      const room = await Room.findByPk(roomId);
      if (!room)
        return res.status(404).json({
          error: "Room not found"
        });
      if (room.status === "ENDED")
        return res.status(400).json({
          error: "Ended"
        });
      if (player.color !== room.turn)
        return res.status(400).json({
          error: "Not your turn"
        });

      const pos = await dropInColumn(roomId, column, player.color);
      if (!pos)
        return res.status(400).json({
          error: "Column full"
        });

      const board = await makeBoard(roomId);
      const won = await checkWinner(board, pos.row, pos.col, player.color);
      if (won) {
        room.status = "ENDED";
        room.winnerPlayerId = player.id;
        notifyGameEnded(room.id).catch(console.error);
      } else {
        room.turn = room.turn === "YELLOW" ? "RED" : "YELLOW";
        room.status = "PLAYING";
      }
      await room.save();

      const payload = {
        id: roomId,
        board,
        turn: room.turn,
        status: room.status,
        winner: room.winnerPlayerId ? player.name : null
      };
      io.to(room.id).emit("board_update", payload);
      res.json({
        success: true
      });
    } catch (err) {
      console.error("Move error", err);
      res.status(500).json({
        error: "Server error"
      });
    }
  });

  router.post("/reset", async (req, res) => {
    try {
      await Cell.destroy({
        where: {}
      });
      await Room.destroy({
        where: {}
      });
      await Player.destroy({
        where: {}
      });
      res.json({
        success: true,
        message: "Database reset complete"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Database reset failed"
      });
    }
  });

  router.get("/debug/html", async (req, res) => {
    const players = await Player.findAll({
      raw: true
    });
    const rooms = await Room.findAll({
      raw: true
    });
    const cells = await Cell.findAll({
      raw: true
    });

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
          <h1>Debug Puissance 4</h1>
          <h2>Players</h2>
          <table>
            <tr><th>id</th><th>color</th><th>roomId</th></tr>
            ${players.map(p => `<tr><td>${p.id}</td><td>${p.color || ""}</td><td>${p.roomId || ""}</td></tr>`).join("")}
          </table>
          <h2>Rooms</h2>
          <table>
            <tr><th>id</th><th>turn</th><th>status</th><th>winner</th></tr>
            ${rooms
              .map(
                r =>
                  `<tr><td>${r.id}</td><td>${r.turn || ""}</td><td>${r.status}</td><td>${
                    r.winnerPlayerId || ""
                  }</td></tr>`
              )
              .join("")}
          </table>
          <h2>Cells</h2>
          <table>
            <tr><th>roomId</th><th>row</th><th>col</th><th>color</th></tr>
            ${cells
              .map(c => `<tr><td>${c.roomId}</td><td>${c.row}</td><td>${c.col}</td><td>${c.color}</td></tr>`)
              .join("")}
          </table>
        </body>
      </html>
    `;
    res.send(html);
  });

  return router;
}
