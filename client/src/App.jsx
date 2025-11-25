import { useState, useEffect } from "react";
import Board from "./components/Board/Board.jsx";
import RoomInfo from "./components/RoomInfo/RoomInfo";
import { useRoom } from "./hooks/useRoom";
import "./App.css";

export default function App() {
  const [me, setMe] = useState(null);
  const [roomId, setRoomId] = useState(null);

  const { board, room, loading, pdfReady } = useRoom(roomId);

  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch("/api/me");
      const data = await res.json();
      setRoomId(data.roomId);
      setMe(data);
    };
    fetchMe();
  }, []);

  const startGame = async () => {
    console.log("Démarrage du jeu pour :", me);
    if (!me.name.trim()) return alert("Entre ton nom avant de commencer !");
    const res = await fetch("/api/start", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: me.name }),
      method: "POST",
    });
    const data = await res.json();
    setMe((prev) => ({ ...prev, color: data.color }));
    setRoomId(data.roomId);
  };

  const play = async (col) => {
    if (!room || room.status === "ENDED" || room.turn !== me?.color) return;
    const res = await fetch("/api/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, column: col }),
    });
    const json = await res.json();
    if (json.error) return alert(json.error);
    // setBoard(json.board);
    // console.log("Mise à jour du tour :", json);
    // setRoom((prev) => {
    //   console.log("Mise à jour du room :", prev);
    //   return { ...prev, turn: json.turn, status: json.status };
    // });
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
          onChange={(e) => setMe((prev) => ({ ...prev, name: e.target.value }))}
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
