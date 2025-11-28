import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class SseService {
  // Notre "annuaire" : Pour chaque RoomId, on stocke une liste de réponses HTTP ouvertes
  private rooms = new Map<string, Set<Response>>();

  /**
   * Ajoute un client (une connexion) à une room spécifique
   */
  addClient(roomId: string, res: Response) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    const clients = this.rooms.get(roomId)!;
    clients.add(res);

    console.log(`Client ajouté à la room ${roomId}. Total: ${clients.size}`);
  }

  /**
   * Retire un client quand il ferme la fenêtre (Important pour éviter les fuites de mémoire)
   */
  removeClient(roomId: string, res: Response) {
    const clients = this.rooms.get(roomId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.rooms.delete(roomId); // Nettoyage de la room si vide
      }
    }
    console.log(`Client retiré de la room ${roomId}`);
  }

  /**
   * LA MÉTHODE DE DIFFUSION (Remplace io.to(roomId).emit(...))
   * Formate le message selon le protocole SSE strict.
   */
  emitToRoom(roomId: string, eventName: string, data: any) {
    const clients = this.rooms.get(roomId);

    if (!clients || clients.size === 0) return;

    // Protocole SSE :
    // - "event:" définit le nom de l'écouteur coté client
    // - "data:" contient le payload JSON
    // - "\n\n" marque la fin du message
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    // On envoie ce paquet de texte à tous les clients connectés
    clients.forEach((clientRes) => {
      clientRes.write(message);
    });
  }
}
