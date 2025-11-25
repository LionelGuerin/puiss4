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
  // On utilise notre nouvelle interface RequestWithCookies
  use(req: RequestWithCookies, res: Response, next: NextFunction) {
    // CORRECTION : Le linter n'a plus besoin de "any"
    const existingPlayerId = req.cookies?.playerId;

    if (!existingPlayerId) {
      // ... (le reste du code est inchangé)
      const newPlayerId = uuidv4();
      res.cookie('playerId', newPlayerId, { httpOnly: true });
      req.playerId = newPlayerId;
    } else {
      req.playerId = existingPlayerId;
    }

    next();
  }
}
