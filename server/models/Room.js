import {
  DataTypes
} from "sequelize";
import {
  sequelize
} from "../config/db.js";
import {
  Player
} from "./Player.js";

export const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  turn: {
    type: DataTypes.ENUM("YELLOW", "RED"),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM("WAITING", "PLAYING", "ENDED"),
    defaultValue: "WAITING",
  },
  winnerPlayerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
});

Room.belongsTo(Player, {
  as: "winner",
  foreignKey: "winnerPlayerId"
});