const {
    getAllRoomIdsForUser
} = require("../../utils/roomAuthorization");


const onlineUsers = new Map();

// PRESENCE HANDLER

function presenceHandler(io, socket) {

    const userId =
        Number(socket.user.userId);

    const userName =
        socket.user.name;


    // USER CONNECTED
    
    if (!onlineUsers.has(userId)) {

        onlineUsers.set(
            userId,
            new Set()
        );
    }


    onlineUsers
        .get(userId)
        .add(socket.id);

   // NOTIFY ROOMS THAT USER IS ONLINE
    
    notifyUserOnline(
        io,
        userId
    );

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
            // Make sure this socket actually
            // belongs to this room.
            if (
                !socket.rooms.has(
                    roomIdString
                )
            ) {
                return;
            }


            socket.to(roomIdString).emit(
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


            socket.to(roomIdString).emit(
                "typing:stop",
                {
                    userId
                }
            );
        }
    );

    // DISCONNECT
    
    socket.on(
        "disconnect",
        () => {

            const userSockets =
                onlineUsers.get(userId);


            if (!userSockets) {
                return;
            }


            userSockets.delete(
                socket.id
            );


            // User still has another
            // active browser/device connection.
            if (
                userSockets.size > 0
            ) {
                return;
            }


            // User is completely offline.
            onlineUsers.delete(
                userId
            );


            notifyUserOffline(
                io,
                userId
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
                    "presence:userOffline",
                    {
                        userId
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