import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const GameController = () => import('#controllers/games_controller')
const PdfController = () => import('#controllers/pdfs_controller')

// Toutes les routes utilisent le middleware Player
router
  .group(() => {
    // Routes Game
    router.post('/start', [GameController, 'start'])
    router.post('/move', [GameController, 'move'])
    router.post('/reset', [GameController, 'reset'])
    router.get('/me', [GameController, 'getMe'])
    router.get('/room/:id', [GameController, 'getRoomState'])
    router.get('/debug/html', [GameController, 'debugHtml'])

    // Routes PDF
    router.get('/pdf/status/:roomId', [PdfController, 'getStatus'])
    router.post('/api/pdf-ready', [PdfController, 'postPdfReady'])
    router.get('/download/:roomId', [PdfController, 'downloadPdf'])
  })
  .use(middleware.player())
