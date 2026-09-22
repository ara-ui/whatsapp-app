const express = require("express");
const router = express.Router();

const {
    getRoomMessages,
    deleteMessageForMe,
    deleteMessageForEveryone
} = require("../controller/messageController");
const { authenticate } = require("../middleware/authentication");

// Mounted at "/rooms" in app.js, alongside roomRoutes.js
// -> GET /rooms/:roomId/messages
router.get("/:roomId/messages", authenticate, getRoomMessages);
router.delete("/messages/:messageId/me", authenticate, deleteMessageForMe);


router.delete("/messages/:messageId/everyone", authenticate, deleteMessageForEveryone);

module.exports = router;