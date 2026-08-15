const personalChatHandler = (io, socket) => {

    socket.on("join_room", (room) => {

        socket.join(room);

        console.log(
            `${socket.user.name} joined room: ${room}`
        );

    });


    socket.on("new_message", (data) => {

        const { room, message } = data;

        io.to(room).emit("new_message", {
            message,
            senderId: socket.user.userId,
            senderName: socket.user.name
        });

    });

};


module.exports = personalChatHandler;