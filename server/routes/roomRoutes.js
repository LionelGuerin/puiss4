import express from "express";
import {
  Room
} from "../models/Room.js";
import {
  makeBoard
} from "../services/gameService.js";
import {
  Player
} from "../models/Player.js";

const router = express.Router();

router.get("/room/:id", async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{
        model: Player,
        as: "winner", // alias à définir dans ton modèle Room
        attributes: ["id", "name", "color"],
      }, ],
    });
    if (!room) return res.status(404).json({
      error: "Room not found"
    });

    const board = await makeBoard(room.id);

    res.json({
      id: room.id,
      turn: room.turn,
      status: room.status,
      winner: room.winner ? room.winner.name : null,
      board,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error"
    });
  }
});

export default router;