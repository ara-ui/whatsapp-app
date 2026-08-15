const { Server } = require("socket.io");

const socketAuthentication = require("./middleware");
const chatHandler = require("./handlers/chat");
const personalChatHandler=require("./handlers/personalChat");



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


        // Register chat events
        chatHandler(io, socket);

        // Personal chat
        personalChatHandler(io, socket);
        
    });


    return io;
};


module.exports = initializeSocket;