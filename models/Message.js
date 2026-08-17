const { DataTypes } = require('sequelize');
const db = require('../db');


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
        // Nullable: media messages carry no text content.
        allowNull: true
    },
    messageType: {
        type: DataTypes.ENUM("text", "image", "video", "file"),
        allowNull: false,
        defaultValue: "text"
    },
    mediaUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },mediaKey: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },
    fileName: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    mimeType: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
});
module.exports = Message;
