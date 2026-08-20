const MessageRecipient =
    require("../models/MessageRecipient");

const { Op } = require("sequelize");


async function createRecipientRows(
    message,
    recipientIds
) {

    if (!recipientIds || recipientIds.length === 0) {
        return;
    }

    const uniqueRecipientIds =
        [...new Set(recipientIds)]
            .filter(
                id => Number(id) !== Number(message.senderId)
            );

    if (uniqueRecipientIds.length === 0) {
        return;
    }

    await MessageRecipient.bulkCreate(
        uniqueRecipientIds.map(recipientId => ({
            messageId: message.id,
            recipientId,
            status: "sent"
        })),
        {
            ignoreDuplicates: true
        }
    );
}


async function markDelivered(
    messageId,
    recipientId
) {

    const recipient =
        await MessageRecipient.findOne({
            where: {
                messageId,
                recipientId
            }
        });

    if (!recipient) {
        return;
    }

    if (
        recipient.status === "read"
    ) {
        return;
    }

    await recipient.update({
        status: "delivered",
        deliveredAt:
            recipient.deliveredAt ||
            new Date()
    });
}


async function markRead(
    messageId,
    recipientId
) {

    const recipient =
        await MessageRecipient.findOne({
            where: {
                messageId,
                recipientId
            }
        });

    if (!recipient) {
        return;
    }

    await recipient.update({
        status: "read",
        deliveredAt:
            recipient.deliveredAt ||
            new Date(),
        readAt:
            recipient.readAt ||
            new Date()
    });
}


// ============================================================
// BULK: mark every currently "sent" (not yet delivered) message
// addressed to this recipient as "delivered".
//
// Used when a user's socket (re)connects — anything that was
// sitting at "sent" while they were offline becomes "delivered"
// the moment their client is back and able to receive it.
//
// Returns the distinct list of affected messageIds so the caller
// can recompute + broadcast status for each one.
// ============================================================
async function markAllDeliveredForUser(recipientId) {

    const pending = await MessageRecipient.findAll({
        where: {
            recipientId,
            status: "sent"
        },
        attributes: ["messageId"]
    });

    if (pending.length === 0) {
        return [];
    }

    const messageIds = [
        ...new Set(pending.map(row => row.messageId))
    ];

    // Reuse the existing single-row helper so the same
    // "don't downgrade an already-read row" / "keep first
    // deliveredAt" rules apply here too.
    await Promise.all(
        messageIds.map(messageId =>
            markDelivered(messageId, recipientId)
        )
    );

    return messageIds;
}


// ============================================================
// BULK: mark every not-yet-read message in a given room as
// "read" for this recipient.
//
// Used when a user opens (joins) a conversation — everything
// they can now see in that room becomes "read" immediately,
// regardless of whether it was previously "sent" or "delivered".
//
// Returns the distinct list of affected messageIds so the caller
// can recompute + broadcast status for each one.
// ============================================================
async function markAllReadForRoom(roomId, recipientId) {

    const Message = require("../models/Message");

    const unread = await MessageRecipient.findAll({
        where: {
            recipientId,
            status: {
                [Op.ne]: "read"
            }
        },
        include: [{
            model: Message,
            attributes: [],
            where: { roomId },
            required: true
        }],
        attributes: ["messageId"]
    });

    if (unread.length === 0) {
        return [];
    }

    const messageIds = [
        ...new Set(unread.map(row => row.messageId))
    ];

    // Reuse the existing single-row helper — it already
    // preserves a prior deliveredAt / readAt instead of
    // clobbering it, so a message that skips straight from
    // "sent" to "read" still gets a sensible deliveredAt.
    await Promise.all(
        messageIds.map(messageId =>
            markRead(messageId, recipientId)
        )
    );

    return messageIds;
}


async function getMessageStatus(
    messageId,
    senderId,
    roomType
) {

    // Community messages don't need
    // delivery/read ticks.
    if (roomType === "community") {
        return null;
    }

    const recipients =
        await MessageRecipient.findAll({
            where: {
                messageId
            },
            attributes: [
                "recipientId",
                "status"
            ]
        });

    if (recipients.length === 0) {
        return "sent";
    }

    if (
        recipients.every(
            recipient =>
                recipient.status === "read"
        )
    ) {
        return "read";
    }

    if (
        recipients.some(
            recipient =>
                recipient.status === "delivered" ||
                recipient.status === "read"
        )
    ) {
        return "delivered";
    }

    return "sent";
}


module.exports = {
    createRecipientRows,
    markDelivered,
    markRead,
    markAllDeliveredForUser,
    markAllReadForRoom,
    getMessageStatus
};