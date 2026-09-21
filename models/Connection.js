const { DataTypes } = require("sequelize");
const db = require("../db");

const Connection = db.define("Connection", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userAId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userBId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    requestedById: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM("pending", "accepted", "rejected"),
        allowNull: false,
        defaultValue: "pending"
    },
    respondedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ["userAId", "userBId"]
        },
        { fields: ["userAId", "status"] },
        { fields: ["userBId", "status"] }
    ]
});

module.exports = Connection;
