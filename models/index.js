const User = require("./User");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const Message = require("./Message");
const MessageRecipient =require("./MessageRecipient");
const MessageDeletion = require("./MessageDeletion");
const Connection = require("./Connection");
const ForgotPassword=require("./ForgotPassword");

// User <-> Connection. Connections store an ordered user pair so the same
// relationship cannot be represented by both (A,B) and (B,A).
User.hasMany(Connection, { foreignKey: "userAId", onDelete: "CASCADE" });
User.hasMany(Connection, { foreignKey: "userBId", onDelete: "CASCADE" });
Connection.belongsTo(User, { foreignKey: "userAId", as: "UserA" });
Connection.belongsTo(User, { foreignKey: "userBId", as: "UserB" });
Connection.belongsTo(User, { foreignKey: "requestedById", as: "Requester" });

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

// Per-user "delete for me" records. MessageDeletions intentionally has no
// cascading foreign key because the same message id may move to ArchivedMessages.
Message.hasMany(MessageDeletion, {
    foreignKey: "messageId",
    constraints: false
});

MessageDeletion.belongsTo(Message, {
    foreignKey: "messageId",
    constraints: false
});

User.hasMany(MessageDeletion, {
    foreignKey: "userId",
    constraints: false
});

MessageDeletion.belongsTo(User, {
    foreignKey: "userId",
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

User.hasMany(ForgotPassword, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});

ForgotPassword.belongsTo(User, {
    foreignKey: "userId"
});

module.exports = {
    User,
    Room,
    RoomMember,
    Message,
    MessageRecipient,
    MessageDeletion,
    Connection,
    ForgotPassword
};
