const { DataTypes } = require('sequelize');
const db = require('../db');

const SpaceInvitation = db.define('SpaceInvitation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    roomId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    inviterId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    inviteeId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    }
}, {
    indexes: [
        { fields: ['roomId', 'inviteeId', 'status'] },
        { fields: ['inviteeId', 'status'] }
    ]
});

module.exports = SpaceInvitation;
