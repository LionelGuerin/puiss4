// src/App.tsx
import { useState, useEffect } from "react";
import Board from "./components/Board/Board";
import RoomInfo from "./components/RoomInfo/RoomInfo";
import { useRoom } from "./hooks/useRoom";
import type { Player, StartGameResponse, MoveResponse } from "./types.ts";
import "./App.css";

export default function App() {
  const [me, setMe] = useState<Player | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const { board, room, loading, pdfReady } = useRoom(roomId);

  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch("/api/me");
      const data: Player = await res.json();
      setRoomId(data.roomId || null);
      setMe(data);
    };
    fetchMe();
  }, []);

  const startGame = async () => {
    console.log("Démarrage du jeu pour :", me);
    if (!me?.name?.trim()) {
      alert("Entre ton nom avant de commencer !");
      return;
    }

    const res = await fetch("/api/start", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: me.name }),
      method: "POST",
    });
    const data: StartGameResponse = await res.json();
    setMe((prev) => (prev ? { ...prev, color: data.color } : null));
    setRoomId(data.roomId);
  };

  const play = async (col: number) => {
    if (!room || room.status === "ENDED" || room.turn !== me?.color) return;

    const res = await fetch("/api/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, column: col }),
    });
    const json: MoveResponse = await res.json();
    if (json.error) {
      alert(json.error);
      return;
    }
  };

  return (
    <div className="app-container">
      <h1>Puissance 4</h1>

      <RoomInfo me={me} room={room} />

      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Ton nom..."
          value={me?.name || ""}
          onChange={(e) =>
            setMe((prev) => (prev ? { ...prev, name: e.target.value } : null))
          }
          disabled={!!room}
        />
        <button onClick={startGame} style={{ marginLeft: 10 }}>
          Commencer
        </button>
      </div>

      {!loading && (
        <Board
          board={board}
          onPlay={play}
          disabled={room?.status === "ENDED" || room?.turn !== me?.color}
          room={room}
          pdfReady={pdfReady}
        />
      )}
    </div>
  );
}