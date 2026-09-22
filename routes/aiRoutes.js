const express = require("express");

const router = express.Router();

const {
    getSmartReplies
} = require("../controller/aiController");

const { authenticate } = require("../middleware/authentication");
const { smartRepliesLimiter } = require("../middleware/aiRateLimiter");


router.post(
    "/smart-replies",
    authenticate,
    smartRepliesLimiter,
    getSmartReplies
);


module.exports = router;