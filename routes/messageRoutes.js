const express = require("express");
const router = express.Router();

const {
    getRoomMessages,
    deleteMessageForMe
} = require("../controller/messageController");
const { authenticate } = require("../middleware/authentication");

// Mounted at "/rooms" in app.js, alongside roomRoutes.js
// -> GET /rooms/:roomId/messages
router.get("/:roomId/messages", authenticate, getRoomMessages);
router.delete("/messages/:messageId/me", authenticate, deleteMessageForMe);

module.exports = router;
