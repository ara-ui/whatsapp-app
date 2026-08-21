
// AI SUGGESTIONS FRONTEND

let aiSuggestionsPanel;
let smartRepliesContainer;
let predictiveSuggestionsContainer;
let aiMessageInput;

// INITIALIZE

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

// GET RECENT MESSAGES

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


// GET LAST INCOMING MESSAGE

function getLastIncomingMessage() {

    if (
        typeof renderedMessages === "undefined" ||
        typeof currentUser === "undefined"
    ) {
        return null;
    }

    const all = Array.from(renderedMessages.values());

    for (let i = all.length - 1; i >= 0; i--) {

        const message = all[i];

        if (
            message &&
            Number(message.senderId) !== Number(currentUser.userId) &&
            message.content
        ) {
            return message.content;
        }
    }

    return null;
}


// SMART REPLIES

async function loadSmartReplies(incomingMessage) {

    if (!currentRoom) {
        return;
    }

    if (
        !aiSuggestionsPanel ||
        !smartRepliesContainer
    ) {
        return;
    }


    const messageToReplyTo =
        incomingMessage || getLastIncomingMessage();


    if (!messageToReplyTo) {
        return;
    }


    const recentMessages =
        getRecentMessagesForAI();


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
                    message: messageToReplyTo,
                    recentMessages: recentMessages
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

// PREDICTIVE TYPING

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

// LOAD PREDICTIVE SUGGESTIONS

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

// RENDER PREDICTIVE SUGGESTIONS

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

// HIDE PREDICTIVE SUGGESTIONS

function hidePredictiveSuggestions() {

    predictiveSuggestionsContainer.innerHTML =
        "";

    predictiveSuggestionsContainer
        .classList
        .add("hidden");
}

// INITIALIZE AFTER COMPONENTS LOAD from componentsLoader.js this listents for that that dispatch event

document.addEventListener(
    "chatAppComponentsLoaded",
    initializeAISuggestions
);