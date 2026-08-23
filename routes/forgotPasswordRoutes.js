const express = require("express");
const router = express.Router();

const {updatePassword,resetPassword,forgotPassword} = require("../controller/forgotPassword");

const forgotPasswordLimiter =
    require("../middleware/passwordRateLimiter");


router.post("/forgotpassword",forgotPasswordLimiter, forgotPassword);

router.get('/resetpassword/:id',resetPassword);

router.post("/updatepassword/:id",updatePassword);



module.exports = router;