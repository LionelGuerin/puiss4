import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cells'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('row').notNullable()
      table.integer('col').notNullable()
      table.enum('color', ['RED', 'YELLOW']).notNullable()
      table.string('room_id').notNullable()

      // Foreign key
      table.foreign('room_id').references('rooms.id').onDelete('CASCADE')

      // Timestamps
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
