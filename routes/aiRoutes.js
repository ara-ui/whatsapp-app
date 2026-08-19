const express = require("express");

const router = express.Router();

const {
    getSmartReplies,
    getPredictiveSuggestions
} = require("../controller/aiController");


router.post(
    "/smart-replies",
    getSmartReplies
);


router.post(
    "/predictive",
    getPredictiveSuggestions
);


module.exports = router;