const { DataTypes } = require('sequelize');
const db = require('../db');

const SpaceDetails = db.define('SpaceDetails', {
    roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    purpose: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
});

module.exports = SpaceDetails;
