const { DataTypes } = require('sequelize');
const db = require('../db');

const Room = db.define("Room", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    // "personal"   -> 1:1 chat between two users
    // "group"      -> multi-user chat created by a user
    // "community"  -> the single global community room
    type: {
        type: DataTypes.ENUM("personal", "group", "community"),
        allowNull: false
    },

    // Group name / community name. Null for personal rooms
    // (their display name is derived from the other participant).
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },

    // Which user created the room. Null for the community room.
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

module.exports = Room;
