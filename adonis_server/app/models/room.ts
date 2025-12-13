import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Cell from './cell.js'
import Player from './player.js'
import { PlayerColor } from './player.js'

export enum GameStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

export default class Room extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  public static selfAssignPrimaryKey = true

  @column()
  declare turn: PlayerColor

  @column()
  declare status: GameStatus

  @column()
  declare winnerPlayerId: string | null

  @hasMany(() => Cell, {
    foreignKey: 'roomId',
  })
  declare cells: HasMany<typeof Cell>

  @belongsTo(() => Player, {
    foreignKey: 'winnerPlayerId',
  })
  declare winnerPlayer: BelongsTo<typeof Player>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
