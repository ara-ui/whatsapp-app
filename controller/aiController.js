const {
    generateSmartReplies
} = require("../services/aiService");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_RECENT_MESSAGES = 3;
const MAX_RECENT_MESSAGE_LENGTH = 1000;

function normalizeRecentMessages(value, maxItems = MAX_RECENT_MESSAGES) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => typeof item === "string")
        .slice(-maxItems)
        .map((item) => item.slice(0, MAX_RECENT_MESSAGE_LENGTH));
}

function validateMessageInput(value) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_MESSAGE_LENGTH;
}


// ============================================================
// SMART REPLIES
// ============================================================

exports.getSmartReplies = async (req, res) => {

    try {

        const {
            message,
            recentMessages,
            replyContext
        } = req.body;


        if (!validateMessageInput(message)) {

            return res.status(400).json({
                message: "Message is required"
            });
        }


        const result =
            await generateSmartReplies(
                message.trim(),
                normalizeRecentMessages(recentMessages),
                typeof replyContext === "string" ? replyContext.slice(0, MAX_RECENT_MESSAGE_LENGTH) : ""
            );


        return res.status(200).json(result);


    } catch (error) {

        console.error("Smart replies controller error:", error.message);

        return res.status(500).json({
            message: "Failed to generate smart replies"
        });
    }
};

