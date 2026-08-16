const express = require("express");
const router = express.Router();

const {
    getRooms,
    createOrGetPersonalRoom,
    createGroupRoom
} = require("../controller/roomController");

const { authenticate } = require("../middleware/authentication");

router.get("/", authenticate, getRooms);

router.post("/personal", authenticate, createOrGetPersonalRoom);

router.post("/group", authenticate, createGroupRoom);

module.exports = router;
