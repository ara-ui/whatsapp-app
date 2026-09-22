const Room = require("../../models/Room");
const Message = require("../../models/Message");
const User = require("../../models/User");

const {
    createRecipientRows,
    markDelivered,
    markRead,
    markAllDeliveredForUser,
    markAllReadForRoom,
    getMessageStatus,
    getRecipientIdsForRoom
} = require("../../utils/messageStatus");

const {
    isAuthorizedForRoom,
    getAllRoomIdsForUser
} = require("../../utils/roomAuthorization");
const { areUsersConnected } = require("../../utils/connection");
const RoomMember = require("../../models/RoomMember");
const ArchivedMessage = require("../../models/ArchivedMessage");
const { getDeletedMessageIdsForUser } = require("../../utils/messageDeletion");

async function broadcastMessageStatus(io, messageId) {

    const message = await Message.findByPk(messageId);

    if (!message) {
        return;
    }

    const room = await Room.findByPk(message.roomId);

    if (!room || room.type === "community") {
        return;
    }

    const status = await getMessageStatus(
        message.id,
        message.senderId,
        room.type
    );

    io.to(String(room.id)).emit(
        "room:messageStatus",
        {
            messageId: message.id,
            status
        }
    );
}


async function getAuthorizedReplyTarget(replyToMessageId, roomId, userId) {
    if (!replyToMessageId) return null;

    const id = Number.parseInt(replyToMessageId, 10);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid reply message");
    }

    let target = await Message.findByPk(id);
    if (!target) target = await ArchivedMessage.findByPk(id);

    if (!target || Number(target.roomId) !== Number(roomId)) {
        throw new Error("Reply target not found in this room");
    }

    const deletedIds = await getDeletedMessageIdsForUser(userId, [target.id]);
    if (deletedIds.has(String(target.id))) {
        throw new Error("You cannot reply to a message you deleted for yourself");
    }

    return target;
}


