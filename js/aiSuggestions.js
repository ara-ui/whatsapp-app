let aiSuggestionsPanel;
let smartRepliesContainer;
let aiMessageInput;
let smartReplyRequestId = 0;

function initializeAISuggestions() {
    aiSuggestionsPanel = document.getElementById("aiSuggestionsPanel");
    smartRepliesContainer = document.getElementById("smartReplies");
    aiMessageInput = document.getElementById("messageInput");

    if (!aiSuggestionsPanel || !smartRepliesContainer || !aiMessageInput) {
        return;
    }
}

function getRecentMessagesForAI() {
    if (typeof renderedMessages === "undefined") {
        return [];
    }

    return Array.from(renderedMessages.values())
        .slice(-3)
        .map(message => message?.content)
        .filter(Boolean);
}

function getLastIncomingMessage() {
    if (typeof renderedMessages === "undefined" || typeof currentUser === "undefined") {
        return null;
    }

    const allMessages = Array.from(renderedMessages.values());

    for (let i = allMessages.length - 1; i >= 0; i -= 1) {
        const message = allMessages[i];
        if (
            message &&
            Number(message.senderId) !== Number(currentUser.userId) &&
            message.content
        ) {
            return message;
        }
    }

    return null;
}

async function loadSmartReplies(
    incomingMessage = null,
    messageId = null,
    roomId = null,
    replyContext = ""
) {
    if (!currentRoom || !aiSuggestionsPanel || !smartRepliesContainer) {
        return;
    }

    let targetMessage = incomingMessage
        ? { id: messageId, roomId, content: incomingMessage }
        : getLastIncomingMessage();

    if (!targetMessage || !targetMessage.content) {
        clearSmartReplies();
        return;
    }

    if (targetMessage.roomId && Number(targetMessage.roomId) !== Number(currentRoom.id)) {
        return;
    }

    const requestId = ++smartReplyRequestId;
    const recentMessages = getRecentMessagesForAI();

    aiSuggestionsPanel.classList.remove("hidden");
    smartRepliesContainer.innerHTML = `<div class="ai-loading">✨ Thinking...</div>`;

    try {
        const response = await axios.post(
            `${BASE_URL}/ai/smart-replies`,
            {
                message: targetMessage.content,
                recentMessages,
                replyContext: replyContext || ""
            },
            {
                headers: { Authorization: token },
                timeout: 8000
            }
        );

        if (requestId !== smartReplyRequestId) return;
        if (!currentRoom || (targetMessage.roomId && Number(targetMessage.roomId) !== Number(currentRoom.id))) {
            return;
        }

        renderSmartReplies(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
    } catch (error) {
        if (requestId !== smartReplyRequestId) return;
        clearSmartReplies();
    }
}

function renderSmartReplies(suggestions) {
    smartRepliesContainer.innerHTML = "";

    const limitedSuggestions = suggestions
        .filter(Boolean)
        .slice(0, 4);

    if (!limitedSuggestions.length) {
        clearSmartReplies();
        return;
    }

    limitedSuggestions.forEach(suggestion => {
        const button = document.createElement("button");
        button.className = "smart-reply-btn";
        button.type = "button";
        button.textContent = suggestion;
        button.addEventListener("click", () => {
            aiMessageInput.value = suggestion;
            aiMessageInput.focus();
            clearSmartReplies();
        });
        smartRepliesContainer.appendChild(button);
    });
}

function clearSmartReplies() {
    smartReplyRequestId += 1;
    if (smartRepliesContainer) smartRepliesContainer.innerHTML = "";
    if (aiSuggestionsPanel) aiSuggestionsPanel.classList.add("hidden");
}

function clearAISuggestions() {
    clearSmartReplies();
}

document.addEventListener("chatAppComponentsLoaded", initializeAISuggestions);
