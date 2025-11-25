import {
  DataTypes
} from "sequelize";
import {
  sequelize
} from "../config/db.js";
import {
  Room
} from "./Room.js";

export const Cell = sequelize.define("Cell", {
  roomId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  row: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  col: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  color: {
    type: DataTypes.ENUM("YELLOW", "RED"),
    allowNull: false
  },
}, {
  indexes: [{
    unique: true,
    fields: ["roomId", "row", "col"]
  }],
});

Cell.belongsTo(Room, {
  as: "room",
  foreignKey: "roomId",
  onDelete: "CASCADE",
  hooks: true
});