import { useParams } from "react-router-dom";
import Board from "./components/Board/Board";
import { useRoom } from "./hooks/useRoom";

export default function Room() {
  const { id } = useParams();
  const { board, room, loading, pdfReady } = useRoom(id);

  if (loading) return <p>Chargement de la room...</p>;

  return (
    <div>
      <h2>Spectateur : Room {id}</h2>
      {room.winner && <h3>Gagnant : {room.winner}</h3>}
      <Board board={board} specmode={true} room={room} pdfReady={pdfReady} />
    </div>
  );
}
