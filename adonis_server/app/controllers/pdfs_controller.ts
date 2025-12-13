import type { HttpContext } from '@adonisjs/core/http'
import PdfService from '#services/pdf_service'
import transmit from '@adonisjs/transmit/services/main'

export default class PdfController {
  private pdfService = new PdfService()

  /**
   * GET /pdf/status/:roomId
   */
  async getStatus({ params }: HttpContext) {
    try {
      return {
        exists: this.pdfService.pdfExists(params.roomId),
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  /**
   * POST /api/pdf-ready
   */
  async postPdfReady({ request, response }: HttpContext) {
    const { roomId } = request.only(['roomId'])
    console.log('PDF ready for room:', roomId)

    // Émettre via Transmit
    transmit.broadcast(`room/${roomId}/pdf_ready`, JSON.parse(JSON.stringify({ roomId })))

    return response.noContent()
  }

  /**
   * GET /download/:roomId
   */
  async downloadPdf({ params, response }: HttpContext) {
    const file = this.pdfService.getPdfPath(params.roomId)

    if (!this.pdfService.pdfExists(params.roomId)) {
      return response.notFound('PDF not found')
    }

    return response.download(file)
  }
}
