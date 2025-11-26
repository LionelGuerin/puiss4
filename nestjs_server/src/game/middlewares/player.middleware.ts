import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestWithPlayer } from '../interfaces/game.interface';

// Ajout d'une interface utilitaire pour forcer le typage de req.cookies
interface RequestWithCookies extends RequestWithPlayer {
  // On définit le type exact attendu par le middleware
  cookies: { playerId?: string };
}

@Injectable()
export class PlayerMiddleware implements NestMiddleware {
  use(req: RequestWithCookies, res: Response, next: NextFunction) {
    const existingPlayerId = req.cookies?.playerId;
    console.log(
      'Middleware - Existing Player ID from cookies:',
      existingPlayerId,
    );
    if (!existingPlayerId) {
      const newPlayerId = uuidv4();

      // --- CORRECTION APPLIQUÉE ICI ---
      res.cookie('playerId', newPlayerId, {
        httpOnly: true,
        path: '/', // Le cookie sera envoyé pour tous les chemins
        maxAge: 1000 * 60 * 60 * 24 * 365, // Expire dans 1 an (pour la persistance)
        // Si vous testez en localhost, SameSite: 'Lax' est souvent suffisant.
        // Si vous rencontrez des problèmes, essayez 'None' + secure: true (uniquement en HTTPS)
        sameSite: 'lax',
      });
      // --------------------------------

      req.playerId = newPlayerId;
    } else {
      req.playerId = existingPlayerId;
    }

    next();
  }
}
