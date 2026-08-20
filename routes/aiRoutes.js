const express = require("express");

const router = express.Router();

const {
    getSmartReplies,
    getPredictiveSuggestions
} = require("../controller/aiController");

const { authenticate } = require("../middleware/authentication");


router.post(
    "/smart-replies",
    authenticate,
    getSmartReplies
);


router.post(
    "/predictive",
    authenticate,
    getPredictiveSuggestions
);


module.exports = router;