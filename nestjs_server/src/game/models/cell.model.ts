import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Room } from './room.model';

@Table({ tableName: 'Cells' }) // Assure-toi que ta table s'appelle bien 'Cells' ou 'cells'
export class Cell extends Model {
  // Sequelize ajoute souvent un ID auto-incrémenté par défaut,
  // mais on peut expliciter les colonnes utiles :
  // INDISPENSABLE car tes IDs ne sont pas des nombres 1, 2, 3
  @Column({ primaryKey: true, type: DataType.STRING })
  declare id: string;

  @Column({ type: DataType.INTEGER })
  declare row: number; // Ligne (0 à 5)

  @Column({ type: DataType.INTEGER })
  declare col: number; // Colonne (0 à 6)

  @Column(DataType.ENUM('RED', 'YELLOW'))
  declare color: string;

  // Relation : Une cellule appartient à une Room
  @ForeignKey(() => Room)
  @Column({ type: DataType.STRING })
  declare roomId: string;

  @BelongsTo(() => Room)
  declare room: Room;
}
