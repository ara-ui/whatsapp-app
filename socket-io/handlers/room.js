const Room = require("../../models/Room");
const Message = require("../../models/Message");
const User = require("../../models/User");

const { isAuthorizedForRoom } = require("../../utils/roomAuthorization");


const roomHandler = (io, socket) => {


    socket.on("room:join", async (rawRoomId) => {
        try {
            const roomId = parseInt(rawRoomId, 10);

            if (isNaN(roomId)) {
                socket.emit("room:error", { message: "Invalid room id" });
                return;
            }

            const room = await Room.findByPk(roomId);

            if (!room) {
                socket.emit("room:error", { message: "Room not found" });
                return;
            }

            const authorized = await isAuthorizedForRoom(socket.user.userId, room);

            if (!authorized) {
                socket.emit("room:error", { message: "You are not a member of this room" });
                return;
            }

            socket.join(String(room.id));

            console.log(`${socket.user.name} joined room ${room.id} (${room.type})`);

        } catch (err) {
            console.log(err);
            socket.emit("room:error", { message: "Failed to join room" });
        }
    });
    
    
    socket.on("room:send", async (payload) => {
        try {
            const { content } = payload || {};
            const roomId = parseInt(payload && payload.roomId, 10);

            if (isNaN(roomId)) {
                socket.emit("room:error", { message: "Invalid room id" });
                return;
            }

            if (!content || !content.trim()) {
                socket.emit("room:error", { message: "Message cannot be empty" });
                return;
            }

            const room = await Room.findByPk(roomId);

            if (!room) {
                socket.emit("room:error", { message: "Room not found" });
                return;
            }

            const authorized = await isAuthorizedForRoom(socket.user.userId, room);

            if (!authorized) {
                socket.emit("room:error", { message: "You are not a member of this room" });
                return;
            }

            const message = await Message.create({
                roomId: room.id,
                senderId: socket.user.userId,
                content: content.trim()
            });

            const sender = await User.findByPk(socket.user.userId, {
                attributes: ["id", "name"]
            });

            io.to(String(room.id)).emit("room:message", {
                id: message.id,
                roomId: room.id,
                senderId: message.senderId,
                senderName: sender ? sender.name : socket.user.name,
                content: message.content,
                createdAt: message.createdAt
            });

        } catch (err) {
            console.log(err);
            socket.emit("room:error", { message: "Failed to send message" });
        }
    });

};

module.exports = roomHandler;
