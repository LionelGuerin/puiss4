import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithPlayer } from '../interfaces/game.interface';

export const PlayerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithPlayer>();
    return request.playerId;
  },
);
