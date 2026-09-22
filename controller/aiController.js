const {
    generateSmartReplies,
    generatePredictiveSuggestions
} = require("../services/aiService");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_RECENT_MESSAGES = 8;
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
            recentMessages
        } = req.body;


        if (!validateMessageInput(message)) {

            return res.status(400).json({
                message: "Message is required"
            });
        }


        const result =
            await generateSmartReplies(
                message.trim(),
                normalizeRecentMessages(recentMessages)
            );


        return res.status(200).json(result);


    } catch (error) {

        console.error("Smart replies controller error:", error.message);

        return res.status(500).json({
            message: "Failed to generate smart replies"
        });
    }
};


// ============================================================
// PREDICTIVE TYPING
// ============================================================

exports.getPredictiveSuggestions =
    async (req, res) => {

        try {

            const {
                text,
                recentMessages
            } = req.body;


            if (!text || !text.trim()) {

                return res.status(200).json({
                    suggestions: []
                });
            }


            if (!validateMessageInput(text)) {
                return res.status(400).json({
                    message: "Text must be between 1 and 1000 characters"
                });
            }

            const result =
                await generatePredictiveSuggestions(
                    text.trim(),
                    normalizeRecentMessages(recentMessages, 5)
                );


            return res.status(200).json(result);


        } catch (error) {

            console.error("Predictive suggestions controller error:", error.message);

            return res.status(500).json({
                message:
                    "Failed to generate predictive suggestions"
            });
        }
    };