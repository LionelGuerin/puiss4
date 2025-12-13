import Player, { PlayerColor } from '#models/player'
import Room, { GameStatus } from '#models/room'
import Cell from '#models/cell'
import { v4 as uuidv4 } from 'uuid'
import db from '@adonisjs/lucid/services/db'
import * as amqp from 'amqplib'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import Ws from '#services/ws'

export interface GamePayload {
  [key: string]: any
  id: string
  board: (string | null)[][]
  turn: string
  status: string
  winner: string | null
}

export default class GameService {
  /**
   * Gère toute la logique de connexion/création de partie
   */
  async startGame(playerId: string, playerName: string) {
    // 1. Récupération ou création du joueur
    let player = await Player.find(playerId)

    if (!player) {
      player = await Player.create({
        id: playerId,
        name: playerName,
        color: null,
        roomId: null,
      })
    } else {
      player.name = playerName
      await player.save()
    }

    // 2. Nettoyage si le joueur était déjà dans une partie finie
    if (player.roomId) {
      const oldRoom = await Room.find(player.roomId)
      player.roomId = null
      player.color = null
      await player.save()

      if (oldRoom && oldRoom.status === GameStatus.ENDED) {
        await oldRoom.delete()
      }
    }

    // 3. Matchmaking : Chercher une partie avec 1 seul joueur
    const roomEntry = await this.findRoomWithOnePlayer()
    const existingRoomId = roomEntry?.roomId

    let room: Room | null = null
    if (existingRoomId) {
      room = await Room.find(existingRoomId)
    }

    if (!room) {
      // CAS A : Créer une nouvelle Room
      const newRoomId = uuidv4()
      room = await Room.create({
        id: newRoomId,
        turn: PlayerColor.YELLOW,
        status: GameStatus.WAITING,
        winnerPlayerId: null,
      })

      player.roomId = room.id
      player.color = PlayerColor.YELLOW
      console.log('NOUVELLE ROOM:', room.id, 'pour le joueur', player.id)
      await player.save()

      return {
        roomId: room.id,
        color: PlayerColor.YELLOW,
        turn: PlayerColor.YELLOW,
        status: GameStatus.WAITING,
      }
    } else {
      // CAS B : Rejoindre la Room existante
      const opponent = await Player.query().where('room_id', room.id).first()
      const myColor =
        opponent && opponent.color === PlayerColor.YELLOW ? PlayerColor.RED : PlayerColor.YELLOW

      player.roomId = room.id
      player.color = myColor
      await player.save()

      room.status = GameStatus.PLAYING
      await room.save()

      return {
        roomId: room.id,
        color: player.color,
      }
    }
  }

  /**
   * Gère la logique d'un coup joué
   */
  async makeMove(playerId: string, roomId: string, column: number) {
    const player = await Player.find(playerId)

    if (!player || player.roomId !== roomId) {
      throw new Error('Not in room')
    }

    const room = await Room.find(roomId)
    if (!room) {
      throw new Error('Room not found')
    }
    if (room.status === GameStatus.ENDED) {
      throw new Error('Ended')
    }
    if (player.color !== room.turn) {
      throw new Error('Not your turn')
    }

    // Exécution du coup (Logique interne)
    return this.processMoveLogic(room, player, column)
  }

  /**
   * Récupère l'état complet de la room (ISO)
   */
  async getRoomIso(roomId: string): Promise<GamePayload | null> {
    const room = await Room.query().where('id', roomId).preload('winnerPlayer').first()

    if (!room) return null

    const board = await this.makeBoard(room.id)

    return {
      id: room.id,
      turn: room.turn as string,
      status: room.status as string,
      winner: room.winnerPlayer ? room.winnerPlayer.name : null,
      board: board.map((row) => row.map((cell) => cell as string | null)),
    }
  }

  /**
   * Réinitialise toute la base de données
   */
  async resetAll() {
    await Cell.query().delete()
    await Room.query().delete()
    await Player.query().delete()
  }

  /**
   * Récupère un joueur
   */
  async getPlayer(playerId: string) {
    return Player.find(playerId)
  }

