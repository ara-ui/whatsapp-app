const User = require("./User");
const Chat = require("./Chat");

// Associations

User.hasMany(Chat, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});

Chat.belongsTo(User, {
    foreignKey: "userId"
});

module.exports = {
    User,
    Chat
};