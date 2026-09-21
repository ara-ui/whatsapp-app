const MessageDeletion = require("../models/MessageDeletion");

async function getDeletedMessageIdsForUser(userId, messageIds = null) {
    const where = { userId };

    if (Array.isArray(messageIds)) {
        if (messageIds.length === 0) {
            return new Set();
        }
        where.messageId = messageIds;
    }

    const rows = await MessageDeletion.findAll({
        where,
        attributes: ["messageId"]
    });

    return new Set(rows.map(row => String(row.messageId)));
}

async function markMessageDeletedForUser(messageId, userId) {
    const [row] = await MessageDeletion.findOrCreate({
        where: { messageId, userId },
        defaults: {
            messageId,
            userId,
            deletedAt: new Date()
        }
    });

    return row;
}

module.exports = {
    getDeletedMessageIdsForUser,
    markMessageDeletedForUser
};
