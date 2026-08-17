const { DataTypes } = require("sequelize");
const db = require("../db");

const ArchivedMessage = db.define("ArchivedMessage", {
    id: {
        type: DataTypes.INTEGER,
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
    },

    mediaKey: {
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
    },

    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },

    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: "ArchivedMessages"
});

module.exports = ArchivedMessage;