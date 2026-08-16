const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");

const { isAuthorizedForRoom } = require("../utils/roomAuthorization");


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

        const messages = await Message.findAll({
            where: { roomId: room.id },
            order: [["createdAt", "ASC"]],
            include: [{
                model: User,
                as: "Sender",
                attributes: ["id", "name"]
            }]
        });

        const formatted = messages.map((m) => ({
            id: m.id,
            roomId: m.roomId,
            senderId: m.senderId,
            senderName: m.Sender ? m.Sender.name : null,
            content: m.content,
            createdAt: m.createdAt
        }));

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
