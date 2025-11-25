import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Room } from './room.model';

@Table({ tableName: 'Cells', timestamps: true })
export class Cell extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  declare id: number;

  @Column({ type: DataType.INTEGER })
  declare row: number;

  @Column({ type: DataType.INTEGER })
  declare col: number;

  @Column(DataType.ENUM('RED', 'YELLOW'))
  declare color: string;

  @ForeignKey(() => Room)
  @Column({ type: DataType.STRING })
  declare roomId: string;

  @BelongsTo(() => Room)
  declare room: Room;
}
