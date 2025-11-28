import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithPlayer } from '../interfaces/game.interface';

@Injectable()
export class PlayerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPlayer>();
    if (!request.playerId) {
      throw new UnauthorizedException('Player ID missing');
    }
    return true;
  }
}
