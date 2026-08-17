const { Server } = require("socket.io");

const socketAuthentication = require("./middleware");
const roomHandler = require("./handlers/room");



const initializeSocket = (server) => {

    const io = new Server(server, {
        cors: {
            origin: "*"
        }
    });


    // Socket authentication middleware
    io.use(socketAuthentication);


    // Socket connection
    io.on("connection", (socket) => {

        console.log(
            "Authenticated user connected:",
            socket.user.userId,
            socket.user.name
        );


         roomHandler(io, socket);

       socket.on("disconnect", (reason) => {
            console.log(
                "User disconnected:",
                socket.user.userId,
                socket.user.name,
                "-",
                reason
            );
        });

    });


    return io;
};


module.exports = initializeSocket;