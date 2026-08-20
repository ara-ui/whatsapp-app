// ============================================================
// AI SUGGESTIONS FRONTEND
// ============================================================

let aiSuggestionsPanel;
let smartRepliesContainer;
let predictiveSuggestionsContainer;
let aiMessageInput;


// ============================================================
// INITIALIZE
// ============================================================

function initializeAISuggestions() {

    aiSuggestionsPanel =
        document.getElementById("aiSuggestionsPanel");

    smartRepliesContainer =
        document.getElementById("smartReplies");

    predictiveSuggestionsContainer =
        document.getElementById("predictiveSuggestions");

    aiMessageInput =
        document.getElementById("messageInput");


    if (
        !aiSuggestionsPanel ||
        !smartRepliesContainer ||
        !predictiveSuggestionsContainer ||
        !aiMessageInput
    ) {

        console.error(
            "❌ AI suggestion elements not found"
        );

        return;
    }


    console.log(
        "✨ AI Suggestions initialized"
    );


    setupPredictiveTyping();
}


// ============================================================
// GET RECENT MESSAGES
// ============================================================

function getRecentMessagesForAI() {

    if (
        typeof renderedMessages === "undefined"
    ) {
        return [];
    }


    return Array.from(
        renderedMessages.values()
    )
        .slice(-5)
        .map(message => message.content)
        .filter(Boolean);
}


// ============================================================
// SMART REPLIES
// ============================================================

async function loadSmartReplies() {

    if (!currentRoom) {
        return;
    }


    const messages =
        getRecentMessagesForAI();


    if (messages.length === 0) {
        return;
    }


    const latestMessage =
        messages[messages.length - 1];


    try {

        aiSuggestionsPanel.classList.remove(
            "hidden"
        );


        smartRepliesContainer.innerHTML = `
            <div class="ai-loading">
                ✨ Thinking...
            </div>
        `;


        const response =
            await axios.post(

                `${BASE_URL}/ai/smart-replies`,

                {
                    message: latestMessage,
                    recentMessages: messages
                },

                {
                    headers: {
                        Authorization: token
                    }
                }
            );


        const suggestions =
            response.data.suggestions || [];


        smartRepliesContainer.innerHTML = "";


        suggestions
            .slice(0, 3)
            .forEach(suggestion => {

                const button =
                    document.createElement("button");

                button.className =
                    "smart-reply-btn";

                button.type = "button";

                button.textContent =
                    suggestion;


                button.addEventListener(
                    "click",
                    () => {

                        aiMessageInput.value =
                            suggestion;

                        aiMessageInput.focus();

                    }
                );


                smartRepliesContainer.appendChild(
                    button
                );

            });


    } catch (error) {

        console.error(
            "❌ Smart replies failed:",
            error
        );

        aiSuggestionsPanel.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// PREDICTIVE TYPING
// ============================================================

let predictiveTimer;


function setupPredictiveTyping() {

    aiMessageInput.addEventListener(
    "focus",
        () => {

            loadSmartReplies();

        }
    );

    aiMessageInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                predictiveTimer
            );


            const text =
                aiMessageInput.value.trim();


            if (!text) {

                hidePredictiveSuggestions();

                return;
            }


            predictiveTimer =
                setTimeout(
                    () => {

                        loadPredictiveSuggestions(
                            text
                        );

                    },
                    700
                );

        }
    );
}


// ============================================================
// LOAD PREDICTIVE SUGGESTIONS
// ============================================================

async function loadPredictiveSuggestions(text) {

    if (!currentRoom) {
        return;
    }


    try {

        const response =
            await axios.post(

                `${BASE_URL}/ai/predictive`,

                {
                    text: text,

                    recentMessages:
                        getRecentMessagesForAI()
                },

                {
                    headers: {
                        Authorization: token
                    }
                }
            );


        const suggestions =
            response.data.suggestions || [];


        renderPredictiveSuggestions(
            suggestions
        );


    } catch (error) {

        console.error(
            "❌ Predictive suggestions failed:",
            error
        );

        hidePredictiveSuggestions();
    }
}


// ============================================================
// RENDER PREDICTIVE SUGGESTIONS
// ============================================================

function renderPredictiveSuggestions(
    suggestions
) {

    predictiveSuggestionsContainer.innerHTML =
        "";


    suggestions
        .slice(0, 3)
        .forEach(suggestion => {

            const button =
                document.createElement("button");

            button.className =
                "predictive-btn";

            button.type = "button";

            button.textContent =
                suggestion;


            button.addEventListener(
                "click",
                () => {

                    aiMessageInput.value =
                        aiMessageInput.value.trim() +
                        " " +
                        suggestion;

                    aiMessageInput.focus();

                    hidePredictiveSuggestions();

                }
            );


            predictiveSuggestionsContainer
                .appendChild(button);

        });


    if (suggestions.length > 0) {

        predictiveSuggestionsContainer
            .classList
            .remove("hidden");

    }
}


// ============================================================
// HIDE PREDICTIVE SUGGESTIONS
// ============================================================

function hidePredictiveSuggestions() {

    predictiveSuggestionsContainer.innerHTML =
        "";

    predictiveSuggestionsContainer
        .classList
        .add("hidden");
}

// INITIALIZE AFTER COMPONENTS LOAD

document.addEventListener(
    "chatAppComponentsLoaded",
    initializeAISuggestions
);