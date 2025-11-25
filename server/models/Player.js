import {
  DataTypes
} from "sequelize";
import {
  sequelize
} from "../config/db.js";

export const Player = sequelize.define("Player", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  color: {
    type: DataTypes.ENUM("YELLOW", "RED"),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});