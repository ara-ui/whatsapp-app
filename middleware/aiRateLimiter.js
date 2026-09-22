const rateLimit = require("express-rate-limit");

function userKeyGenerator(req) {
    return req.user?.id ? `user:${req.user.id}` : "anonymous";
}

const smartRepliesLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.AI_SMART_REPLY_RATE_LIMIT || 20),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
    message: {
        success: false,
        message: "Too many AI smart-reply requests. Please try again shortly."
    }
});

const predictiveLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.AI_PREDICTIVE_RATE_LIMIT || 30),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
    message: {
        success: false,
        message: "Too many AI typing requests. Please try again shortly."
    }
});

module.exports = {
    smartRepliesLimiter,
    predictiveLimiter
};
