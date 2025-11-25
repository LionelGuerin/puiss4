import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io'; // Assure-toi d'avoir installé : npm i @nestjs/platform-socket.io socket.io

@WebSocketGateway({ cors: true }) // cors true pour faciliter le dev React
export class GameGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('✅ WebSocket Gateway Initialized');
  }

  // Méthode utilitaire pour émettre l'update
  emitBoardUpdate(roomId: string, payload: any) {
    this.server.to(roomId).emit('board_update', payload);
  }
}
