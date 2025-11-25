import express from "express";
import {
  pdfExists,
  getPdfPath
} from "../services/pdfService.js";

export default function (io) {
  const router = express.Router();

  router.get("/download/:roomId", (req, res) => {
    const {
      roomId
    } = req.params;
    const file = getPdfPath(roomId);
    if (!pdfExists(roomId)) return res.status(404).send("PDF not found");
    res.download(file, `room_${roomId}.pdf`, (err) => {
      if (err) console.error("Download error:", err);
    });
  });

  router.post("/api/pdf-ready", (req, res) => {
    const {
      roomId
    } = req.body;
    io.to(roomId).emit("pdf_ready", {
      roomId
    });
    res.sendStatus(200);
  });

  router.get("/pdf/status/:roomId", (req, res) => {
    const {
      roomId
    } = req.params;
    try {
      res.json({
        exists: pdfExists(roomId)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Internal Server Error"
      });
    }
  });

  return router;
};