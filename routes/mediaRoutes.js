const express = require("express");
const router = express.Router();

const {
    uploadMedia,
    getSignedMediaUrl,
    downloadMedia
} = require("../controller/mediaController");
const { authenticate } = require("../middleware/authentication");

//  upload media file
router.post("/upload", authenticate, uploadMedia);

//  Get signed URL for viewing media
router.get("/:messageId/url", authenticate, getSignedMediaUrl);

//  Get signed URL for downloading media
router.get("/:messageId/download", authenticate, downloadMedia);

module.exports = router;
