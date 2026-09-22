const { Server } = require("socket.io");

const socketAuthentication = require("./middleware");
const roomHandler = require("./handlers/room");
const {presenceHandler} = require("./handlers/presence");
const { getAllowedOrigins } = require("../utils/config");


const initializeSocket = (server) => {

    const io = new Server(server, {
        cors: {
            origin: getAllowedOrigins()
        }
    });


    // Socket authentication middleware
    io.use(socketAuthentication);


    // Socket connection
    io.on("connection", (socket) => {

        socket.join(`user:${socket.user.userId}`);

         roomHandler(io, socket);

         presenceHandler(io,socket);

       socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
        });

    });


    return io;
};


module.exports = initializeSocket;