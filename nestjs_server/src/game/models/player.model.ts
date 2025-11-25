import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Room } from './room.model'; // On importe Room pour faire le lien

@Table({ tableName: 'Players' })
export class Player extends Model {
  // INDISPENSABLE car tes IDs ne sont pas des nombres 1, 2, 3
  @Column({ primaryKey: true, type: DataType.STRING })
  declare id: string;

  @Column({ type: DataType.STRING })
  declare name: string; // Nécessaire pour ton retour API (winner.name)

  @Column(DataType.ENUM('RED', 'YELLOW'))
  declare color: string;

  // Relation : Un joueur appartient à une Room (via roomId)
  // C'est ce qu'on voyait dans ta colonne 'roomId' sur la capture
  @ForeignKey(() => Room)
  @Column({ type: DataType.STRING })
  declare roomId: string;

  @BelongsTo(() => Room)
  declare room: Room;
}
