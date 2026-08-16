const { DataTypes } = require('sequelize');
const db = require('../db');

// Join table: one row = "this user belongs to this room".
// This is the single source of truth for room membership/authorization.
const RoomMember = db.define("RoomMember", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    roomId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    indexes: [
        {
            // A user can only appear once per room
            unique: true,
            fields: ["roomId", "userId"]
        }
    ]
});

module.exports = RoomMember;
