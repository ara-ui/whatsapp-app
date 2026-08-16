const RoomMember = require("../models/RoomMember");

async function isAuthorizedForRoom(userId, room) {
    if (!room) {
        return false;
    }

    if (room.type === "community") {
        return true;
    }

    const membership = await RoomMember.findOne({
        where: {
            roomId: room.id,
            userId: userId
        }
    });

    return !!membership;
}

module.exports = { isAuthorizedForRoom };
