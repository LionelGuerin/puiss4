import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PdfService } from './pdf.service';
import { GameGateway } from '../game/game.gateway'; // Accès au Gateway pour l'émission Socket
import type { Response } from 'express';

@Controller()
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    // On injecte le GameGateway pour pouvoir émettre l'événement
    private readonly gameGateway: GameGateway,
  ) {}

  // ----------------------------------------------------------------------
  // ROUTE GET /pdf/status/:roomId
  // ----------------------------------------------------------------------

  @Get('pdf/status/:roomId')
  getStatus(@Param('roomId') roomId: string) {
    try {
      // Remplacement du res.json Express
      return {
        exists: this.pdfService.pdfExists(roomId),
      };
    } catch (err) {
      console.error(err);
      throw new HttpException(
        { error: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------------------------------------------------------------
  // ROUTE POST /api/pdf-ready
  // ----------------------------------------------------------------------

  @Post('/api/pdf-ready')
  postPdfReady(@Body() body: { roomId: string }) {
    const { roomId } = body;
    console.log('PDF ready for room:', roomId);
    // Remplacement de io.to(roomId).emit("pdf_ready", {...});
    this.gameGateway.server.to(roomId).emit('pdf_ready', { roomId });

    // Remplacement de res.sendStatus(200);
    return; // NestJS renvoie 200 OK par défaut si pas de réponse
  }

  // ----------------------------------------------------------------------
  // ROUTE GET /download/:roomId
  // ----------------------------------------------------------------------

  // Pour utiliser res.download, on doit injecter l'objet Response d'Express avec @Res()
  @Get('download/:roomId')
  downloadPdf(@Param('roomId') roomId: string, @Res() res: Response) {
    const file = this.pdfService.getPdfPath(roomId);

    if (!this.pdfService.pdfExists(roomId)) {
      return res.status(404).send('PDF not found');
    }

    // Remplacement de res.download
    res.download(file, `room_${roomId}.pdf`, (err) => {
      if (err) {
        console.error('Download error:', err);
        // Si la réponse n'a pas été envoyée, NestJS peut renvoyer une erreur 500
        if (!res.headersSent) {
          res.status(500).send('Error initiating download.');
        }
      }
    });
  }
}
