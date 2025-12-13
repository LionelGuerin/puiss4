import type { HttpContext } from '@adonisjs/core/http'
import GameService from '#services/game_service'
import { startGameValidator } from '#validators/start_game'
import { makeMoveValidator } from '#validators/make_move'

export default class GameController {
  private gameService = new GameService()

  /**
   * POST /start
   */
  async start({ request, playerId }: HttpContext) {
    const payload = await request.validateUsing(startGameValidator)
    return this.gameService.startGame(playerId, payload.name)
  }

  /**
   * POST /move
   */
  async move({ request, playerId, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(makeMoveValidator)
      await this.gameService.makeMove(playerId, payload.roomId, payload.column)
      return { success: true }
    } catch (err: any) {
      console.log('❌ ERREUR MOVE:', err)
      console.log('👤 JOUEUR:', playerId)

      if (err.message === 'Not in room') {
        return response.badRequest({ error: err.message })
      }
      if (err.message === 'Room not found') {
        return response.notFound({ error: err.message })
      }
      if (
        err.message === 'Ended' ||
        err.message === 'Not your turn' ||
        err.message === 'Column full'
      ) {
        return response.badRequest({ error: err.message })
      }

      return response.internalServerError({ error: 'Server error' })
    }
  }

  /**
   * POST /reset
   */
  async reset() {
    await this.gameService.resetAll()
    return { success: true, message: 'Database reset complete' }
  }

  /**
   * GET /me
   */
  async getMe({ playerId, response }: HttpContext) {
    if (!playerId) {
      return response.unauthorized({ error: 'Player ID missing' })
    }

    const p = await this.gameService.getPlayer(playerId)

    if (!p) return { id: playerId, exists: false }

    return {
      id: p.id,
      color: p.color,
      roomId: p.roomId,
      name: p.name,
      exists: true,
    }
  }

  /**
   * GET /room/:id
   */
  async getRoomState({ params, response }: HttpContext) {
    const roomData = await this.gameService.getRoomIso(params.id)
    if (!roomData) {
      return response.notFound({ error: 'Room not found' })
    }
    return roomData
  }

  /**
   * GET /debug/html
   */
  async debugHtml({ response }: HttpContext) {
    const data = await this.gameService.getAllData()

    const html = `
     <html>
        <head>
          <title>Debug Puissance 4</title>
          <style>
            body { font-family:sans-serif; padding:20px; }
            table { border-collapse: collapse; margin-bottom:20px; }
            th,td { border:1px solid #333; padding:5px; text-align:center; }
            th { background:#eee; }
          </style>
        </head>
        <body>
          <h1>Debug Puissance 4 (AdonisJS)</h1>
          
          <h2>Players</h2>
          <table>
            <tr><th>id</th><th>name</th><th>color</th><th>roomId</th></tr>
            ${data.players.map((p) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.color || ''}</td><td>${p.roomId || ''}</td></tr>`).join('')}
          </table>
          
          <h2>Rooms</h2>
          <table>
            <tr><th>id</th><th>turn</th><th>status</th><th>winner</th></tr>
            ${data.rooms.map((r) => `<tr><td>${r.id}</td><td>${r.turn || ''}</td><td>${r.status}</td><td>${r.winnerPlayerId || ''}</td></tr>`).join('')}
          </table>
          
          <h2>Cells</h2>
          <table>
            <tr><th>roomId</th><th>row</th><th>col</th><th>color</th></tr>
            ${data.cells.map((c) => `<tr><td>${c.roomId}</td><td>${c.row}</td><td>${c.col}</td><td>${c.color}</td></tr>`).join('')}
          </table>
        </body>
      </html>
    `
    response.header('Content-Type', 'text/html')
    return response.send(html)
  }
}
