// app/services/ws.ts
import { Server } from 'socket.io'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger' // Le logger Adonis

class WsService {
  io: Server | undefined
  private booted = false

  /**
   * Initialise le serveur Socket.io
   */
  boot() {
    if (this.booted) return
    this.booted = true

    this.io = new Server(server.getNodeServer(), {
      cors: {
        origin: '*',
      },
    })

    logger.info('✅ Socket.IO Gateway Initialized')
  }

  /**
   * [MIGRAITION] Ta méthode emitBoardUpdate
   * Elle est maintenant accessible partout via Ws.emitBoardUpdate(...)
   */
  emitBoardUpdate(roomId: string, payload: any) {
    if (this.io) {
      // console.log remplace ton this.logger.log temporairement
      logger.info(`Emitting board update to room: ${roomId}`, payload)
      this.io.to(roomId).emit('board_update', payload)
    }
  }

  /**
   * [AJOUTÉ] Notifie que le PDF est prêt
   * Correspond à : this.gameGateway.server.to(roomId).emit('pdf_ready', { roomId });
   */
  emitPdfReady(roomId: string) {
    if (this.io) {
      logger.info(`PDF Ready emitted for room: ${roomId}`)
      this.io.to(roomId).emit('pdf_ready', { roomId })
    }
  }
}

export default new WsService()