const roomHandler = (io, socket) => {

       (async () => {

        try {

            const roomIds =
                await getAllRoomIdsForUser(socket.user.userId);

            roomIds.forEach(roomId => {
                socket.join(String(roomId));
            });

            const deliveredMessageIds =
                await markAllDeliveredForUser(socket.user.userId);

            await Promise.all(
                deliveredMessageIds.map(messageId =>
                    broadcastMessageStatus(io, messageId)
                )
            );

        } catch (err) {

            console.log(
                "Auto-join / offline delivery sync error:",
                err
            );
        }
    })();


    // JOIN ROOM
  
    socket.on("room:join", async (rawRoomId) => {

        try {

            const roomId = parseInt(rawRoomId, 10);

            if (isNaN(roomId)) {

                socket.emit("room:error", {
                    message: "Invalid room id"
                });

                return;
            }

            const room = await Room.findByPk(roomId);

            if (!room) {

                socket.emit("room:error", {
                    message: "Room not found"
                });

                return;
            }

            const authorized =
                await isAuthorizedForRoom(
                    socket.user.userId,
                    room
                );

            if (!authorized) {

                socket.emit("room:error", {
                    message: "You are not a member of this room"
                });

                return;
            }

            socket.join(String(room.id));

            console.log(
                `${socket.user.name} joined room ${room.id} (${room.type})`
            );

            const readMessageIds =
            await markAllReadForRoom(
                room.id,
                socket.user.userId
            );


        if (room.type !== "community") {

            await Promise.all(
                readMessageIds.map(messageId =>
                    broadcastMessageStatus(
                        io,
                        messageId
                    )
                )
            );
        }

        } catch (err) {

            console.log(err);

            socket.emit("room:error", {
                message: "Failed to join room"
            });
        }
    });

    // SEND MESSAGE
   
    socket.on("room:send", async (payload) => {

        try {

            const { content, replyToMessageId } = payload || {};

            const roomId =
                parseInt(
                    payload && payload.roomId,
                    10
                );


            if (isNaN(roomId)) {

                socket.emit("room:error", {
                    message: "Invalid room id"
                });

                return;
            }


            if (!content || !content.trim()) {

                socket.emit("room:error", {
                    message: "Message cannot be empty"
                });

                return;
            }


            const room =
                await Room.findByPk(roomId);


            if (!room) {

                socket.emit("room:error", {
                    message: "Room not found"
                });

                return;
            }


            const authorized =
                await isAuthorizedForRoom(
                    socket.user.userId,
                    room
                );


            if (!authorized) {

                socket.emit("room:error", {
                    message: "You are not a member of this room"
                });

                return;
            }

            if (room.type === "personal") {
                const members = await RoomMember.findAll({
                    where: { roomId: room.id },
                    attributes: ["userId"]
                });

                const otherMember = members.find(
                    member => Number(member.userId) !== Number(socket.user.userId)
                );

                if (!otherMember || !(await areUsersConnected(
                    socket.user.userId,
                    otherMember.userId
                ))) {
                    socket.emit("room:error", {
                        message: "You must be connected to this user to send messages"
                    });
                    return;
                }
            }


            let replyTarget = null;
            try {
                replyTarget = await getAuthorizedReplyTarget(
                    replyToMessageId,
                    room.id,
                    socket.user.userId
                );
            } catch (replyError) {
                socket.emit("room:error", { message: replyError.message });
                return;
            }

            // Create message

            const message =
                await Message.create({

                    roomId: room.id,

                    senderId:
                        socket.user.userId,

                    replyToMessageId: replyTarget ? replyTarget.id : null,

                    content:
                        content.trim()
                });



             // CREATE DELIVERY / READ TRACKING
           
            const recipientIds = await getRecipientIdsForRoom(room);

            await createRecipientRows(
                message,
                recipientIds
            );

            const socketsInRoom =
                io.sockets.adapter.rooms.get(
                    String(room.id)
                ) || new Set();

            const onlineUserIds = new Set();

            socketsInRoom.forEach(socketId => {

                const memberSocket =
                    io.sockets.sockets.get(socketId);

                if (
                    memberSocket &&
                    memberSocket.user &&
                    Number(memberSocket.user.userId) !==
                        Number(message.senderId)
                ) {
                    onlineUserIds.add(
                        Number(memberSocket.user.userId)
                    );
                }
            });

            await Promise.all(
                [...onlineUserIds].map(userId =>
                    markDelivered(
                        message.id,
                        userId
                    )
                )
            );

            
            const initialStatus =
                await getMessageStatus(
                    message.id,
                    message.senderId,
                    room.type
                );


            // Get sender information

            const sender =
                await User.findByPk(
                    socket.user.userId,
                    {
                        attributes: [
                            "id",
                            "name"
                        ]
                    }
                );

            const replyTargetSender = replyTarget && Number(replyTarget.senderId) !== Number(socket.user.userId)
                ? await User.findByPk(replyTarget.senderId, { attributes: ["id", "name"] })
                : sender;


            // Broadcast message

            io.to(String(room.id)).emit(
                "room:message",
                {

                    id: message.id,

                    roomId: room.id,

                    senderId:
                        message.senderId,

                    senderName:
                        sender
                            ? sender.name
                            : socket.user.name,

                    messageType:
                        message.messageType,

                    content:
                        message.content,

                    mediaUrl:
                        message.mediaUrl,

                    fileName:
                        message.fileName,

                    mimeType:
                        message.mimeType,

                    createdAt:
                        message.createdAt,

                    status:
                        initialStatus,

                    replyToMessageId: message.replyToMessageId,
                    replyToMessage: replyTarget
                        ? {
                            id: replyTarget.id,
                            senderId: replyTarget.senderId,
                            senderName: replyTargetSender ? replyTargetSender.name : null,
                            content: replyTarget.content,
                            messageType: replyTarget.messageType,
                            fileName: replyTarget.fileName
                        }
                        : null
                }
            );

        } catch (err) {

            console.log(err);

            socket.emit("room:error", {
                message: "Failed to send message"
            });
        }
    });


    socket.on(
        "room:messageDelivered",
        async (messageId) => {

            try {

                const id =
                    parseInt(messageId, 10);


                if (isNaN(id)) {
                    return;
                }


                await markDelivered(
                    id,
                    socket.user.userId
                );


                await broadcastMessageStatus(io, id);

            } catch (err) {

                console.log(
                    "Delivery status error:",
                    err
                );
            }
        }
    );

 // MESSAGE READ
   
    socket.on(
        "room:markRead",
        async ({ messageId }) => {

            try {

                const id =
                    parseInt(messageId, 10);


                if (isNaN(id)) {
                    return;
                }


                await markRead(
                    id,
                    socket.user.userId
                );


                await broadcastMessageStatus(io, id);

            } catch (err) {

                console.log(
                    "Read status error:",
                    err
                );
            }
        }
    );

};
// EXPORT

module.exports = roomHandler;