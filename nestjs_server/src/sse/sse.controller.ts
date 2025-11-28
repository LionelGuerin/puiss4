import { Controller, Get, Param, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get(':roomId')
  subscribe(
    @Param('roomId') roomId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // 1. Headers obligatoires pour SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Envoie les headers tout de suite pour garder la ligne ouverte

    // 2. Enregistrement du client
    this.sseService.addClient(roomId, res);

    // 3. Gestion de la déconnexion (Nettoyage)
    // Quand le client ferme l'onglet ou perd la connexion, l'objet req émet 'close'
    req.on('close', () => {
      this.sseService.removeClient(roomId, res);
      res.end();
    });
  }
}
