// CHAT MESSAGES

const MESSAGE_PAGE_SIZE = 30;

let messagePagination = {
    hasMore: false,
    nextCursor: null,
    loading: false
};

function markMessageAsRead(messageId) {

    if (!messageId) {
        return;
    }

    socket.emit("room:markRead", {
        messageId
    });
}

function removeLoadOlderButton() {
    const button = document.getElementById("loadOlderMessagesBtn");

    if (button) {
        button.remove();
    }
}

function renderLoadOlderButton() {
    removeLoadOlderButton();

    if (!messagePagination.hasMore) {
        return;
    }

    const button = document.createElement("button");
    button.id = "loadOlderMessagesBtn";
    button.type = "button";
    button.className = "load-older-messages";
    button.textContent = "Load older messages";
    button.addEventListener("click", loadOlderMessages);

    messagesContainer.prepend(button);
}

async function loadMessageHistory(roomId) {

    messagePagination = {
        hasMore: false,
        nextCursor: null,
        loading: false
    };

    removeLoadOlderButton();

    try {

        const response = await axios.get(
            `${BASE_URL}/rooms/${roomId}/messages`,
            {
                params: {
                    limit: MESSAGE_PAGE_SIZE
                },
                headers: {
                    Authorization: token
                }
            }
        );

        const messages = response.data.messages || [];
        const pagination = response.data.pagination || {};

        messagePagination.hasMore = Boolean(pagination.hasMore);
        messagePagination.nextCursor = pagination.nextCursor || null;

        messages.forEach(message => {

            if (
                Number(message.senderId) !==
                Number(currentUser.userId)
            ) {
                markMessageAsRead(message.id);
            }

        });

        renderMessages(
            messages,
            messagesContainer
        );

        renderLoadOlderButton();

        scrollToLatestAfterHistory();

        const latestMessage =
            messages[messages.length - 1];

        if (
            latestMessage &&
            Number(latestMessage.senderId) !==
                Number(currentUser.userId) &&
            latestMessage.content
        ) {

            loadSmartReplies(
                latestMessage.content,
                latestMessage.id,
                latestMessage.roomId
            );

        } else {

            clearAISuggestions();

        }

    } catch (err) {

        console.error("Message history load error:", err.message);

        messagesContainer.innerHTML =
            `<div class="empty-state error">
                Couldn't load message history.
            </div>`;
    }
}

async function loadOlderMessages() {

    if (
        !currentRoom ||
        !messagePagination.hasMore ||
        !messagePagination.nextCursor ||
        messagePagination.loading
    ) {
        return;
    }

    messagePagination.loading = true;

    const button = document.getElementById("loadOlderMessagesBtn");
    const previousText = button ? button.textContent : "";

    if (button) {
        button.disabled = true;
        button.textContent = "Loading…";
    }

    const previousScrollHeight = messagesContainer.scrollHeight;
    const previousScrollTop = messagesContainer.scrollTop;

    try {
        const response = await axios.get(
            `${BASE_URL}/rooms/${currentRoom.id}/messages`,
            {
                params: {
                    limit: MESSAGE_PAGE_SIZE,
                    before: messagePagination.nextCursor
                },
                headers: {
                    Authorization: token
                }
            }
        );

        const olderMessages = response.data.messages || [];
        const pagination = response.data.pagination || {};

        olderMessages.forEach(message => {
            if (
                Number(message.senderId) !==
                Number(currentUser.userId)
            ) {
                markMessageAsRead(message.id);
            }
        });

        prependMessages(
            olderMessages,
            messagesContainer
        );

        messagePagination.hasMore = Boolean(pagination.hasMore);
        messagePagination.nextCursor = pagination.nextCursor || null;

        renderLoadOlderButton();

        requestAnimationFrame(() => {
            const addedHeight =
                messagesContainer.scrollHeight - previousScrollHeight;

            messagesContainer.scrollTop =
                previousScrollTop + addedHeight;
        });

    } catch (err) {

        console.error("Older message load error:", err.message);

        if (button) {
            button.disabled = false;
            button.textContent = previousText || "Load older messages";
        }

    } finally {
        messagePagination.loading = false;
    }
}

// SEND MESSAGE

function sendCurrentMessage() {

    const content =
        messageInput.value.trim();

    if (!content) {
        return;
    }

    if (!currentRoom) {

        alert(
            "Open a conversation first"
        );

        return;
    }

    stopTyping();

    if (
        typeof clearAISuggestions === "function"
    ) {

        clearAISuggestions();

    }

    socket.emit(
        "room:send",
        {
            roomId: currentRoom.id,
            content: content
        }
    );

    messageInput.value = "";
}

// SOCKET.IO - NEW MESSAGE

socket.on("room:message", (msg) => {

    const isForOpenRoom =
        currentRoom &&
        Number(msg.roomId) === Number(currentRoom.id);

    if (!isForOpenRoom) {
        return;
    }

    const emptyEl =
        messagesContainer.querySelector(
            ".empty-state"
        );

    if (emptyEl) {
        emptyEl.remove();
    }

    appendMessage(msg, messagesContainer);
    scrollToLatest();

    if (
        Number(msg.senderId) !== Number(currentUser.userId) &&
        typeof loadSmartReplies === "function"
    ) {

        loadSmartReplies(
            msg.content,
            msg.id,
            msg.roomId
        );
    }

    if (
        Number(msg.senderId) !==
        Number(currentUser.userId)
    ) {
        markMessageAsRead(msg.id);
    }

});

// SOCKET.IO - MESSAGE STATUS

socket.on(
    "room:messageStatus",
    ({ messageId, status }) => {

        updateMessageStatus(
            messageId,
            status
        );

    }
);

// MESSAGE INPUT EVENTS

sendBtn.addEventListener(
    "click",
    sendCurrentMessage
);

messageInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendCurrentMessage();

        }

    }
);

// typing indicator

messageInput.addEventListener(
    "input",
    () => {

        const content =
            messageInput.value.trim();

        if (!content) {

            stopTyping();

            return;
        }

        startTyping();
    }
);

// DELETE FOR ME
async function deleteMessageForMe(messageId) {
    if (!messageId || !currentRoom) {
        return;
    }

    const message = findMessageById(messageId);
    if (!message) {
        return;
    }

    const confirmed = window.confirm(
        "Delete this message and its media for you?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await axios.delete(
            `${BASE_URL}/rooms/messages/${messageId}/me`,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        removeRenderedMessage(messageId);
    } catch (err) {
        const messageText =
            err.response?.data?.message ||
            "Couldn't delete the message.";
        alert(messageText);
    }
}
