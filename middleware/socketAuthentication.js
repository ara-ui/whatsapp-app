const jwt = require("jsonwebtoken");

const socketAuthentication = (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication error: Token missing"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.user = decoded;

        console.log("Socket authenticated:", decoded);
        
        next();

    } catch (err) {
        console.log("Socket authentication failed:", err.message);

        next(new Error("Authentication error: Invalid token"));
    }
};

module.exports = socketAuthentication;