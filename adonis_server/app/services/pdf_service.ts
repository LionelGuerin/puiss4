import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import * as fs from 'node:fs'
import * as path from 'node:path'

export default class PdfService {
  private readonly PDF_EXPORT_DIR: string

  constructor() {
    // 1. Récupérer le chemin relatif depuis .env
    const relativePath = env.get('PDF_EXPORT_RELATIVE_PATH', '../pdf_exports')

    // 2. Résoudre le chemin absolu
    this.PDF_EXPORT_DIR = path.resolve(process.cwd(), relativePath)

    // 3. Création du dossier si inexistant
    if (!fs.existsSync(this.PDF_EXPORT_DIR)) {
      fs.mkdirSync(this.PDF_EXPORT_DIR, { recursive: true })
      logger.info(`Created PDF export directory: ${this.PDF_EXPORT_DIR}`)
    }
  }

  getPdfPath(roomId: string): string {
    return path.join(this.PDF_EXPORT_DIR, `room_${roomId}.pdf`)
  }

  pdfExists(roomId: string): boolean {
    const filePath = this.getPdfPath(roomId)
    try {
      return fs.existsSync(filePath)
    } catch (e) {
      logger.error(`Error checking PDF existence for ${roomId}:`, e)
      return false
    }
  }
}
