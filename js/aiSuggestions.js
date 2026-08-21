
let aiSuggestionsPanel;
let smartRepliesContainer;
let aiMessageInput;
let smartReplyRequestId = 0;

// INITIALIZE

function initializeAISuggestions() {

    aiSuggestionsPanel =
        document.getElementById("aiSuggestionsPanel");

    smartRepliesContainer =
        document.getElementById("smartReplies");

    aiMessageInput =
        document.getElementById("messageInput");


    if (
        !aiSuggestionsPanel ||
        !smartRepliesContainer ||
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


    const allMessages =
        Array.from(
            renderedMessages.values()
        );


    for (
        let i = allMessages.length - 1;
        i >= 0;
        i--
    ) {

        const message =
            allMessages[i];


        if (
            message &&
            Number(message.senderId) !==
                Number(currentUser.userId) &&
            message.content
        ) {

            return message;
        }
    }


    return null;
}
// SHOW SMART REPLIES FOR LATEST INCOMING MESSAGE

async function loadSmartReplies(
    incomingMessage = null,
    messageId = null,
    roomId = null
) {

    if (
        !currentRoom ||
        !aiSuggestionsPanel ||
        !smartRepliesContainer
    ) {
        return;
    }


    let targetMessage;


    if (incomingMessage) {

        targetMessage = {
            id: messageId,
            roomId: roomId,
            content: incomingMessage
        };

    } else {

        targetMessage =
            getLastIncomingMessage();
    }


    // Nothing to reply to.
    if (
        !targetMessage ||
        !targetMessage.content
    ) {

        clearSmartReplies();

        return;
    }


    // Make sure the message belongs
    // to the currently open room.
    if (
        targetMessage.roomId &&
        Number(targetMessage.roomId) !==
            Number(currentRoom.id)
    ) {

        return;
    }

    const requestId =
        ++smartReplyRequestId;


    const recentMessages =
        getRecentMessagesForAI();


    // Show loading state.
    aiSuggestionsPanel.classList.remove(
        "hidden"
    );


    smartRepliesContainer.innerHTML = `
        <div class="ai-loading">
            ✨ Thinking...
        </div>
    `;


    try {

        const response =
            await axios.post(

                `${BASE_URL}/ai/smart-replies`,

                {
                    message:
                        targetMessage.content,

                    recentMessages:
                        recentMessages
                },

                {
                    headers: {
                        Authorization: token
                    }
                }
            );


        if (
            requestId !== smartReplyRequestId
        ) {
            return;
        }

        if (
            !currentRoom ||
            (
                targetMessage.roomId &&
                Number(targetMessage.roomId) !==
                    Number(currentRoom.id)
            )
        ) {
            return;
        }


        const suggestions =
            response.data.suggestions || [];


        renderSmartReplies(
            suggestions
        );


    } catch (error) {

        // Ignore errors from outdated requests.
        if (
            requestId !== smartReplyRequestId
        ) {
            return;
        }


        console.error(
            "❌ Smart replies failed:",
            error
        );


        clearSmartReplies();
    }
}

// RENDER SMART REPLIES

function renderSmartReplies(
    suggestions
) {

    smartRepliesContainer.innerHTML =
        "";


    const limitedSuggestions =
        suggestions.slice(0, 3);


    if (
        limitedSuggestions.length === 0
    ) {

        clearSmartReplies();

        return;
    }


    limitedSuggestions.forEach(
        suggestion => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "smart-reply-btn";


            button.type =
                "button";


            button.textContent =
                suggestion;


            button.addEventListener(
                "click",
                () => {

                    aiMessageInput.value =
                        suggestion;

                    aiMessageInput.focus();

                    // The suggestion has now been
                    // selected. Don't keep showing
                    // suggestions for the old message.
                    clearSmartReplies();

                }
            );


            smartRepliesContainer.appendChild(
                button
            );

        }
    );
}


// CLEAR SMART REPLIES

function clearSmartReplies() {

    // Invalidate any currently running request.
    smartReplyRequestId++;


    if (
        smartRepliesContainer
    ) {

        smartRepliesContainer.innerHTML =
            "";

    }


    if (
        aiSuggestionsPanel
    ) {

        aiSuggestionsPanel.classList.add(
            "hidden"
        );

    }
}

// CLEAR ALL AI UI

function clearAISuggestions() {

    clearSmartReplies();
}
// INITIALIZE AFTER COMPONENTS LOAD

document.addEventListener(
    "chatAppComponentsLoaded",
    initializeAISuggestions
);