import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Room from './room.js'
import { PlayerColor } from './player.js'

export default class Cell extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare row: number

  @column()
  declare col: number

  @column()
  declare color: PlayerColor

  @column()
  declare roomId: string

  @belongsTo(() => Room, {
    foreignKey: 'roomId',
  })
  declare room: BelongsTo<typeof Room>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
