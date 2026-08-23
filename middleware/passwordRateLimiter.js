const rateLimit = require("express-rate-limit");

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    max: 5, // maximum 5 requests

    message: {
        message:
            "Too many password reset requests. Please try again later."
    },

    standardHeaders: true,

    legacyHeaders: false
});

module.exports = forgotPasswordLimiter;