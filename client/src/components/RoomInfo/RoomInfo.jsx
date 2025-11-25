import { Link } from "react-router-dom";

export default function RoomInfo({ me, room }) {
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
      {room?.winner && <h2>Gagnant : {room?.winner}</h2>}
    </div>
  );
}
