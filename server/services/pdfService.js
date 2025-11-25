import fs from "fs";
import path from "path";
import {
  fileURLToPath
} from "url";

const __dirname = path.dirname(fileURLToPath(
  import.meta.url));

export function getPdfPath(roomId) {
  return path.resolve(__dirname, "../../pdf_exports", `room_${roomId}.pdf`);
}

export function pdfExists(roomId) {
  return fs.existsSync(getPdfPath(roomId));
}