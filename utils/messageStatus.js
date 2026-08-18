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
    getMessageStatus
};