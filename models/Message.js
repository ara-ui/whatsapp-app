const { DataTypes } = require('sequelize');
const db = require('../db');

// One unified message table for personal, group, AND community messages.
// Every message belongs to exactly one Room (via roomId) and one sender.
const Message = db.define("Message", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    roomId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.STRING(2000),
        allowNull: false
    }
});

module.exports = Message;
