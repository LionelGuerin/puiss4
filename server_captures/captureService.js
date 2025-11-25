import puppeteer from "puppeteer";

const FRONT_URL = "http://localhost:5173";

export async function captureRoomPDF(roomId, outputPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 595,
      height: 842
    });

    await page.goto(`${FRONT_URL}/room/${roomId}`, {
      waitUntil: "networkidle0"
    });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true
    });

    console.log(`PDF captured for room ${roomId} at ${outputPath}`);
  } finally {
    await browser.close();
  }
}