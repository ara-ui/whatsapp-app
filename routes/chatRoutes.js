const express = require("express");

const router = express.Router();

const {getMessages,sendMessage} = require("../controller/chatController");

const {authenticate} = require("../middleware/authentication");

router.post(
    "/send",
    authenticate,sendMessage
);

router.get(
    "/messages",authenticate,
    getMessages
);

module.exports = router;