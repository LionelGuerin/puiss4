// src/components/Board/Board.tsx
import type { Board as BoardType, Room } from "../../types";
import "./Board.css";

interface BoardProps {
  board: BoardType;
  onPlay?: (col: number) => void;
  disabled?: boolean;
  specmode?: boolean;
  room?: Room | null;
  pdfReady?: boolean;
}

export default function Board({
  board,
  onPlay,
  disabled = false,
  specmode = false,
  room,
  pdfReady = false,
}: BoardProps) {
  const handleDownload = async () => {
    if (!room?.id) return;

    try {
      const res = await fetch(`/api/download/${room.id}`);
      if (!res.ok) throw new Error("PDF non disponible");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `room_${room.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur téléchargement PDF:", err);
      alert("Impossible de récupérer le PDF");
    }
  };

  const gameEnded = room?.status === "ENDED";

  return (
    <div className="board-container">
      {!specmode && (
        <div className="controls">
          {[...Array(7).keys()].map((col) => (
            <button
              key={col}
              onClick={() => onPlay && onPlay(col)}
              disabled={disabled || !onPlay}
            >
              ↓
            </button>
          ))}
        </div>
      )}

      <div className="board">
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`cell ${
                cell === "YELLOW" ? "yellow" : cell === "RED" ? "red" : ""
              }`}
            />
          ))
        )}
      </div>

      {gameEnded && !pdfReady && (
        <div className="pdf-loader">
          <div className="spinner" />
          <span>Génération du PDF...</span>
        </div>
      )}
      {gameEnded && pdfReady && (
        <button className="download-btn" onClick={handleDownload}>
          Télécharger PDF
        </button>
      )}
    </div>
  );
}