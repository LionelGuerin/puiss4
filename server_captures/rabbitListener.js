import amqp from "amqplib";
import fetch from "node-fetch";
import {
  captureRoomPDF
} from "./captureService.js";
import path from "path";
import {
  fileURLToPath
} from "url";

const __filename = fileURLToPath(
  import.meta.url);
const __dirname = path.dirname(__filename);

const RABBIT_URL = "amqp://localhost";
const QUEUE_NAME = "game_ended";
const API_SERVER_URL = "http://localhost:4000"; // ton serveur principal

async function startListener() {
  const conn = await amqp.connect(RABBIT_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, {
    durable: true
  });

  console.log(`Listening for messages on queue "${QUEUE_NAME}"...`);

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        const {
          roomId
        } = payload;
        const outputPath = path.join(__dirname, "../pdf_exports", `room_${roomId}.pdf`);

        console.log(`Generating PDF for room ${roomId}`);
        await captureRoomPDF(roomId, outputPath);

        console.log(`PDF generated for room ${roomId}`);

        await fetch(`${API_SERVER_URL}/api/pdf-ready`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomId
          }),
        });

        channel.ack(msg);
      } catch (err) {
        console.error("Failed to process message:", err);
        channel.nack(msg, false, false);
      }
    }, {
      noAck: false
    }
  );
}

startListener().catch(console.error);