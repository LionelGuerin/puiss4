import express from "express";
import {
  Player
} from "../models/Player.js";
import {
  v4 as uuidv4
} from "uuid";

const router = express.Router();

router.use((req, res, next) => {
  if (!req.cookies.playerId) {
    const id = uuidv4();
    res.cookie("playerId", id, {
      httpOnly: true
    });
    req.playerId = id;
  } else {
    req.playerId = req.cookies.playerId;
  }
  next();
});

router.get("/me", async (req, res) => {
  const p = await Player.findByPk(req.playerId);
  if (!p) return res.json({
    id: req.playerId,
    exists: false
  });
  res.json({
    id: p.id,
    color: p.color,
    roomId: p.roomId,
    name: p.name,
    exists: true
  });
});

export default router;