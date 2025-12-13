import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { v4 as uuidv4 } from 'uuid'

// Extension du contexte pour ajouter playerId
declare module '@adonisjs/core/http' {
  interface HttpContext {
    playerId: string
  }
}

export default class PlayerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx

    // Vérifier si le cookie playerId existe
    const existingPlayerId = request.cookie('playerId')

    console.log('Middleware - Existing Player ID from cookies:', existingPlayerId)

    if (!existingPlayerId) {
      // Générer un nouveau playerId
      const newPlayerId = uuidv4()

      // Définir le cookie
      response.cookie('playerId', newPlayerId, {
        httpOnly: true,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 an
        sameSite: 'lax',
      })

      // Attacher le playerId au contexte
      ctx.playerId = newPlayerId
    } else {
      // Attacher le playerId existant au contexte
      ctx.playerId = existingPlayerId
    }

    await next()
  }
}
