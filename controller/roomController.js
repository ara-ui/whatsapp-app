const { Op } = require("sequelize");

const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const Message = require("../models/Message");
const User = require("../models/User");
const MessageRecipient = require("../models/MessageRecipient");


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

        // Rooms this user explicitly belongs to (personal + group)
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

                // Personal rooms have no name of their own —
                // show the OTHER participant's name instead.
                if (room.type === "personal") {

                    const members = await RoomMember.findAll({
                        where: { roomId: room.id },
                        include: [{
                            model: User,
                            attributes: ["id", "name", "email"]
                        }]
                    });

                    const otherMember = members
                        .map((m) => m.User)
                        .find((u) => u && u.id !== userId);

                    displayName = otherMember ? otherMember.name : "Unknown User";
                }

                // Unread badge: how many messages in this room are
                // still waiting to be read BY the current user.
                // (Community messages never get MessageRecipient rows,
                // so this naturally comes back 0 for the community room.)
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
                    unreadCount,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
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


// =========================================================
// POST /rooms/personal
// Body: { email }  -> email of the OTHER user
//
// Server-authoritative personal room creation: the client only
// tells us WHO it wants to chat with. We look up (or create)
// the room and hand back its real, server-assigned id. The
// frontend never computes or sends a room id itself.
// =========================================================
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
                name: otherUser.name
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


exports.createGroupRoom = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { name, memberEmails } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        if (!Array.isArray(memberEmails) || memberEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one member email is required"
            });
        }

        // Normalize (trim + lowercase) and dedupe the input list itself
        const normalizedEmails = [...new Set(
            memberEmails
                .map((e) => (e || "").trim().toLowerCase())
                .filter(Boolean)
        )];

        if (normalizedEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid member email is required"
            });
        }

        const members = await User.findAll({
            where: { email: { [Op.in]: normalizedEmails } }
        });

        const foundEmails = members.map((u) => u.email.toLowerCase());
        const invalidEmails = normalizedEmails.filter((e) => !foundEmails.includes(e));

        if (invalidEmails.length > 0) {
            return res.status(400).json({
                success: false,
                message: `These emails are not registered users: ${invalidEmails.join(", ")}`
            });
        }

        const room = await Room.create({
            type: "group",
            name: name.trim(),
            createdBy: currentUserId
        });

        // Set dedupes automatically — creator is always included exactly
        // once even if they also listed their own email as a member.
        const memberIds = new Set(members.map((u) => u.id));
        memberIds.add(currentUserId);

        const memberRows = Array.from(memberIds).map((userId) => ({
            roomId: room.id,
            userId
        }));

        await RoomMember.bulkCreate(memberRows);

        return res.status(201).json({
            success: true,
            room: {
                id: room.id,
                type: room.type,
                name: room.name
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
