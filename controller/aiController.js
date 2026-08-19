const {
    generateSmartReplies,
    generatePredictiveSuggestions
} = require("../services/aiService");


// ============================================================
// SMART REPLIES
// ============================================================

exports.getSmartReplies = async (req, res) => {

    try {

        const {
            message,
            recentMessages
        } = req.body;


        if (!message || !message.trim()) {

            return res.status(400).json({
                message: "Message is required"
            });
        }


        const result =
            await generateSmartReplies(
                message.trim(),
                recentMessages || []
            );


        return res.status(200).json(result);


    } catch (error) {

        console.error(
            "Smart replies controller error:",
            error
        );

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


            const result =
                await generatePredictiveSuggestions(
                    text.trim(),
                    recentMessages || []
                );


            return res.status(200).json(result);


        } catch (error) {

            console.error(
                "Predictive suggestions controller error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to generate predictive suggestions"
            });
        }
    };