const express = require("express");
const router = express.Router();

const {
    getRooms,
    createOrGetPersonalRoom,
} = require("../controller/roomController");

const { authenticate } = require("../middleware/authentication");
const {
    createSpace,
    getInvitations,
    getSentInvitations,
    getSpaceInfo,
    acceptInvitation,
    rejectInvitation,
    leaveSpace
} = require("../controller/spaceController");

router.get("/", authenticate, getRooms);

router.post("/personal", authenticate, createOrGetPersonalRoom);

// Connectly Spaces: invite-first group rooms.
router.post("/spaces", authenticate, createSpace);
router.get("/spaces/invitations", authenticate, getInvitations);
router.get("/spaces/invitations/sent", authenticate, getSentInvitations);
router.get("/spaces/:roomId/info", authenticate, getSpaceInfo);
router.post("/spaces/invitations/:invitationId/accept", authenticate, acceptInvitation);
router.post("/spaces/invitations/:invitationId/reject", authenticate, rejectInvitation);
router.delete("/:roomId/leave", authenticate, leaveSpace);

module.exports = router;
