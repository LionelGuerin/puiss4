// src/hooks/useRoom.tsx
import { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";
import type { Board, Room, BoardUpdatePayload, PDFReadyPayload, PDFStatusResponse } from "../types";

const socket: Socket = io("http://localhost:4000", { transports: ["websocket"] });

interface UseRoomReturn {
  board: Board;
  room: Room | null;
  loading: boolean;
  setBoard: React.Dispatch<React.SetStateAction<Board>>;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  pdfReady: boolean;
}

export function useRoom(roomId: string | null): UseRoomReturn {
  const [board, setBoard] = useState<Board>(
    Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => null))
  );
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    const handlePDFReady = (payload: PDFReadyPayload) => {
      if (payload.roomId === roomId) {
        console.log(`PDF ready for room ${roomId}`);
        setPdfReady(true);
      }
    };

    socket.on("pdf_ready", handlePDFReady);
    return () => {
      socket.off("pdf_ready", handlePDFReady);
    };
  }, [roomId]);

  useEffect(() => {
    const checkPdf = async () => {
      try {
        const res = await fetch(`/api/pdf/status/${roomId}`);
        const data: PDFStatusResponse = await res.json();
        setPdfReady(data.exists);
      } catch (err) {
        console.error("Error checking PDF:", err);
      }
    };

    if (room?.status === "ENDED") {
      checkPdf();
    } else {
      setPdfReady(false);
    }
  }, [roomId, room?.status]);

  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        const data: Room = await res.json();
        setBoard(data.board);
        setRoom(data);
        setLoading(false);
        socket.emit("join_room", roomId);
      } catch (err) {
        console.error("Fetch room error:", err);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const handleUpdate = (payload: BoardUpdatePayload) => {
      if (payload.id !== roomId) return;
      console.log("Received update for room:", payload);
      setBoard(payload.board);
      setRoom((prev) => ({
        ...prev!,
        id: roomId,
        turn: payload.turn,
        status: payload.status,
        winner: payload.winner || null,
        board: payload.board,
      }));
    };

    socket.on("board_update", handleUpdate);
    return () => {
      socket.off("board_update", handleUpdate);
    };
  }, [roomId]);

  return { board, room, loading, setBoard, setRoom, pdfReady };
}