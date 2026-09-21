const { Op } = require("sequelize");
const Connection = require("../models/Connection");

function normalizePair(userIdA, userIdB) {
    const a = Number(userIdA);
    const b = Number(userIdB);

    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) {
        return null;
    }

    return a < b
        ? { userAId: a, userBId: b }
        : { userAId: b, userBId: a };
}

async function getConnectionBetweenUsers(userIdA, userIdB) {
    const pair = normalizePair(userIdA, userIdB);

    if (!pair) {
        return null;
    }

    return Connection.findOne({ where: pair });
}

async function areUsersConnected(userIdA, userIdB) {
    const connection = await getConnectionBetweenUsers(userIdA, userIdB);
    return Boolean(connection && connection.status === "accepted");
}

async function getConnectionForUserAndOther(userId, otherUserId) {
    return getConnectionBetweenUsers(userId, otherUserId);
}

module.exports = {
    normalizePair,
    getConnectionBetweenUsers,
    getConnectionForUserAndOther,
    areUsersConnected
};