  /**
   * Récupère toutes les données pour debug
   */
  async getAllData() {
    return {
      players: await Player.all(),
      rooms: await Room.all(),
      cells: await Cell.all(),
    }
  }

  // =================================================================
  // MÉTHODES PRIVÉES
  // =================================================================

  private async findRoomWithOnePlayer(): Promise<{
    roomId: string
    playerCount: number
  } | null> {
    const result = await db
      .from('players')
      .select('room_id as roomId')
      .count('* as playerCount')
      .whereNotNull('room_id')
      .groupBy('room_id')
      .havingRaw('COUNT(*) = 1')
      .first()

    return result as { roomId: string; playerCount: number } | null
  }

  private async processMoveLogic(room: Room, player: Player, column: number) {
    // 1. Jouer le jeton
    const pos = await this.dropInColumn(room.id, column, player.color!)
    if (!pos) throw new Error('Column full')

    // 2. Vérifier victoire
    const board = await this.makeBoard(room.id)
    const won = this.checkWinner(board, pos.row, pos.col, player.color!)

    // 3. Mise à jour Room
    if (won) {
      room.status = GameStatus.ENDED
      room.winnerPlayerId = player.id
      this.notifyGameEnded(room.id).catch((err) => logger.error(err))
    } else {
      room.turn = room.turn === PlayerColor.YELLOW ? PlayerColor.RED : PlayerColor.YELLOW
      room.status = GameStatus.PLAYING
    }
    await room.save()

    // 4. Notification
    const payload: GamePayload = {
      id: room.id,
      board: board.map((row) => row.map((cell) => cell as string | null)),
      turn: room.turn as string,
      status: room.status as string,
      winner: room.winnerPlayerId ? player.name : null,
    }

    // WebSocket Emit via Transmit
    console.log('Emitting board update to room:', room.id, payload)
    //transmit.broadcast(`room/${room.id}/board_update`, JSON.parse(JSON.stringify(payload)))
    Ws.emitBoardUpdate(room.id, payload)

    return { success: true }
  }

  private async makeBoard(roomId: string): Promise<(PlayerColor | null)[][]> {
    const cells = await Cell.query().where('room_id', roomId)
    const board: (PlayerColor | null)[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null)
    )

    cells.forEach((cell) => {
      if (cell.row >= 0 && cell.row < 6 && cell.col >= 0 && cell.col < 7) {
        board[cell.row][cell.col] = cell.color
      }
    })
    return board
  }

  private async dropInColumn(roomId: string, column: number, color: PlayerColor) {
    const tokensInColumn = await Cell.query()
      .where('room_id', roomId)
      .where('col', column)
      .count('* as total')

    const count = Number(tokensInColumn[0].$extras.total)
    if (count >= 6) return null

    const row = 5 - count
    const cell = await Cell.create({
      row,
      col: column,
      color,
      roomId,
    })
    return { row: cell.row, col: cell.col }
  }

  private checkWinner(
    board: (PlayerColor | null)[][],
    r: number,
    c: number,
    color: PlayerColor
  ): boolean {
    const R = 6
    const C = 7
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]

    for (const [dr, dc] of directions) {
      let count = 1
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i
        const nc = c + dc * i
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color) count++
        else break
      }
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i
        const nc = c - dc * i
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && board[nr][nc] === color) count++
        else break
      }
      if (count >= 4) return true
    }
    return false
  }

  async notifyGameEnded(roomId: string): Promise<void> {
    const AMQP_URL = env.get('AMQP_URL', 'amqp://localhost')
    const QUEUE_NAME = env.get('AMQP_QUEUE', 'game_ended')

    try {
      const conn = await amqp.connect(AMQP_URL)
      const ch = await conn.createChannel()
      await ch.assertQueue(QUEUE_NAME, { durable: true })
      ch.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ roomId })), {
        persistent: true,
      })
      logger.info(`[AMQP] Message for Room ${roomId} sent`)
      await ch.close()
      await conn.close()
    } catch (error) {
      logger.error('[AMQP] Error', error)
    }
  }
}
