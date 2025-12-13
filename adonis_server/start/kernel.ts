import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

export const middleware = router.named({
  player: () => import('#middleware/player_middleware'),
})

server.use([() => import('@adonisjs/cors/cors_middleware')])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
])
