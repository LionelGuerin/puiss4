import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Room } from './room.model';

@Table({ tableName: 'Players', timestamps: true }) // timestamps true si ton Express utilisait createdAt/updatedAt par défaut
export class Player extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.ENUM('RED', 'YELLOW'), allowNull: true })
  declare color: string | null;

  @ForeignKey(() => Room)
  @Column({ type: DataType.STRING, allowNull: true })
  declare roomId: string | null;

  @BelongsTo(() => Room)
  declare room: Room;
}
