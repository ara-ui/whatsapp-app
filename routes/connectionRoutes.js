const express = require("express");
const router = express.Router();

const {
    sendRequest,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    getConnectedUsers
} = require("../controller/connectionController");
const { authenticate } = require("../middleware/authentication");

router.use(authenticate);

router.get("/pending", getPendingRequests);
router.get("/", getConnectedUsers);
router.post("/request", sendRequest);
router.post("/:connectionId/accept", acceptRequest);
router.post("/:connectionId/reject", rejectRequest);

module.exports = router;
