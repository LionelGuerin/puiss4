import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs'; // Node.js File System
import * as path from 'path'; // Pour gérer les chemins

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // NOTE: Dans un projet Node/NestJS compilé, le chemin est souvent relatif
  // au répertoire de travail (process.cwd()) ou à __dirname de la source compilée.
  // On utilise process.cwd() pour la stabilité.
  private readonly PDF_EXPORT_DIR = path.resolve(
    process.cwd(),
    '..',
    'pdf_exports',
  );

  constructor() {
    // S'assurer que le dossier d'export existe au démarrage
    if (!fs.existsSync(this.PDF_EXPORT_DIR)) {
      fs.mkdirSync(this.PDF_EXPORT_DIR, { recursive: true });
      this.logger.log(`Created PDF export directory: ${this.PDF_EXPORT_DIR}`);
    }
  }

  // Remplacement de getPdfPath(roomId)
  getPdfPath(roomId: string): string {
    // Le chemin est absolu
    return path.join(this.PDF_EXPORT_DIR, `room_${roomId}.pdf`);
  }

  // Remplacement de pdfExists(roomId)
  pdfExists(roomId: string): boolean {
    const filePath = this.getPdfPath(roomId);
    try {
      // Vérifie si le fichier existe
      return fs.existsSync(filePath);
    } catch (e) {
      this.logger.error(`Error checking PDF existence for ${roomId}:`, e);
      return false;
    }
  }
}
