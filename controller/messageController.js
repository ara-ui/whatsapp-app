const Room = require("../models/Room");
const Message = require("../models/Message");
const ArchivedMessage = require("../models/ArchivedMessage");
const User = require("../models/User");

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = require("../utils/s3Client");

const { isAuthorizedForRoom } = require("../utils/roomAuthorization");
const { getMessageStatus } = require("../utils/messageStatus");

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

        const [liveMessages, archivedMessages] = await Promise.all([
            Message.findAll({
                where: { roomId: room.id },
                include: [{
                    model: User,
                    as: "Sender",
                    attributes: ["id", "name"]
                }]
            }),
            ArchivedMessage.findAll({
                where: { roomId: room.id }
            })
        ]);

        // Archived rows intentionally keep the original message id.
        // De-duplicate by id so an edge case cannot show the same message twice.
        const byId = new Map();
        liveMessages.forEach(message => byId.set(String(message.id), message));
        archivedMessages.forEach(message => {
            if (!byId.has(String(message.id))) {
                byId.set(String(message.id), message);
            }
        });

        const messages = [...byId.values()].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

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

        const formatted = await Promise.all(
            messages.map(async (m) => {
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

                // Status ticks are only ever shown on the current
                // user's OWN messages (see messageRenderer.js), and
                // community chat never tracks delivery/read state.
                // Without this, reloading a conversation's history
                // would reset every sent message back to a single
                // "sent" tick even if it had already been delivered
                // or read live.
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
        return res.status(200).json({
            success: true,
            messages: formatted
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
