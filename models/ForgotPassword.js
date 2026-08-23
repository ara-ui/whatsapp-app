const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const ForgotPassword = sequelize.define(
    "ForgotPassword",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }
);

module.exports = ForgotPassword;