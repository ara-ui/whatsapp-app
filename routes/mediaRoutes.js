const express = require("express");
const router = express.Router();

const { uploadMedia } = require("../controller/mediaController");
const { authenticate } = require("../middleware/authentication");

// multipart/form-data: { file, roomId } -> POST /media/upload
router.post("/upload", authenticate, uploadMedia);

module.exports = router;
