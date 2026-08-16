const User = require("./User");
const Chat = require("./Chat");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const Message = require("./Message");

// Associations

User.hasMany(Chat, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});

Chat.belongsTo(User, {
    foreignKey: "userId"
});

// Room <-> RoomMember (one room has many membership rows)
Room.hasMany(RoomMember, {
    foreignKey: "roomId",
    onDelete: "CASCADE"
});
RoomMember.belongsTo(Room, {
    foreignKey: "roomId"
});

// User <-> RoomMember (one user has many membership rows)
User.hasMany(RoomMember, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});
RoomMember.belongsTo(User, {
    foreignKey: "userId"
});

// Convenience many-to-many: Room <-> User through RoomMember.
// Lets us do Room.getMembers() / User.getRooms() directly.
Room.belongsToMany(User, {
    through: RoomMember,
    foreignKey: "roomId",
    otherKey: "userId",
    as: "members"
});
User.belongsToMany(Room, {
    through: RoomMember,
    foreignKey: "userId",
    otherKey: "roomId",
    as: "rooms"
});

// Room <-> Message (one room has many messages)
Room.hasMany(Message, {
    foreignKey: "roomId",
    onDelete: "CASCADE"
});
Message.belongsTo(Room, {
    foreignKey: "roomId"
});

// User <-> Message as sender (one user sends many messages)
User.hasMany(Message, {
    foreignKey: "senderId",
    onDelete: "CASCADE"
});
Message.belongsTo(User, {
    foreignKey: "senderId",
    as: "Sender"
});

module.exports = {
    User,
    Chat,
    Room,
    RoomMember,
    Message
};
