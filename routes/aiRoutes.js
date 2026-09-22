const express = require("express");

const router = express.Router();

const {
    getSmartReplies,
    getPredictiveSuggestions
} = require("../controller/aiController");

const { authenticate } = require("../middleware/authentication");
const { smartRepliesLimiter, predictiveLimiter } = require("../middleware/aiRateLimiter");


router.post(
    "/smart-replies",
    authenticate,
    smartRepliesLimiter,
    getSmartReplies
);


router.post(
    "/predictive",
    authenticate,
    predictiveLimiter,
    getPredictiveSuggestions
);


module.exports = router;