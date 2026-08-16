const express = require("express");
const router = express.Router();

const { getRoomMessages } = require("../controller/messageController");
const { authenticate } = require("../middleware/authentication");

// Mounted at "/rooms" in app.js, alongside roomRoutes.js
// -> GET /rooms/:roomId/messages
router.get("/:roomId/messages", authenticate, getRoomMessages);

module.exports = router;
