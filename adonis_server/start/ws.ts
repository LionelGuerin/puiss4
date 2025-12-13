// start/ws.ts
import app from '@adonisjs/core/services/app'
import Ws from '#services/ws'
import logger from '@adonisjs/core/services/logger'

app.ready(() => {
  Ws.boot()
  const io = Ws.io

  if (io) {
    io.on('connection', (socket) => {
      // --- handleConnection ---
      logger.info(`Client connected: ${socket.id}`)

      // --- @SubscribeMessage('join_room') ---
      socket.on('join_room', async (roomId: string) => {
        if (roomId) {
          await socket.join(roomId)
          logger.info(`Client ${socket.id} joined room ${roomId}`)

          // Optionnel : socket.emit('joinedRoom', roomId)
        }
      })

      // --- handleDisconnect ---
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`)
      })
    })
  }
})
