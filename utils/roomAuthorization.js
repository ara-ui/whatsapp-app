const RoomMember = require("../models/RoomMember");
const Room = require("../models/Room");

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

// ============================================================
// Every room a user belongs to (personal + group), plus the
// single shared community room.
//
// Used to auto-join a user's socket to ALL of their rooms as
// soon as they connect — not just the one they currently have
// open in the UI. Without this, a message sent to a room the
// recipient hasn't explicitly opened in this session would
// never reach their socket at all, since Socket.IO only
// delivers "io.to(roomId).emit(...)" to sockets that have
// actually joined that room.
// ============================================================
async function getAllRoomIdsForUser(userId) {

    const memberships = await RoomMember.findAll({
        where: { userId },
        attributes: ["roomId"]
    });

    const roomIds = memberships.map(m => m.roomId);

    const communityRoom = await Room.findOne({
        where: { type: "community" }
    });

    if (communityRoom) {
        roomIds.push(communityRoom.id);
    }

    return [...new Set(roomIds)];
}

module.exports = { isAuthorizedForRoom, getAllRoomIdsForUser };
