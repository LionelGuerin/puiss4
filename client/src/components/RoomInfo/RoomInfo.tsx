// src/components/RoomInfo/RoomInfo.tsx
import { Link } from "react-router-dom";
import type { Player, Room } from "../../types";

interface RoomInfoProps {
  me: Player | null;
  room: Room | null;
}

export default function RoomInfo({ me, room }: RoomInfoProps) {
  return (
    <div className="status">
      <p>ID : {me?.id}</p>
      <p>Couleur : {me?.color}</p>
      <p>
        ROOM ID :{" "}
        {room ? (
          <Link
            to={`/room/${room.id}`}
            style={{ color: "blue", textDecoration: "underline" }}
          >
            {room.id}
          </Link>
        ) : (
          "—"
        )}
      </p>
      <p>Tour : {room?.turn}</p>
      <p>Statut : {room?.status}</p>
      {room?.winner && <h2>Gagnant : {room.winner}</h2>}
    </div>
  );
}