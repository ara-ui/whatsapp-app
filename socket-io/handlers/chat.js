const chatHandler = (io, socket) => {

    socket.on("new-message", () => {

        io.emit("refresh-chat");

    });

    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.user.userId
        );

    });

};

module.exports = chatHandler;