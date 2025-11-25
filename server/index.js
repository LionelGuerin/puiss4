import express from "express";
import http from "http";
import {
  Server
} from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import {
  sequelize
} from "./config/db.js";

import playerRoutes from "./routes/playerRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import pdfRoutes from "./routes/pdfRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

await sequelize.sync();

app.use(playerRoutes);
app.use(roomRoutes);
app.use(gameRoutes(io));
app.use(pdfRoutes(io));

io.on("connection", (socket) => {
  socket.on("join_room", (roomId) => socket.join(roomId));
});

server.listen(4000, () => console.log("Server running on port 4000"));