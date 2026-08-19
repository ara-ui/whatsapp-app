const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = "gemini-3.6-flash";


async function generateAIResponse(prompt) {

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    suggestions: {
                        type: "array",
                        items: {
                            type: "string"
                        }
                    }
                },
                required: ["suggestions"]
            }
        }
    });

    return JSON.parse(response.text);
}


// ============================================================
// SMART REPLIES
// ============================================================

async function generateSmartReplies(
    incomingMessage,
    recentMessages = []
) {

    const conversation =
        recentMessages
            .slice(-8)
            .join("\n");

    const prompt = `
You are an AI assistant inside a chat application.

Generate exactly 3 short smart replies to the incoming message.

Incoming message:
"${incomingMessage}"

Recent conversation:
${conversation}

Rules:
- Exactly 3 replies.
- Keep each reply under 12 words.
- Natural conversational language.
- Relevant to the incoming message.
- Do not repeat the incoming message.
- Match a casual chat style.
- Emojis are allowed when appropriate.
- No explanations.
`;

    return generateAIResponse(prompt);
}


// ============================================================
// PREDICTIVE TYPING
// ============================================================

async function generatePredictiveSuggestions(
    text,
    recentMessages = []
) {

    if (!text || text.trim().length < 2) {
        return {
            suggestions: []
        };
    }

    const conversation =
        recentMessages
            .slice(-5)
            .join("\n");

    const prompt = `
You are an AI predictive typing assistant.

The user is currently typing:

"${text}"

Recent conversation:
${conversation}

Generate exactly 3 possible short continuations.

Rules:
- Continue what the user is typing.
- Do NOT rewrite the entire sentence.
- Suggestions should be short phrases or words.
- Maximum 5 words per suggestion.
- Relevant to the context.
- Natural conversational language.
- Do not include explanations.
`;

    return generateAIResponse(prompt);
}


module.exports = {
    generateSmartReplies,
    generatePredictiveSuggestions
};