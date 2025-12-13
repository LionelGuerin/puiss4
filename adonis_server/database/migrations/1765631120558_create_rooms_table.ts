import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rooms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.enum('turn', ['RED', 'YELLOW']).notNullable()
      table.enum('status', ['WAITING', 'PLAYING', 'ENDED']).notNullable()
      table.string('winner_player_id').nullable()

      // Foreign key
      table.foreign('winner_player_id').references('players.id').onDelete('SET NULL')

      // Timestamps
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
