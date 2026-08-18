const Room = require("../../models/Room");
const Message = require("../../models/Message");
const User = require("../../models/User");
const RoomMember = require("../../models/RoomMember");

const {
    createRecipientRows,
    markDelivered,
    markRead,
    getMessageStatus
} = require("../../utils/messageStatus");

const {
    isAuthorizedForRoom
} = require("../../utils/roomAuthorization");


const roomHandler = (io, socket) => {


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
            }


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
                        message.createdAt
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
 
    socket.on(
        "room:messageDelivered",
        async (messageId) => {

            console.log(
                "🚚 DELIVERY EVENT RECEIVED:",
                messageId,
                "user:",
                socket.user.userId
            );
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


                const message =
                    await Message.findByPk(id);


                if (!message) {
                    return;
                }


                const room =
                    await Room.findByPk(
                        message.roomId
                    );


                if (
                    !room ||
                    room.type === "community"
                ) {
                    return;
                }


                const status =
                    await getMessageStatus(
                        id,
                        message.senderId,
                        room.type
                    );


                io.to(String(room.id)).emit(
                    "room:messageStatus",
                    {
                        messageId: id,
                        status
                    }
                );

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

            console.log(
                "🚚 READ EVENT RECEIVED:",
                messageId,
                "user:",
                socket.user.userId
            );
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


                const message =
                    await Message.findByPk(id);


                if (!message) {
                    return;
                }


                const room =
                    await Room.findByPk(
                        message.roomId
                    );


                if (
                    !room ||
                    room.type === "community"
                ) {
                    return;
                }


                const status =
                    await getMessageStatus(
                        id,
                        message.senderId,
                        room.type
                    );


                io.to(String(room.id)).emit(
                    "room:messageStatus",
                    {
                        messageId: id,
                        status
                    }
                );

            } catch (err) {

                console.log(
                    "Read status error:",
                    err
                );
            }
        }
    );

};


// =============================================================
// EXPORT
// =============================================================

module.exports = roomHandler;