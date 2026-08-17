const { CronJob } = require("cron");
const { Op } = require("sequelize");

const db = require("../db");
const Message = require("../models/Message");
const ArchivedMessage = require("../models/ArchivedMessage");

async function archiveOldMessages() {
    console.log("Starting message archival...");

    const transaction = await db.transaction();

    try {
        // Messages older than 24 hours
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const oldMessages = await Message.findAll({
            where: {
                createdAt: {
                    [Op.lt]: cutoffTime
                }
            },
            transaction
        });

        if (oldMessages.length === 0) {
            await transaction.commit();

            console.log("No messages to archive.");
            return;
        }

        const archivedMessages = oldMessages.map(message => ({
            id: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            mediaKey: message.mediaKey,
            fileName: message.fileName,
            mimeType: message.mimeType,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
        }));

        await ArchivedMessage.bulkCreate(
            archivedMessages,
            { transaction }
        );

        await Message.destroy({
            where: {
                createdAt: {
                    [Op.lt]: cutoffTime
                }
            },
            transaction
        });

        await transaction.commit();

        console.log(
            `${oldMessages.length} messages archived successfully.`
        );

    } catch (error) {

        await transaction.rollback();

        console.error(
            "Message archival failed:",
            error
        );
    }
}


// Run every night at 2:00 AM
const archiveJob = new CronJob(
    "0 0 2 * * *",
    archiveOldMessages
);

archiveJob.start();

console.log("Message archival cron job started.");

module.exports = archiveOldMessages;