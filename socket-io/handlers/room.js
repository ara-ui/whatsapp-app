const Room = require("../../models/Room");
const Message = require("../../models/Message");
const User = require("../../models/User");
const RoomMember = require("../../models/RoomMember");

const {
    createRecipientRows,
    markDelivered,
    markRead,
    markAllDeliveredForUser,
    markAllReadForRoom,
    getMessageStatus
} = require("../../utils/messageStatus");

const {
    isAuthorizedForRoom,
    getAllRoomIdsForUser
} = require("../../utils/roomAuthorization");


// ============================================================
// Recompute a message's status and broadcast it to its room.
// Small shared helper so every place that changes delivery/read
// state reports it back to the sender the same way.
// ============================================================
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


const roomHandler = (io, socket) => {

    // ========================================================
    // ON CONNECT
    // ========================================================
    // Two things need to happen the moment a user's socket
    // connects, BEFORE they've opened any specific conversation:
    //
    // 1. Auto-join every room this user belongs to (not just the
    //    one currently open in the UI). Socket.IO only delivers
    //    `io.to(roomId).emit(...)` to sockets that have actually
    //    joined that room, so without this a message sent to a
    //    conversation the recipient hasn't opened yet in this
    //    session would never reach their socket at all — no
    //    delivered tick, no chat-list update, nothing.
    //
    // 2. Anything that was sitting at "sent" while this user was
    //    offline becomes "delivered" now that their client is
    //    actually able to receive it, and every sender who's
    //    waiting on that message gets notified.
    // ========================================================
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

            // The user is now actively looking at this
            // conversation, so everything in it that isn't
            // already "read" becomes "read" — this is the
            // signal that turns the sender's ticks blue and
            // clears this user's unread badge for the room.
            if (room.type !== "community") {

                const readMessageIds =
                    await markAllReadForRoom(
                        room.id,
                        socket.user.userId
                    );

                await Promise.all(
                    readMessageIds.map(messageId =>
                        broadcastMessageStatus(io, messageId)
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

            const { content } = payload || {};

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


            // Create message

            const message =
                await Message.create({

                    roomId: room.id,

                    senderId:
                        socket.user.userId,

                    content:
                        content.trim()
                });



                // CREATE DELIVERY / READ TRACKING
           
            if (room.type !== "community") {

                const members =
                    await RoomMember.findAll({

                        where: {
                            roomId: room.id
                        },

                        attributes: [
                            "userId"
                        ]
                    });


                const recipientIds =
                    members.map(
                        member => member.userId
                    );


                await createRecipientRows(
                    message,
                    recipientIds
                );


                // Anyone other than the sender who is
                // currently online (their socket has already
                // joined this room — every member auto-joins
                // all their rooms on connect) has, by
                // definition, just received this message on
                // their device. That's a "delivered" tick,
                // NOT "read" — reading only happens once they
                // actually open this specific conversation
                // (see "room:join" above).
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
                        markDelivered(message.id, userId)
                    )
                );
            }


            // Compute the message's status right away so the
            // sender's own UI doesn't have to wait for a
            // separate "room:messageStatus" round trip just to
            // show the correct first tick.
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
                        initialStatus
                }
            );

        } catch (err) {

            console.log(err);

            socket.emit("room:error", {
                message: "Failed to send message"
            });
        }
    });


    // MESSAGE DELIVERED
    // Kept for compatibility with the existing event name/shape.
    // In practice delivery is now decided server-side at send time
    // (see "room:send" above) and on reconnect (see "ON CONNECT"
    // above), so this mostly matters as a manual fallback.
 
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