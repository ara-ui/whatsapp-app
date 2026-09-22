const { Op } = require("sequelize");

const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const Message = require("../models/Message");
const User = require("../models/User");
const MessageRecipient = require("../models/MessageRecipient");
const { areUsersConnected } = require("../utils/connection");
const SpaceDetails = require("../models/SpaceDetails");


// first time it's needed. There is only ever one of these.
async function getOrCreateCommunityRoom() {
    let room = await Room.findOne({ where: { type: "community" } });

    if (!room) {
        room = await Room.create({
            type: "community",
            name: "Community Chat"
        });
    }

    return room;
}

async function findPersonalRoom(userIdA, userIdB) {

    const membershipsForA = await RoomMember.findAll({
        where: { userId: userIdA }
    });

    const roomIdsForA = membershipsForA.map((m) => m.roomId);

    if (roomIdsForA.length === 0) {
        return null;
    }

    const candidateRooms = await Room.findAll({
        where: {
            id: { [Op.in]: roomIdsForA },
            type: "personal"
        }
    });

    for (const room of candidateRooms) {

        const members = await RoomMember.findAll({
            where: { roomId: room.id }
        });

        const memberIds = members.map((m) => m.userId);

        if (memberIds.length === 2 && memberIds.includes(userIdB)) {
            return room;
        }
    }

    return null;
}

exports.getRooms = async (req, res) => {
    try {
        const userId = req.user.id;

        // Rooms this user explicitly belongs to (personal + Space)
        const memberships = await RoomMember.findAll({
            where: { userId },
            include: [{ model: Room }]
        });

        const personalAndGroupRooms = memberships
            .map((m) => m.Room)
            .filter(Boolean);

        // Every authenticated user can see the community room
        const communityRoom = await getOrCreateCommunityRoom();

        const allRooms = [...personalAndGroupRooms, communityRoom];

        const roomsWithDetails = await Promise.all(
            allRooms.map(async (room) => {

                const lastMessage = await Message.findOne({
                    where: { roomId: room.id },
                    order: [["createdAt", "DESC"]],
                    include: [{
                        model: User,
                        as: "Sender",
                        attributes: ["id", "name"]
                    }]
                });

                let displayName = room.name;
                let otherUserId = null;

                if (room.type === "personal") {

                const members = await RoomMember.findAll({
                    where: {
                        roomId: room.id
                    },
                    include: [{
                        model: User,
                        attributes: [
                            "id",
                            "name",
                            "email"
                        ]
                    }]
                });

                const otherMember = members
                    .map((m) => m.User)
                    .find(
                        (u) =>
                            u &&
                            u.id !== userId
                    );

                if (otherMember) {

                    displayName =
                        otherMember.name;

                    otherUserId =
                        otherMember.id;

                } else {

                    displayName =
                        "Unknown User";
                }
            }

                const unreadCount = await MessageRecipient.count({
                    where: {
                        recipientId: userId,
                        status: { [Op.ne]: "read" }
                    },
                    include: [{
                        model: Message,
                        attributes: [],
                        where: { roomId: room.id },
                        required: true
                    }]
                });

                return {
                    id: room.id,
                    type: room.type,
                    name: displayName,
                    purpose: room.type === "group" ? ((await SpaceDetails.findOne({ where: { roomId: room.id } }))?.purpose || null) : null,
                    otherUserId,
                    unreadCount,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        messageType: lastMessage.messageType,
                        fileName: lastMessage.fileName,
                        senderId: lastMessage.senderId,
                        senderName: lastMessage.Sender ? lastMessage.Sender.name : null,
                        createdAt: lastMessage.createdAt
                    } : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            rooms: roomsWithDetails
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

exports.createOrGetPersonalRoom = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const email = (req.body.email || "").trim();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "email is required"
            });
        }

        const otherUser = await User.findOne({ where: { email } });

        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (otherUser.id === currentUserId) {
            return res.status(400).json({
                success: false,
                message: "Cannot start a personal chat with yourself"
            });
        }

        const connected = await areUsersConnected(currentUserId, otherUser.id);
        if (!connected) {
            return res.status(403).json({
                success: false,
                message: "You can only start a personal chat with a connected user"
            });
        }

        let room = await findPersonalRoom(currentUserId, otherUser.id);

        if (!room) {
            room = await Room.create({
                type: "personal",
                createdBy: currentUserId
            });

            await RoomMember.bulkCreate([
                { roomId: room.id, userId: currentUserId },
                { roomId: room.id, userId: otherUser.id }
            ]);
        }

        return res.status(200).json({
            success: true,
            room: {
                id: room.id,
                type: room.type,
                name: otherUser.name,
                otherUserId: otherUser.id
            }
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


