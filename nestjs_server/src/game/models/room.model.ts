import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { Player } from './player.model';
import { Cell } from './cell.model';

@Table({ tableName: 'Rooms' }) // Nom exact de ta table en DB
export class Room extends Model {
  // INDISPENSABLE car tes IDs ne sont pas des nombres 1, 2, 3
  @Column({ primaryKey: true, type: DataType.STRING })
  declare id: string;

  @Column(DataType.ENUM('RED', 'YELLOW'))
  declare turn: string;

  @Column(DataType.ENUM('WAITING', 'IN_PROGRESS', 'ENDED'))
  declare status: string;

  @ForeignKey(() => Player)
  @Column({ type: DataType.STRING, allowNull: true })
  declare winnerPlayerId: string;

  // Relation : Une Room "appartient" à un Winner (qui est un Player)
  @BelongsTo(() => Player, 'winnerPlayerId')
  declare winner: Player;

  // Relation : Une Room a plusieurs Cells
  @HasMany(() => Cell)
  declare cells: Cell[];
}
