const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";


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
    recentMessages = [],
    replyContext = ""
) {

    const conversation =
        recentMessages
            .slice(-3)
            .join("\n");

    const prompt = `
You are an AI assistant inside a chat application.

Generate exactly 4 short smart replies to the incoming message.

Incoming message:
"${incomingMessage}"

Recent conversation (latest 3 messages):
${conversation}

Reply context:
${replyContext || "None"}

Rules:
- Exactly 4 replies.
- If reply context is provided, make the suggestions directly useful for replying to that message.
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


module.exports = {
    generateSmartReplies
};