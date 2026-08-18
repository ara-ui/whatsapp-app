const User = require("./User");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const Message = require("./Message");
const MessageRecipient =require("./MessageRecipient");

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

// Room <-> User through RoomMember.
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


// Message -> MessageRecipient

Message.hasMany(MessageRecipient, {
    foreignKey: "messageId",
    constraints: false
});

MessageRecipient.belongsTo(Message, {
    foreignKey: "messageId",
    constraints: false
});


// User -> MessageRecipient

User.hasMany(MessageRecipient, {
    foreignKey: "recipientId",
    constraints: false
});

MessageRecipient.belongsTo(User, {
    foreignKey: "recipientId",
    constraints: false
});
module.exports = {
    User,
    Room,
    RoomMember,
    Message,
    MessageRecipient
};
