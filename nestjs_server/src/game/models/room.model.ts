import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Player } from './player.model';
import { Cell } from './cell.model';

@Table({ tableName: 'Rooms', timestamps: true })
export class Room extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  declare id: string;

  @Column(DataType.ENUM('RED', 'YELLOW'))
  declare turn: string;

  @Column(DataType.ENUM('WAITING', 'PLAYING', 'ENDED'))
  declare status: string;

  // On suit ton code Express : la colonne s'appelle winnerPlayerId
  @ForeignKey(() => Player)
  @Column({ type: DataType.STRING, allowNull: true })
  declare winnerPlayerId: string | null;

  @BelongsTo(() => Player, 'winnerPlayerId')
  declare winnerPlayer: Player;

  @HasMany(() => Cell)
  declare cells: Cell[];
}
