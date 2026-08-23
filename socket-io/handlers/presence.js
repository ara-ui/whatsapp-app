const {
    getAllRoomIdsForUser
} = require("../../utils/roomAuthorization");

const User = require("../../models/User");

const onlineUsers = new Map();

// PRESENCE HANDLER

function presenceHandler(io, socket) {

    const userId =
        Number(socket.user.userId);

    const userName =
        socket.user.name;

     // USER CONNECTED
    
    let userSockets =
        onlineUsers.get(userId);

    const wasOffline =
        !userSockets ||
        userSockets.size === 0;


    if (!userSockets) {

        userSockets = new Set();

        onlineUsers.set(
            userId,
            userSockets
        );
    }


    userSockets.add(
        socket.id
    );


    // User changed from offline → online.
    if (wasOffline) {

        notifyUserOnline(
            io,
            userId
        );
    }


      // TYPING START
    
    socket.on(
        "typing:start",
        ({ roomId }) => {

            if (!roomId) {
                return;
            }


            const roomIdString =
                String(roomId);


            // Security:
            // Make sure this socket has
            // actually joined this room.
            if (
                !socket.rooms.has(
                    roomIdString
                )
            ) {
                return;
            }


            socket
                .to(roomIdString)
                .emit(
                    "typing:start",
                    {
                        userId,
                        userName
                    }
                );
        }
    );

      // TYPING STOP
   
    socket.on(
        "typing:stop",
        ({ roomId }) => {

            if (!roomId) {
                return;
            }


            const roomIdString =
                String(roomId);


            if (
                !socket.rooms.has(
                    roomIdString
                )
            ) {
                return;
            }


            socket
                .to(roomIdString)
                .emit(
                    "typing:stop",
                    {
                        userId
                    }
                );
        }
    );
   // GET USER PRESENCE STATUS

    socket.on(
        "presence:getStatus",
        async ({ userId }) => {

            try {

                const targetUserId =
                    Number(userId);

                if (!targetUserId) {
                    return;
                }


                // Check whether the user currently
                // has at least one active socket.
                const userSockets =
                    onlineUsers.get(
                        targetUserId
                    );


                const isOnline =
                    userSockets &&
                    userSockets.size > 0;


                // User is currently online.
                if (isOnline) {

                    socket.emit(
                        "presence:status",
                        {
                            userId: targetUserId,
                            online: true,
                            lastSeenAt: null
                        }
                    );

                    return;
                }

               const user =
                    await User.findByPk(
                        targetUserId,
                        {
                            attributes: [
                                "id",
                                "lastSeenAt"
                            ]
                        }
                    );


                if (!user) {
                    return;
                }


                socket.emit(
                    "presence:status",
                    {
                        userId: targetUserId,
                        online: false,
                        lastSeenAt:
                            user.lastSeenAt
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Failed to get presence status:",
                    error
                );
            }
        }
    );

     // DISCONNECT
   
    socket.on(
        "disconnect",
        async () => {

            const userSockets =
                onlineUsers.get(userId);


            if (!userSockets) {
                return;
            }


            // Remove this particular
            // socket connection.
            userSockets.delete(
                socket.id
            );


            // User still has another
            // active tab/device.
            if (
                userSockets.size > 0
            ) {
                return;
            }

            // USER IS COMPLETELY OFFLINE
          
            onlineUsers.delete(
                userId
            );


            const lastSeenAt =
                new Date();


            // Save last seen time.
            try {

                await User.update(
                    {
                        lastSeenAt
                    },
                    {
                        where: {
                            id: userId
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Failed to save last seen:",
                    error
                );
            }


            // Tell other users.
            notifyUserOffline(
                io,
                userId,
                lastSeenAt
            );
        }
    );
}

// USER ONLINE

async function notifyUserOnline(
    io,
    userId
) {

    try {

        const roomIds =
            await getAllRoomIdsForUser(
                userId
            );


        roomIds.forEach(
            roomId => {

                io.to(
                    String(roomId)
                ).emit(
                    "presence:userOnline",
                    {
                        userId
                    }
                );
            }
        );

    } catch (error) {

        console.error(
            "❌ Failed to broadcast user online:",
            error
        );
    }
}

// USER OFFLINE

async function notifyUserOffline(
    io,
    userId,
    lastSeenAt
) {

    try {

        const roomIds =
            await getAllRoomIdsForUser(
                userId
            );


        roomIds.forEach(
            roomId => {

                io.to(
                    String(roomId)
                ).emit(
                    "presence:userOffline",
                    {
                        userId,
                        lastSeenAt
                    }
                );
            }
        );

    } catch (error) {

        console.error(
            "❌ Failed to broadcast user offline:",
            error
        );
    }
}

// EXPORT

module.exports = {
    presenceHandler,
    onlineUsers
};