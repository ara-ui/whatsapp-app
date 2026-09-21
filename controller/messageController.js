const Room = require("../models/Room");
const Message = require("../models/Message");
const ArchivedMessage = require("../models/ArchivedMessage");
const User = require("../models/User");

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = require("../utils/s3Client");

const { isAuthorizedForRoom } = require("../utils/roomAuthorization");
const { getMessageStatus } = require("../utils/messageStatus");
const {
    getDeletedMessageIdsForUser,
    markMessageDeletedForUser
} = require("../utils/messageDeletion");
const {
    normalizeLimit,
    encodeCursor,
    decodeCursor,
    buildBeforeWhere
} = require("../utils/messagePagination");

exports.getRoomMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const roomId = parseInt(req.params.roomId, 10);

        if (isNaN(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room id"
            });
        }

        const room = await Room.findByPk(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        const authorized = await isAuthorizedForRoom(userId, room);

        if (!authorized) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this room"
            });
        }

        const limit = normalizeLimit(req.query.limit);
        const cursor = decodeCursor(req.query.before);

        if (req.query.before && !cursor) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination cursor"
            });
        }

        const where = buildBeforeWhere(room.id, cursor);
        const fetchLimit = limit + 1;

        // Archived messages intentionally retain their original message id.
        // Query both stores with the same cursor, then merge and de-duplicate
        // before applying the final page size. This keeps history correct while
        // messages move from the live table into the archive table.
        const [liveMessages, archivedMessages] = await Promise.all([
            Message.findAll({
                where,
                limit: fetchLimit,
                order: [
                    ["createdAt", "DESC"],
                    ["id", "DESC"]
                ],
                include: [{
                    model: User,
                    as: "Sender",
                    attributes: ["id", "name"]
                }]
            }),
            ArchivedMessage.findAll({
                where,
                limit: fetchLimit,
                order: [
                    ["createdAt", "DESC"],
                    ["id", "DESC"]
                ]
            })
        ]);

        const byId = new Map();

        liveMessages.forEach(message => {
            byId.set(String(message.id), message);
        });

        archivedMessages.forEach(message => {
            if (!byId.has(String(message.id))) {
                byId.set(String(message.id), message);
            }
        });

        const sortedMessages = [...byId.values()]
            .sort((a, b) => {
                const timeDifference =
                    new Date(b.createdAt) - new Date(a.createdAt);

                if (timeDifference !== 0) {
                    return timeDifference;
                }

                return Number(b.id) - Number(a.id);
            });

        const deletedIds = await getDeletedMessageIdsForUser(
            userId,
            sortedMessages.map(message => message.id)
        );

        const visibleMessages = sortedMessages.filter(
            message => !deletedIds.has(String(message.id))
        );

        const messages = visibleMessages.slice(0, limit);

        const hasMore =
            liveMessages.length > limit ||
            archivedMessages.length > limit ||
            visibleMessages.length > messages.length;

        const archivedSenderIds = [...new Set(
            messages
                .filter(message => !message.Sender)
                .map(message => Number(message.senderId))
                .filter(Boolean)
        )];

        const archivedSenders = archivedSenderIds.length
            ? await User.findAll({
                where: { id: archivedSenderIds },
                attributes: ["id", "name"]
            })
            : [];

        const senderNames = new Map(
            archivedSenders.map(sender => [Number(sender.id), sender.name])
        );

        const pageMessages = [...messages].reverse();

        const formatted = await Promise.all(
            pageMessages.map(async (m) => {
                    let mediaUrl = null;

                    if (m.mediaKey) {
                        mediaUrl = await getSignedUrl(
                            s3Client,
                            new GetObjectCommand({
                                Bucket: process.env.AWS_S3_BUCKET,
                                Key: m.mediaKey
                            }),
                            { expiresIn: 3600 }
                        );
                    }

                    let status = null;

                    if (
                        Number(m.senderId) === Number(userId) &&
                        room.type !== "community"
                    ) {
                        status = await getMessageStatus(
                            m.id,
                            m.senderId,
                            room.type
                        );
                    }

                    return {
                        id: m.id,
                        roomId: m.roomId,
                        senderId: m.senderId,
                        senderName: m.Sender
                            ? m.Sender.name
                            : senderNames.get(Number(m.senderId)) || null,
                        messageType: m.messageType,
                        content: m.content,
                        mediaUrl,
                        mediaKey: m.mediaKey,
                        fileName: m.fileName,
                        mimeType: m.mimeType,
                        createdAt: m.createdAt,
                        status
                    };
                })
        );

        const oldestMessage = messages[messages.length - 1] || null;
        const nextCursor = hasMore && oldestMessage
            ? encodeCursor(oldestMessage.createdAt, oldestMessage.id)
            : null;

        return res.status(200).json({
            success: true,
            messages: formatted,
            pagination: {
                limit,
                hasMore,
                nextCursor
            }
        });

    } catch (err) {
        console.error("Room message history error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


exports.deleteMessageForMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const messageId = parseInt(req.params.messageId, 10);

        if (isNaN(messageId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid message id"
            });
        }

        let message = await Message.findByPk(messageId);

        if (!message) {
            message = await ArchivedMessage.findByPk(messageId);
        }

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        const room = await Room.findByPk(message.roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        const authorized = await isAuthorizedForRoom(userId, room);

        if (!authorized) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this room"
            });
        }

        await markMessageDeletedForUser(messageId, userId);

        return res.status(200).json({
            success: true,
            messageId,
            deletedFor: "me"
        });
    } catch (err) {
        console.error("Delete-for-me error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
