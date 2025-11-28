import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // <--- IMPORT
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly PDF_EXPORT_DIR: string;

  constructor(private configService: ConfigService) {
    // 1. Récupérer le chemin relatif depuis .env
    const relativePath =
      this.configService.get<string>('PDF_EXPORT_RELATIVE_PATH') ||
      '../pdf_exports';

    // 2. Résoudre le chemin absolu
    this.PDF_EXPORT_DIR = path.resolve(process.cwd(), relativePath);

    // 3. Création du dossier si inexistant
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
