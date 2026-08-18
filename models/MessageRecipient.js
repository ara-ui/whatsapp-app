const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const MessageRecipient = sequelize.define(
    "MessageRecipient",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        messageId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        recipientId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(
                "sent",
                "delivered",
                "read"
            ),
            allowNull: false,
            defaultValue: "sent"
        },

        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true
        },

        readAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "MessageRecipients",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: [
                    "messageId",
                    "recipientId"
                ]
            }
        ]
    }
);

module.exports = MessageRecipient;