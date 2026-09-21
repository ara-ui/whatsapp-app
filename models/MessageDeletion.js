const { DataTypes } = require("sequelize");
const db = require("../db");

// Per-user deletion state. A "delete for me" action hides the message only
// for the requesting user; the underlying message and S3 object remain
// available to other participants.
const MessageDeletion = db.define("MessageDeletion", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    messageId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "MessageDeletions",
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ["messageId", "userId"]
        },
        {
            fields: ["userId", "messageId"]
        }
    ]
});

module.exports = MessageDeletion;
