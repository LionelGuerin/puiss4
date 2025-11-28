import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'; // Utilisation des types Socket.IO
import { Logger } from '@nestjs/common';

// Note: On utilise le port par défaut (4000) et le chemin racine (/)
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);

  // Instance du serveur Socket.IO injectée
  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('✅ Socket.IO Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Ici, tu peux vérifier l'ID du joueur, etc.
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * [NOUVEAU] Gère la connexion du client à la Room du jeu.
   * Le client doit envoyer un événement "join" avec l'ID de la room.
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(client: Socket, roomId: string) {
    if (roomId) {
      // Ajoute le client à la room Socket.IO.
      await client.join(roomId);
      this.logger.log(`Client ${client.id} joined room ${roomId}`);

      // OPTIONNEL : Si tu veux renvoyer une confirmation au client
      // client.emit('joinedRoom', roomId);
    }
  }

  // Méthode appelée par le GameService pour émettre la mise à jour
  emitBoardUpdate(roomId: string, payload: any) {
    // Ceci remplace l'ancien io.to(room.id).emit("board_update", payload);
    console.log('Emitting board update to room:', roomId, payload);
    this.server.to(roomId).emit('board_update', payload);
  }
}
